/**
 * 行動の提案: 寒いホームで待ち続けないための「待つ / 暖かい場所で待つ / 別の手段 / 泊まる」。
 * 説明できる単純なルール。収益になる選択肢(宿・予約バス)を優先する調整は入れない。
 */
import type { RecoveryView } from './recovery';
import type { RiskLevel } from '@/lib/forecast/types';

export type ActionKind = 'go' | 'check-again' | 'prepare' | 'wait-here' | 'wait-nearby' | 'switch' | 'stay' | 'decide';
export interface Advice {
    action: ActionKind;
    title: string;
    message: string;
    /** 画面で上に出す選択肢の順 */
    emphasize: ('alternatives' | 'cafe' | 'hotel')[];
}

const span = (m: number) => m < 60 ? `${m}分` : m % 60 === 0 ? `${m / 60}時間` : `${Math.floor(m / 60)}時間${m % 60}分`;

export function advise(input: {
    disrupted: boolean; recovery: RecoveryView | null; risk: RiskLevel;
    /** 現在の時 (JST, 0-23) */
    hour: number;
    /** この時刻までに着きたい(あと何分)。指定なしは null */
    minutesToDeadline?: number | null;
    /** 列車でのおおよその所要時間(分)。不明は null */
    rideMinutes?: number | null;
}): Advice {
    const { disrupted, recovery, risk, hour } = input;
    const late = hour >= 21 || hour < 4;
    if (!disrupted) {
        if (risk === 'severe' || risk === 'high') return { action: 'prepare', emphasize: ['alternatives'],
            title: '止まる前に、別の手段を確認しておく',
            message: '天候による運休・遅れが起きやすい条件です。早めの列車に変える、予定をずらす、代わりの手段を先に調べておくと安心です。' };
        if (risk === 'watch') return { action: 'check-again', emphasize: [],
            title: '出発前にもう一度確認', message: '今のところ動く見込みですが、天候が変わるかもしれません。家や建物を出る前にもう一度確認してください。' };
        if (risk === 'unknown') return { action: 'check-again', emphasize: [],
            title: '出発前にJRの情報を確認', message: '気象データが揃わず、リスクを判断できません。JRの運行情報を確認してから出発してください。' };
        return { action: 'go', emphasize: [], title: 'そのまま出発して大丈夫そうです', message: '運休・遅れの情報はなく、天候のリスクも低めです。' };
    }
    const expected = recovery?.expectedMinutes ?? null;
    const ride = input.rideMinutes ?? 0;
    const deadline = input.minutesToDeadline ?? null;
    const missesDeadline = deadline != null && expected != null && expected + ride + 20 > deadline;

    if (recovery?.kind === 'all-day' || expected === Infinity) return late
        ? { action: 'stay', emphasize: ['hotel', 'alternatives'], title: '今日は動きません。宿を先に確保', message: '終日運休です。この時間は代わりの便も少ないので、宿の確保を先に。動ける便があれば代替手段も確認してください。' }
        : { action: 'switch', emphasize: ['alternatives', 'hotel'], title: '今日は動きません。別の手段へ', message: '終日運休です。ホームで待たず、バスなど別の手段を確認してください。難しければ宿の確保を。' };

    if (expected == null) return { action: 'decide', emphasize: late ? ['hotel', 'alternatives', 'cafe'] : ['alternatives', 'cafe', 'hotel'],
        title: 'いつ動くか分かりません。ホームで待たない',
        message: late ? '再開の見通しが出ていません。夜遅いので、宿を押さえるか、動ける代替手段があるか先に確認してください。'
            : '再開の見通しが出ていません。急ぐなら別の手段へ。急がないなら、暖かい場所でJRの発表を待ってください。' };

    if (missesDeadline) return { action: 'switch', emphasize: ['alternatives', 'cafe'],
        title: '待つと間に合いません。別の手段へ',
        message: `再開まで${span(expected)}ほどの見込みで、着きたい時刻に間に合わない可能性が高いです。別の手段を確認してください。` };

    const official = recovery?.kind === 'official';
    const upper = recovery?.remaining?.upper;
    if (expected <= 30 && (official || (upper != null && upper <= 60))) return { action: 'wait-here', emphasize: [],
        title: 'まもなく動きそうです。駅で待つ', message: `${official ? 'JRの発表では' : '過去の実績では'}あと${span(Math.max(5, expected))}ほど。駅の中で待つのが早そうです。` };

    if (expected <= 120) return { action: 'wait-nearby', emphasize: late ? ['cafe', 'hotel', 'alternatives'] : ['cafe', 'alternatives'],
        title: `${span(expected)}ほど。暖かい場所で待つ`,
        message: `${official ? 'JRの発表では' : '過去の実績では'}あと${span(expected)}前後で動く見込みです。寒いホームではなく、駅の近くの暖かい場所で待つのがおすすめです。${!official && upper == null ? '長引くこともあるので、' : ''}急ぐなら代替手段も確認を。` };

    return late
        ? { action: 'stay', emphasize: ['hotel', 'alternatives'], title: '長引きそうです。宿を先に確保', message: `再開まで${span(expected)}以上かかりそうです。夜遅いので、宿の確保を先に検討してください。` }
        : { action: 'switch', emphasize: ['alternatives', 'cafe', 'hotel'], title: '長引きそうです。別の手段へ', message: `再開まで${span(expected)}以上かかりそうです。待つより、バスなど別の手段が早い可能性があります。` };
}
