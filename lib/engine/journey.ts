/**
 * 区間の結果: 関係路線の公式状態(構造化) + 区間の気象リスク + 復旧の見通し + 代替手段 → 1つの結論。
 * 気象(区間の地点・時間別・7日・空港バス)は既存の getJourneyForecast を使い、公式状態は新しいボードを使う。
 */
import { getStationById, type Station } from '@/lib/hokkaido-data';
import { findAlternatives, type AlternativesView } from './alternatives';
import { linesForJourney } from '@/lib/registry/journey-lines';
import { getBoard, type BoardLine } from './board';
import { combine, type OfficialState, type UnknownReason } from './status';
import { getJourneyForecast } from '@/lib/forecast/journey';
import { recoveryView, type RecoveryView } from './recovery';
import { getCurrentOnsets } from './onsets';
import { advise, type Advice } from './advice';
import { withSnowLoad } from '@/lib/forecast/snow-load';
import coefficients from '@/lib/forecast/core-coefficients.json';
import type { JourneyForecast, RiskLevel } from '@/lib/forecast/types';

export type Verdict = 'go' | 'watch' | 'caution' | 'disrupted' | 'unknown';

export interface JourneyResult {
    request: { from: string; to: string; date: string; time: string };
    from: Pick<Station, 'id' | 'name'>;
    to: Pick<Station, 'id' | 'name'>;
    lines: BoardLine[];
    official: {
        state: OfficialState;
        reason?: UnknownReason;
        /** 対象日が今日・明日の営業日か(それ以外は公式発表がまだ無い) */
        dayKind: 'today' | 'tomorrow' | 'later';
        publishedAt: string | null;
        disrupted: { slug: string; name: string; note?: string; notices: BoardLine['today']['notices'] }[];
    };
    riskAtTime: RiskLevel;
    /** 積雪と注意報による引き上げの理由(あれば) */
    snowLoadReason: string | null;
    verdict: Verdict;
    recovery: RecoveryView | null;
    advice: Advice;
    /** 指定時刻の気象条件での「天候による運休・大幅な遅れ」の目安。multiple はふだんの何倍か */
    probability: { percent: number; multiple: number } | null;
    forecast: JourneyForecast | null;
    alternatives: AlternativesView;
}

const RISK_RANK: Record<RiskLevel, number> = { unknown: -1, low: 0, watch: 1, high: 2, severe: 3 };

export function decideVerdict(official: OfficialState, risk: RiskLevel): Verdict {
    if (official === 'disrupted') return 'disrupted';
    if (risk === 'high' || risk === 'severe') return 'caution';
    if (official === 'unknown' && risk === 'unknown') return 'unknown';
    if (risk === 'watch') return 'watch';
    if (official === 'unknown') return risk === 'low' ? 'watch' : 'unknown';
    return 'go';
}

export class JourneyInputError extends Error {}

export async function getJourneyResult(req: { from: string; to: string; date: string; time: string }, now = new Date()): Promise<JourneyResult> {
    const from = getStationById(req.from), to = getStationById(req.to);
    const lineDefs = from && to && req.from !== req.to ? linesForJourney(req.from, req.to) : null;
    if (!from || !to || !lineDefs?.length) throw new JourneyInputError('UNSUPPORTED_JOURNEY');

    const [board, forecast] = await Promise.all([
        getBoard(),
        getJourneyForecast({ departureId: req.from, arrivalId: req.to, date: req.date, time: req.time }).catch(() => null),
    ]);
    const slugs = new Set(lineDefs.map(l => l.slug));
    const lines = board.lines.filter(l => slugs.has(l.slug));
    const dayKind = req.date === board.serviceDate ? 'today' : req.date === board.tomorrowDate ? 'tomorrow' : 'later';
    const days = lines.map(l => dayKind === 'today' ? l.today : l.tomorrow);
    // 特急は長距離のときだけ参考に含めている。特急だけの運休で区間全体を「運休」にはしない(普通列車は動く場合がある)
    const core = lines.filter(l => l.slug !== 'express');
    const coreDays = core.map(l => dayKind === 'today' ? l.today : l.tomorrow);
    let state: OfficialState = dayKind === 'later' ? 'unknown' : combine(coreDays.map(d => d.state));
    if (state === 'off-hours') state = 'no-info'; // 深夜の時間外は、指定時刻の運行可否を示さない
    const reason = dayKind === 'later' ? 'date-mismatch' as const : coreDays.find(d => d.state === 'unknown')?.reason;
    const disrupted = dayKind === 'later' ? [] : lines.filter(l => (dayKind === 'today' ? l.today : l.tomorrow).state === 'disrupted')
        .map(l => ({ slug: l.slug, name: l.name, note: l.note, notices: (dayKind === 'today' ? l.today : l.tomorrow).notices }));
    let riskAtTime: RiskLevel = forecast?.current.level ?? 'unknown';
    // 積雪が多いところに大雪・風雪の注意報: 今日、または(12時以降に見ている)明日の区間は少なくとも「警戒」
    const load = core.map(l => l.snowLoad).find(x => x && (dayKind === 'today' || (dayKind === 'tomorrow' && x.appliesTomorrow))) ?? null;
    let loadReason: string | null = null;
    if (load && riskAtTime !== 'unknown') {
        const bumped = withSnowLoad({ level: riskAtTime, reasons: [] as string[] }, load);
        riskAtTime = bumped.level; loadReason = bumped.reasons[0];
    }

    let recovery: RecoveryView | null = null;
    if (state === 'disrupted' && dayKind === 'today') {
        const own = disrupted.flatMap(d => d.notices.filter(n => !n.areaWide));
        const notices = own.length ? own : disrupted.flatMap(d => d.notices);
        const onsets = await getCurrentOnsets(now);
        const starts = lines.filter(l => l.today.state === 'disrupted')
            .flatMap(l => l.today.units.filter(u => u.state === 'disrupted').map(u => u.unit === 'shinkansen' ? undefined : onsets.get(u.unit)))
            .filter((x): x is number => x != null);
        recovery = recoveryView({ notices, onset: starts.length ? Math.min(...starts) : null, now });
    }
    const score = forecast?.current.score;
    const baseRate = coefficients.training.positives / coefficients.training.rows * 100;
    const probability = typeof score === 'number' ? { percent: score, multiple: Math.round(score / baseRate) } : null;
    const hour = new Date(now.getTime() + 9 * 3_600_000).getUTCHours();
    const advice = advise({ disrupted: state === 'disrupted' && dayKind === 'today', recovery, risk: riskAtTime, hour, officialKnown: state !== 'unknown' });
    const published = days.map(d => d.publishedAt).filter((x): x is string => !!x).sort();
    return {
        request: req, from: { id: from.id, name: from.name }, to: { id: to.id, name: to.name }, lines,
        official: { state, ...(reason ? { reason } : {}), dayKind, publishedAt: published[0] ?? null, disrupted },
        riskAtTime, snowLoadReason: loadReason, verdict: decideVerdict(state, riskAtTime), recovery, advice, probability, forecast,
        alternatives: findAlternatives(from.id, to.id, lines.map(l => l.slug), now),
    };
}

export { RISK_RANK };
