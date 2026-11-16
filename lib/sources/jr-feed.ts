/**
 * JR北海道 公式運行情報フィードの取得と解析(判定はしない)。
 *
 * フィード: https://www3.jrhokkaido.co.jp/webunkou/json/area/area_0{1-5}.json (先頭にBOM)
 * - time: 「2026年11月16日 18時29分現在」= 発行時刻。通常は毎分更新、毎日03〜05時ごろは更新が止まる。
 * - today / tomorrow: 営業日単位。深夜0時を過ぎても today は前日のまま、dateText で日付を判断する。
 * - senkuStatus / areaStatus のコード: 0 = 運休・遅延に関する情報なし、1 = 運休・30分以上の遅延・運転見合わせ、
 *   2 = サービス時間外 (JR の common_area_operation.js の定義)。
 */
import { JR_AREAS, type JrAreaId, type SenkuKey } from '@/lib/registry/units';

export type FeedCode = 'no-info' | 'disrupted' | 'off-hours' | 'unknown';
export type AreaCode = typeof JR_AREAS[JrAreaId]['code'];

export interface FeedNotice {
    /** 「◯時◯分現在」を ISO に直したもの。無ければ null */
    publishedAt: string | null;
    title: string;
    body: string;
    /** 影響ありとされたエリア */
    affectedAreas: AreaCode[];
}

export interface FeedDay {
    /** YYYY-MM-DD。dateText が読めなければ null */
    date: string | null;
    units: Partial<Record<SenkuKey, FeedCode>>;
    areas: Partial<Record<AreaCode | 'shin', FeedCode>>;
    notices: FeedNotice[];
    comments: string[];
}

export interface AreaFeed {
    area: JrAreaId;
    url: string;
    publishedAt: string | null;
    fetchedAt: string;
    today: FeedDay;
    tomorrow: FeedDay;
}

export const FEED_BASE = 'https://www3.jrhokkaido.co.jp/webunkou/json/area/area_';
export const feedUrl = (area: JrAreaId) => `${FEED_BASE}${area}.json`;

const code = (v: unknown): FeedCode => v === 0 ? 'no-info' : v === 1 ? 'disrupted' : v === 2 ? 'off-hours' : 'unknown';

/** 「2026年11月16日 18時29分現在」→ ISO。読めない・不正な日時は null。 */
export function parseJstStamp(text: unknown): string | null {
    if (typeof text !== 'string') return null;
    const m = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(\d{1,2})時\s*(\d{1,2})分/);
    if (!m) return null;
    const [, y, mo, d, h, mi] = m;
    if (+h > 23 || +mi > 59) return null;
    const date = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const at = new Date(`${date}T${h.padStart(2, '0')}:${mi.padStart(2, '0')}:00+09:00`);
    if (!Number.isFinite(at.getTime())) return null;
    // 2月30日などの繰り上がりを拒否
    if (new Date(at.getTime() + 9 * 3_600_000).toISOString().slice(0, 10) !== date) return null;
    return at.toISOString();
}

/** dateText「11/16」を、発行時刻の年を基準に YYYY-MM-DD へ(年またぎ対応)。 */
export function resolveDateText(dateText: unknown, referenceIso: string | null): string | null {
    if (typeof dateText !== 'string' || !referenceIso) return null;
    const m = dateText.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!m) return null;
    const ref = new Date(Date.parse(referenceIso) + 9 * 3_600_000);
    const month = +m[1], day = +m[2];
    let year = ref.getUTCFullYear();
    const refMonth = ref.getUTCMonth() + 1;
    if (refMonth === 12 && month === 1) year += 1;
    if (refMonth === 1 && month === 12) year -= 1;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const check = new Date(`${iso}T00:00:00Z`);
    return check.getUTCMonth() + 1 === month && check.getUTCDate() === day ? iso : null;
}

const clean = (html: unknown) => typeof html === 'string'
    ? html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t　]+/g, ' ').replace(/ *\n */g, '\n').trim()
    : '';

const NO_INFO_TEXT = /^現在、?遅れに関する情報はありません。?$/;

function parseDay(block: unknown, publishedAt: string | null): FeedDay {
    const b = (block && typeof block === 'object' ? block : {}) as Record<string, unknown>;
    const units: FeedDay['units'] = {};
    for (const [k, v] of Object.entries((b.senkuStatus ?? {}) as Record<string, unknown>)) units[k as SenkuKey] = code(v);
    const areas: FeedDay['areas'] = {};
    for (const [k, v] of Object.entries((b.areaStatus ?? {}) as Record<string, unknown>)) areas[k as AreaCode] = code(v);
    const notices: FeedNotice[] = [];
    for (const g of Array.isArray(b.gaikyo) ? b.gaikyo : []) {
        const item = (g ?? {}) as Record<string, unknown>;
        const body = clean(item.honbun);
        const title = clean(item.title).replace(/^【|】$/g, '');
        if (!body && !title) continue;
        if (!title && NO_INFO_TEXT.test(body)) continue; // 「現在、遅れに関する情報はありません。」は告知ではない
        const eikyo = (item.eikyo ?? {}) as Record<string, unknown>;
        notices.push({
            publishedAt: parseJstStamp(item.time),
            title, body,
            affectedAreas: Object.entries(eikyo).filter(([, v]) => v === 1).map(([k]) => k as AreaCode),
        });
    }
    const comments = (Array.isArray(b.areaComments) ? b.areaComments : [])
        .map(c => clean((c as Record<string, unknown>)?.comment)).filter(Boolean);
    return { date: resolveDateText(b.dateText, publishedAt), units, areas, notices, comments };
}

/** 生フィード(文字列またはJSON)を解析。形が違えば null(呼び出し側で「不明」)。 */
export function parseAreaFeed(raw: unknown, area: JrAreaId, fetchedAt: string): AreaFeed | null {
    let data = raw;
    if (typeof data === 'string') {
        try { data = JSON.parse(data.replace(/^﻿/, '')); } catch { return null; }
    }
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    if (!d.today || typeof d.today !== 'object') return null;
    const publishedAt = parseJstStamp(d.time);
    return { area, url: feedUrl(area), publishedAt, fetchedAt, today: parseDay(d.today, publishedAt), tomorrow: parseDay(d.tomorrow, publishedAt) };
}

export interface FeedSnapshot {
    feeds: Partial<Record<JrAreaId, AreaFeed>>;
    errors: Partial<Record<JrAreaId, string>>;
    fetchedAt: string;
}

let cache: { expires: number; value: Promise<FeedSnapshot> } | null = null;

/** 5エリアを並列取得。自前の60秒キャッシュのみ(Next のキャッシュは古い応答を返し得るので使わない)。 */
export async function fetchAreaFeeds(fetchImpl: typeof fetch = fetch): Promise<FeedSnapshot> {
    if (cache && cache.expires > Date.now()) return cache.value;
    const value = (async () => {
        const fetchedAt = new Date().toISOString();
        const feeds: FeedSnapshot['feeds'] = {}, errors: FeedSnapshot['errors'] = {};
        await Promise.all((Object.keys(JR_AREAS) as JrAreaId[]).map(async area => {
            try {
                const res = await fetchImpl(feedUrl(area), { cache: 'no-store', signal: AbortSignal.timeout(6000) });
                if (!res.ok) { errors[area] = `HTTP ${res.status}`; return; }
                const parsed = parseAreaFeed(await res.text(), area, fetchedAt);
                if (parsed) feeds[area] = parsed; else errors[area] = 'invalid feed';
            } catch (e) {
                errors[area] = (e as Error)?.name === 'TimeoutError' ? 'timeout' : String((e as Error)?.message ?? e).slice(0, 120);
            }
        }));
        return { feeds, errors, fetchedAt };
    })();
    cache = { expires: Date.now() + 60_000, value };
    const result = await value;
    // 1つでも取れなければ次の要求で取り直す
    if (Object.keys(result.errors).length) cache = null;
    return result;
}

/** テスト用 */
export function __resetFeedCache() { cache = null; }
