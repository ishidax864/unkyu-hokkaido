/**
 * 評価用ラベル: 路線 × 日 (JST) ごとに「気象を原因とする運休が実際にあったか」を作る。
 *
 * 方針 (答えの混入と誤ラベルを避けるため保守的に):
 * - 公式文に路線名(または列車愛称)が明記された場合のみ、その路線を陽性にする。
 *   エリア共通文が全路線にコピーされた行を、名前のない路線の陽性にしない。
 * - 日付は本文中の「M月D日」「M/D」「D日」から取り、範囲(〜にかけて)を展開。無ければ記録日。
 * - 原因は本文の語で判定。熊・人身・踏切・地震・設備・計画作業(除雪作業の計画運休)などは気象としない。
 *   原因が判定できない運休や、路線名のない運休は「不明」として評価から除外する(陰性にしない)。
 * - 陰性は、その日にその路線の観測が十分ある(6回以上取得)のに陽性・不明が無い日。
 *
 * Usage: npx tsx scripts/eval/build-labels.ts <obs.json> <labels.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import config from '../../data/crawler-config.json';

interface Obs { id: number; recorded_at: string; area_id: string; route_id: string; train_status: string; cause: string; status_details: string | null }
export type Label = 'weather' | 'other' | 'unknown' | 'none';

const ROUTE_ALIASES: Record<string, string[]> = {
    'jr-hokkaido.chitose': ['千歳線', 'エアポート'],
    'jr-hokkaido.hakodate-main': ['函館線', '函館本線', 'ライラック', 'カムイ', 'ニセコ号'],
    'jr-hokkaido.gakuentoshi': ['学園都市線', '札沼線'],
    'jr-hokkaido.muroran-main': ['室蘭線', '室蘭本線', 'すずらん'],
    'jr-hokkaido.hakodate-south': ['北斗'],
    'jr-hokkaido.soya-main': ['宗谷線', '宗谷本線', 'サロベツ', '特急宗谷'],
    'jr-hokkaido.sekihoku-main': ['石北線', '石北本線', 'オホーツク', '大雪号', '特急大雪'],
    'jr-hokkaido.furano': ['富良野線'],
    'jr-hokkaido.rumoi': ['留萌線', '留萌本線'],
    'jr-hokkaido.hidaka': ['日高線', '日高本線'],
    'jr-hokkaido.sekisho': ['石勝線', 'おおぞら', 'とかち'],
    'jr-hokkaido.nemuro-main': ['根室線', '根室本線', '花咲線', 'おおぞら', 'とかち'],
    'jr-hokkaido.senmo-main': ['釧網線', '釧網本線'],
};
// 函館線は札幌側と道南側でIDが分かれる。区間の駅名で振り分ける。
const HAKODATE_SOUTH_STATIONS = ['長万部', '函館駅', '函館-', '函館～', '～函館', '新函館北斗', '大沼', '森', '八雲', '五稜郭', '蘭越', '熱郛', '目名', '倶知安', 'ニセコ'];

const NON_WEATHER = /熊|鹿|人身|線路内に人|踏切|車が道路|車が立ち往生|自動車|乗用車|トラック|信号|車両|地震|津波|架線|ビニール|運行管理装置|不具合|故障|工事|点検|脱線|火災|盛土|土砂|除雪作業を行うため|安全確認|急病|警察/;
const WEATHER = /大雪|降雪|雪の影響|吹雪|暴風|強風|風の影響|大雨|降雨|雨の影響|雨による|低気圧|視界不良|落雷|雪による|積雪|除雪の影響/;

const toHalf = (s: string) => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/／/g, '/');
const jstDate = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

export function classifyCause(text: string): Label {
    if (NON_WEATHER.test(text) && !/大雪|吹雪|暴風|大雨/.test(text)) return 'other';
    if (WEATHER.test(text)) return 'weather';
    return 'unknown';
}

/** 本文の日付(複数・範囲)を YYYY-MM-DD で返す。無ければ空。 */
export function mentionedDates(text: string, recordedJst: string): string[] {
    const t = toHalf(text);
    const year = +recordedJst.slice(0, 4);
    const recMonth = +recordedJst.slice(5, 7);
    const found: string[] = [];
    const fmt = (m: number, d: number) => {
        // 年跨ぎ: 記録が1月で本文が12月なら前年
        const y = m - recMonth > 6 ? year - 1 : recMonth - m > 6 ? year + 1 : year;
        const date = new Date(Date.UTC(y, m - 1, d));
        return date.getUTCMonth() === m - 1 ? date.toISOString().slice(0, 10) : null;
    };
    for (const m of t.matchAll(/(\d{1,2})月(\d{1,2})日|(?<![\d:])(\d{1,2})\/(\d{1,2})(?![\d:])/g)) {
        const v = fmt(+(m[1] ?? m[3]), +(m[2] ?? m[4]));
        if (v) found.push(v);
    }
    for (const m of t.matchAll(/(?<![月\d/])(\d{1,2})日/g)) {
        const v = fmt(recMonth, +m[1]);
        if (v) found.push(v);
    }
    const uniq = [...new Set(found)].sort();
    if (uniq.length === 2 && /にかけて|から/.test(t)) {
        const [a, b] = uniq.map(d => new Date(d + 'T00:00:00Z').getTime());
        if (b - a <= 4 * 86400_000) {
            const out: string[] = [];
            for (let x = a; x <= b; x += 86400_000) out.push(new Date(x).toISOString().slice(0, 10));
            return out;
        }
    }
    return uniq;
}

/** 「通常通り」「運転しています」など平常を述べる文を除く(路線名の誤検出防止)。 */
export function dropNormalSentences(text: string): string {
    return text.split(/(?<=[。])|※/).filter(s => !/通常通り|通常の運転|平常通り|運転しています|運転をします|運転を予定/.test(s)).join('');
}

/** 1つの公式文に複数の告知が連結されていることがあるため、【…について】で区切る。 */
export function splitNotices(text: string): string[] {
    return text.split(/(?<=【[^】]*(?:について|影響)[^】]*】)/).map(s => s.trim()).filter(Boolean);
}

export function namedRoutes(text: string): string[] {
    text = dropNormalSentences(text);
    const routes = new Set<string>();
    for (const [id, words] of Object.entries(ROUTE_ALIASES)) if (words.some(w => text.includes(w))) routes.add(id);
    if (routes.has('jr-hokkaido.hakodate-main') && HAKODATE_SOUTH_STATIONS.some(s => text.includes(s))) {
        routes.add('jr-hokkaido.hakodate-south');
        if (!/札幌|小樽|岩見沢|滝川|旭川|ライラック|カムイ/.test(text)) routes.delete('jr-hokkaido.hakodate-main');
    }
    return [...routes];
}

const RANK: Record<Label, number> = { none: 0, other: 1, unknown: 2, weather: 3 };

export function buildLabels(rows: Obs[]) {
    const routeIds = (config.routeMatching as Array<{ id: string; areas: string[] }>).map(r => r.id);
    const routeAreas = Object.fromEntries((config.routeMatching as Array<{ id: string; areas: string[] }>).map(r => [r.id, r.areas]));
    // 観測回数: エリアごと・日ごとの取得時刻数
    const crawls = new Map<string, Set<string>>();
    for (const r of rows) {
        const key = `${r.area_id}|${jstDate(r.recorded_at)}`;
        if (!crawls.has(key)) crawls.set(key, new Set());
        crawls.get(key)!.add(r.recorded_at.slice(0, 16));
    }
    const labels = new Map<string, { label: Label; evidence: string[] }>();
    const mark = (route: string, date: string, label: Label, ev: string) => {
        const key = `${route}|${date}`;
        const cur = labels.get(key);
        if (!cur || RANK[label] > RANK[cur.label]) labels.set(key, { label, evidence: [ev] });
        else if (cur.label === label && cur.evidence.length < 3 && !cur.evidence.includes(ev)) cur.evidence.push(ev);
    };
    for (const r of rows) {
        if (r.train_status !== 'suspended') continue;
        const full = (r.status_details ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const rec = jstDate(r.recorded_at);
        for (const text of splitNotices(full)) {
        const cause = classifyCause(text);
        const dates = mentionedDates(text, rec);
        const targetDates = dates.length ? dates.filter(d => d >= addDays(rec, -2) && d <= addDays(rec, 3)) : [rec];
        const routes = namedRoutes(text);
        const snippet = text.slice(0, 120);
        if (routes.length === 0) {
            // 路線名なし: 該当行の路線を「不明」として評価から外す(陽性にも陰性にもしない)
            for (const d of targetDates) mark(r.route_id, d, cause === 'other' ? 'other' : 'unknown', snippet);
            continue;
        }
        for (const route of routes) for (const d of targetDates) mark(route, d, cause, snippet);
        }
    }
    const out: Array<{ routeId: string; date: string; label: Label; crawls: number; evidence: string[] }> = [];
    const dates = [...new Set(rows.map(r => jstDate(r.recorded_at)))].sort();
    for (const date of dates) for (const routeId of routeIds) {
        const n = Math.max(0, ...routeAreas[routeId].map(a => crawls.get(`${a}|${date}`)?.size ?? 0));
        const l = labels.get(`${routeId}|${date}`);
        if (!l && n < 6) continue; // 観測不足の日は陰性にしない
        out.push({ routeId, date, label: l?.label ?? 'none', crawls: n, evidence: l?.evidence ?? [] });
    }
    return out;
}

function addDays(date: string, n: number) {
    return new Date(new Date(date + 'T00:00:00Z').getTime() + n * 86400_000).toISOString().slice(0, 10);
}

if (process.argv[1]?.endsWith('build-labels.ts')) {
    const [inPath, outPath] = process.argv.slice(2);
    const rows = JSON.parse(readFileSync(inPath, 'utf8')) as Obs[];
    const out = buildLabels(rows);
    writeFileSync(outPath, JSON.stringify(out, null, 1));
    const c: Record<string, number> = {};
    for (const x of out) c[x.label] = (c[x.label] ?? 0) + 1;
    console.log('route-days', out.length, c);
}
