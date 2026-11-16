/**
 * 復旧の見通し(正直な段階式)。
 *  1. JRが再開見込み時刻を発表 → その時刻
 *  2. 終日運休の案内 → 今日は動かない
 *  3. 同じ原因の過去事例(件数つき)から「あと何分で解消したか」の幅。経過時間で条件づける
 *  4. どれも無ければ「不明」
 * 「解消」は JR の状態コードが「情報なし」に戻った時点。運転再開の直後は遅れが残ることがある。
 */
import stats from '@/data/recovery-stats.json';
import { estimateRecovery, officialRecoveryTime } from '@/lib/forecast/recovery';
import { classifyCause, outlookFor, CAUSE_LABELS, type CauseKind, type Outlook, type RecoveryDataset } from './episodes';
import type { FeedNotice } from '@/lib/sources/jr-feed';

export interface RecoveryView {
    kind: 'official' | 'all-day' | 'empirical' | 'unknown';
    cause: CauseKind | null;
    causeLabel: string | null;
    onsetAt: string | null;
    elapsedMinutes: number | null;
    /** JR発表の再開見込み */
    officialAt: string | null;
    /** 過去事例での残り時間(分)。upper が null = 4分の1以上が運行時間内に解消しなかった */
    remaining: { lower: number | null; median: number | null; upper: number | null } | null;
    sample: { n: number; pool: Outlook['pool']; within: Outlook['within'] } | null;
    /** 判断に使う「あと何分くらい」(公式は残り時間、実績は中央値)。不明は null、終日は Infinity */
    expectedMinutes: number | null;
    headline: string;
    detail: string;
}

export const RECOVERY_DATA = stats as unknown as RecoveryDataset & { period: { from: string; to: string }; counts: { incidents: number } };

const span = (m: number) => m < 60 ? `${m}分` : m % 60 === 0 ? `${m / 60}時間` : `${Math.floor(m / 60)}時間${m % 60}分`;
const round = (m: number) => m <= 60 ? Math.max(5, Math.round(m / 5) * 5) : Math.round(m / 15) * 15;

export function recoveryView(input: { notices: Pick<FeedNotice, 'title' | 'body'>[]; onset: number | null; now?: Date; data?: RecoveryDataset }): RecoveryView {
    const now = input.now ?? new Date();
    const data = input.data ?? RECOVERY_DATA;
    const text = input.notices.map(n => `${n.title}\n${n.body}`).join('\n');
    const first = input.notices[0];
    const cause = first ? classifyCause(first.title, first.body) : null;
    const causeLabel = cause && cause !== 'other' ? CAUSE_LABELS[cause] : null;
    const elapsed = input.onset != null ? Math.max(0, Math.round((now.getTime() - input.onset) / 60_000)) : null;
    const base = { cause, causeLabel, onsetAt: input.onset != null ? new Date(input.onset).toISOString() : null, elapsedMinutes: elapsed };

    const official = estimateRecovery({ disrupted: true, officialText: text, officialExpectedAt: officialRecoveryTime(text, now), routeId: '', cause: 'unknown', incidents: [], now });
    if (official.kind === 'official' && official.earliest) {
        const minutes = Math.max(0, Math.ceil((Date.parse(official.earliest) - now.getTime()) / 60_000));
        return { ...base, kind: 'official', officialAt: official.earliest, remaining: null, sample: null, expectedMinutes: minutes,
            headline: 'JR発表の再開見込み', detail: 'JRが発表した予定時刻です。変更されることがあります。再開直後は遅れや混雑が残ることがあります。' };
    }
    if (official.kind === 'all-day') return { ...base, kind: 'all-day', officialAt: null, remaining: null, sample: null, expectedMinutes: Infinity,
        headline: '終日運休の案内が出ています', detail: '今日中の再開は見込めません。別の移動手段か、宿泊を検討してください。対象の列車・区間はJRの発表で確認してください。' };

    const o = outlookFor(data, cause, elapsed ?? 0);
    if (o && o.median != null) {
        const lower = o.p25 != null ? round(o.p25) : null, median = round(o.median), upper = o.p75 != null ? round(o.p75) : null;
        const what = o.pool === 'cause' && causeLabel ? `「${causeLabel}」` : '運休・大幅な遅れ';
        const when = elapsed != null && elapsed >= 15 ? `発生から約${span(round(elapsed))}。ここまで続いた` : '';
        const tail = upper != null ? `半数は${elapsed != null && elapsed >= 15 ? 'あと' : ''}${span(median)}以内、4件中3件は${span(upper)}以内に解消しました。` : `半数は${span(median)}以内に解消しましたが、4件に1件以上はその日の運行時間内に解消しませんでした。`;
        return { ...base, kind: 'empirical', officialAt: null, remaining: { lower, median, upper }, sample: { n: o.n, pool: o.pool, within: o.within }, expectedMinutes: median,
            headline: `過去の実績では あと${span(median)}前後`,
            detail: `${when}${what}の過去${o.n}件のうち、${tail}JRの発表ではなく実績からの目安です。` };
    }
    const weatherCause = cause && ['snow', 'rain', 'wind'].includes(cause);
    return { ...base, kind: 'unknown', officialAt: null, remaining: null, sample: null, expectedMinutes: null,
        headline: 'JRから再開見込みの発表はまだありません',
        detail: weatherCause
            ? `${causeLabel}による運休は、天候が回復して点検・除雪が終わるまで続きます。数時間〜翌日以降になることがあり、過去の事例がまだ少ないため時間の目安は出せません。`
            : `${causeLabel ? `原因: ${causeLabel}。` : ''}時間の目安を出せるだけの過去事例がありません。再開見込みが発表されたらここに表示します。` };
}
