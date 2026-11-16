/**
 * 公式運行状態の判定。構造化コード(senkuStatus / areaStatus)を主に使い、本文はお知らせの表示にだけ使う。
 *
 * 原則: 欠損・古い・日付が合わない → 「不明」。「平常」に倒さない。
 * コード0は「運休・30分以上の遅れの情報なし」であって運転の保証ではない(表示文言もそうする)。
 */
import { JR_AREAS, UNIT_BY_ID, type JrAreaId, type UnitId } from '@/lib/registry/units';
import type { LineDef } from '@/lib/registry/lines';
import type { AreaFeed, FeedCode, FeedNotice, FeedSnapshot } from '@/lib/sources/jr-feed';

export type OfficialState = 'no-info' | 'disrupted' | 'off-hours' | 'unknown';
export type UnknownReason = 'missing' | 'stale' | 'nightly-pause' | 'date-mismatch' | 'no-code';

export interface UnitState {
    unit: UnitId | 'shinkansen';
    name: string;
    areaName: string;
    state: OfficialState;
    reason?: UnknownReason;
}

export interface DayOfficial {
    date: string;
    state: OfficialState;
    reason?: UnknownReason;
    units: UnitState[];
    /** この路線に関するお知らせ。路線名で絞れなかった場合はエリアのお知らせ(areaWide=true) */
    notices: (FeedNotice & { areaWide: boolean })[];
    publishedAt: string | null;
    fetchedAt: string | null;
}

/** 発行から30分を超えたら現在の情報として扱わない(通常は毎分更新)。 */
export const MAX_FEED_AGE_MS = 30 * 60_000;

const jstHour = (d: Date) => new Date(d.getTime() + 9 * 3_600_000).getUTCHours();

function freshness(feed: AreaFeed | undefined, now: Date): UnknownReason | null {
    if (!feed) return 'missing';
    const published = feed.publishedAt ? Date.parse(feed.publishedAt) : NaN;
    if (!Number.isFinite(published)) return 'stale';
    if (now.getTime() - published > MAX_FEED_AGE_MS || published - now.getTime() > 5 * 60_000) {
        const h = jstHour(now);
        return h >= 3 && h < 5 ? 'nightly-pause' : 'stale';
    }
    return null;
}

/** 対象日に対応するブロック。営業日単位なので dateText で選ぶ。 */
function dayBlock(feed: AreaFeed, date: string) {
    if (feed.today.date === date) return feed.today;
    if (feed.tomorrow.date === date) return feed.tomorrow;
    return null;
}

const toState = (c: FeedCode | undefined): OfficialState => c === undefined ? 'unknown' : c;

/** 複数単位の合成: 運休が1つでもあれば運休。次に不明。全部時間外なら時間外。 */
export function combine(states: OfficialState[]): OfficialState {
    if (!states.length) return 'unknown';
    if (states.includes('disrupted')) return 'disrupted';
    if (states.includes('unknown')) return 'unknown';
    if (states.every(s => s === 'off-hours')) return 'off-hours';
    return 'no-info';
}

export function lineOfficial(line: LineDef, snapshot: FeedSnapshot, date: string, now = new Date()): DayOfficial {
    const units: UnitState[] = [];
    const usedFeeds: AreaFeed[] = [];

    const evaluate = (area: JrAreaId, pick: (day: NonNullable<ReturnType<typeof dayBlock>>) => FeedCode | undefined, unit: UnitState['unit'], name: string) => {
        const feed = snapshot.feeds[area];
        const stale = freshness(feed, now);
        const areaName = JR_AREAS[area].name;
        if (stale) { units.push({ unit, name, areaName, state: 'unknown', reason: stale }); return; }
        const day = dayBlock(feed!, date);
        if (!day) { units.push({ unit, name, areaName, state: 'unknown', reason: 'date-mismatch' }); return; }
        const c = pick(day);
        units.push({ unit, name, areaName, state: toState(c), ...(c === undefined || c === 'unknown' ? { reason: 'no-code' as const } : {}) });
        usedFeeds.push(feed!);
    };

    for (const id of line.units) {
        const u = UNIT_BY_ID.get(id);
        if (!u) continue;
        evaluate(u.area, day => day.units[u.key], id, u.name);
    }
    if (line.shinkansen) {
        // 新幹線は各エリアのフィードに同じ areaStatus.shin が載る。道南を優先。
        const area = (['03', '01', '02', '04', '05'] as JrAreaId[]).find(a => snapshot.feeds[a]) ?? '03';
        evaluate(area, day => day.areas.shin, 'shinkansen', '北海道新幹線');
    }

    const state = combine(units.map(u => u.state));
    const reasons = units.filter(u => u.state === 'unknown').map(u => u.reason);
    const reason = state === 'unknown' ? (reasons.find(r => r === 'nightly-pause') ?? reasons[0] ?? 'missing') : undefined;

    // お知らせ: この路線の語を含むものを優先。運休なのに見つからなければエリアのお知らせを出す。
    const seen = new Set<string>();
    const all = usedFeeds.flatMap(feed => {
        const day = dayBlock(feed, date)!;
        const areaCode = JR_AREAS[feed.area].code;
        const fromComments = day.comments.map(c => ({ publishedAt: feed.publishedAt, title: '', body: c, affectedAreas: [areaCode] }));
        return [...day.notices.filter(n => !n.affectedAreas.length || n.affectedAreas.includes(areaCode)), ...fromComments];
    }).filter(n => { const k = n.title + n.body; if (seen.has(k)) return false; seen.add(k); return true; });
    const matched = all.filter(n => line.keywords.some(k => (n.title + n.body).includes(k)));
    const notices = matched.length || state !== 'disrupted'
        ? matched.map(n => ({ ...n, areaWide: false }))
        : all.map(n => ({ ...n, areaWide: true }));

    const published = usedFeeds.map(f => f.publishedAt).filter((x): x is string => !!x).sort();
    return {
        date, state, ...(reason ? { reason } : {}), units, notices,
        publishedAt: published[0] ?? null,
        fetchedAt: usedFeeds[0]?.fetchedAt ?? snapshot.fetchedAt ?? null,
    };
}

export const OFFICIAL_LABELS: Record<OfficialState, string> = {
    'no-info': '運休・大幅な遅れの情報なし',
    disrupted: '運休・30分以上の遅れ・見合わせあり',
    'off-hours': '運行時間外',
    unknown: '公式情報を確認できません',
};

export const UNKNOWN_REASON_LABELS: Record<UnknownReason, string> = {
    missing: 'JRの運行情報を取得できませんでした',
    stale: 'JRの運行情報が更新されていません',
    'nightly-pause': '深夜(3〜5時ごろ)はJRの運行情報の更新が止まります',
    'date-mismatch': 'この日の公式情報はまだ出ていません',
    'no-code': 'この路線の状態が公式情報に含まれていません',
};
