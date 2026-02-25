
import { PredictionInput, VulnerabilityData } from '../../types';
import { RiskFactorStrategy, RiskFactorResult } from './base';
import { getJRStatusWeight } from '../../jr-status';
import { getRecencyWeight } from '../helpers';

export class OfficialStatusStrategy implements RiskFactorStrategy {
    name = 'OfficialStatusStrategy';

    evaluate(input: PredictionInput, _vuln: VulnerabilityData): RiskFactorResult {
        let score = 0;
        const reasons: { reason: string; priority: number }[] = [];

        // 🆕 Timezone-aware check
        const todayJST = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Asia/Tokyo'
        }).format(new Date());

        // If target date is NOT today, we should probably ignore the "Current" status 
        // unless the text explicitly mentions future dates (which is hard to parse reliably here).
        // Standard approach: Current JR Status is only valid for "Today" (or very near future).
        if (input.targetDate !== todayJST) {
            return { score: 0, reasons: [] };
        }

        // 🆕 Check for Resumption Time Intersection
        // If current status is Suspended BUT target time is AFTER resumption time, ignore the status score.
        if (input.jrStatus && input.jrStatus.resumptionTime) {
            const resumptionDate = new Date(input.jrStatus.resumptionTime);
            // targetDate is YYYY-MM-DD, targetTime is HH:MM
            const targetDateTime = new Date(`${input.targetDate}T${input.targetTime}:00+09:00`);

            // Add slight buffer (e.g. 30 mins) to ensure we don't flip too early if delayed
            // specific buffer can be tuned, but here we just check if we are significantly past resumption
            if (targetDateTime.getTime() > resumptionDate.getTime()) {
                // Resumption time passed -> Treat as if status is NOT suspended for this strategy
                // We might want to add a small "Post-Resumption Instability" score, but definitely NOT the full suspended score.
                return { score: 0, reasons: [] };
            }
        }

        if (input.jrStatus != null && input.jrStatus.status !== 'normal') {
            const base = getJRStatusWeight(input.jrStatus.status);
            const recency = getRecencyWeight(input.jrStatus.updatedAt);
            score = Math.round(base * recency);
            reasons.push({
                reason: `【公式】${input.jrStatus.statusText || 'JR北海道運行情報で遅れ・運休'}`,
                priority: 0
            });
        }

        return { score, reasons };
    }
}
