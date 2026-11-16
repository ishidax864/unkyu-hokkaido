/**
 * 区間の結果: 関係路線の公式状態(構造化) + 区間の気象リスク + 復旧の見通し + 代替手段 → 1つの結論。
 * 気象(区間の地点・時間別・7日・空港バス)は既存の getJourneyForecast を使い、公式状態は新しいボードを使う。
 */
import { getStationById, getAlternativeRoutes, type Station, type AlternativeRouteOption } from '@/lib/hokkaido-data';
import { linesForJourney } from '@/lib/registry/journey-lines';
import { getBoard, type BoardLine } from './board';
import { combine, type OfficialState, type UnknownReason } from './status';
import { getJourneyForecast } from '@/lib/forecast/journey';
import { estimateRecovery, officialRecoveryTime, type RecoveryEstimate } from '@/lib/forecast/recovery';
import { stationPlaces } from '@/lib/forecast/places';
import { causeFromNotices } from './line';
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
    verdict: Verdict;
    recovery: RecoveryEstimate | null;
    forecast: JourneyForecast | null;
    alternatives: AlternativeRouteOption[];
    places: ReturnType<typeof stationPlaces>[];
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
    const riskAtTime: RiskLevel = forecast?.current.level ?? 'unknown';

    let recovery: RecoveryEstimate | null = null;
    if (state === 'disrupted' && dayKind === 'today') {
        const notices = disrupted.flatMap(d => d.notices.filter(n => !n.areaWide));
        const text = notices.map(n => `${n.title}\n${n.body}`).join('\n');
        recovery = estimateRecovery({ disrupted: true, officialText: text, officialExpectedAt: officialRecoveryTime(text, now),
            routeId: lineDefs[0].routeIds[0] ?? lineDefs[0].slug, cause: 'unknown', incidents: [], startedAt: null, now });
        if (recovery.kind === 'unknown') {
            const cause = causeFromNotices(disrupted.flatMap(d => d.notices.map(n => n.title)));
            recovery = { ...recovery, label: 'JRから再開見込みの発表はまだありません',
                detail: `${cause ? `原因: ${cause}（JR発表）。` : ''}再開時刻が発表されたら表示します。急ぐ場合は下の代替手段も確認してください。` };
        }
    }
    const published = days.map(d => d.publishedAt).filter((x): x is string => !!x).sort();
    const at = new Date(`${req.date}T${req.time}:00+09:00`);
    return {
        request: req, from: { id: from.id, name: from.name }, to: { id: to.id, name: to.name }, lines,
        official: { state, ...(reason ? { reason } : {}), dayKind, publishedAt: published[0] ?? null, disrupted },
        riskAtTime, verdict: decideVerdict(state, riskAtTime), recovery, forecast,
        alternatives: getAlternativeRoutes(from.id, to.id),
        places: [stationPlaces(from.id, at, now), stationPlaces(to.id, at, now)],
    };
}

export { RISK_RANK };
