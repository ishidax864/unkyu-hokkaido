
import { PredictionInput, VulnerabilityData } from '../../types';
import { RiskFactorStrategy, RiskFactorResult } from './base';
import {
    THUNDER_ADVISORY_SCORE,
    USER_REPORT_STOPPED_SCORE,
    USER_REPORT_DELAYED_SCORE,
    USER_REPORT_CROWDED_SCORE,
    USER_REPORT_COUNT_BONUS_COEFFICIENT,
    USER_REPORT_MAX_BONUS,
    MIN_USER_REPORT_COUNT
} from '../constants';

export class OtherFactorsStrategy implements RiskFactorStrategy {
    name = 'OtherFactorsStrategy';

    evaluate(input: PredictionInput, vuln: VulnerabilityData): RiskFactorResult {
        let score = 0;
        const reasons: { reason: string; priority: number }[] = [];

        // 1. User Reports
        const cs = input.crowdsourcedStatus;
        if (cs != null && cs.reportCount >= MIN_USER_REPORT_COUNT && cs.consensusStatus !== 'normal') {
            const baseWeight = cs.consensusStatus === 'stopped' ? USER_REPORT_STOPPED_SCORE :
                cs.consensusStatus === 'delayed' ? USER_REPORT_DELAYED_SCORE : USER_REPORT_CROWDED_SCORE;
            const countBonus = Math.min(cs.reportCount * USER_REPORT_COUNT_BONUS_COEFFICIENT, USER_REPORT_MAX_BONUS);
            score += (baseWeight + countBonus);

            const statusText = cs.consensusStatus === 'stopped' ? '運休・見合わせ' : '遅延あり';
            reasons.push({ reason: `ユーザー${cs.reportCount}件の報告: ${statusText}`, priority: 10 });
        }

        // 2. Thunder Advisory
        if (input.weather?.warnings.some(w => w.type === '雷注意報')) {
            score += THUNDER_ADVISORY_SCORE;
            reasons.push({ reason: '雷注意報が発令されています', priority: 11 }); // Priority was 11 in original
        }

        // 3. Deer Risk
        if (input.weather && vuln.hasDeerRisk) {
            const date = new Date(input.targetDate);
            const month = date.getMonth() + 1;
            const isDeerSeason = (month >= 10 || month <= 3);

            if (isDeerSeason) {
                if (!input.targetTime) {
                    // Time not specified, assume risk
                    score += 10;
                    reasons.push({ reason: 'エゾシカ多発時期・時間帯（衝突リスクあり）', priority: 8 });
                } else {
                    const hour = parseInt(input.targetTime.slice(0, 2));
                    const isNight = (hour >= 16 || hour <= 6);
                    if (isNight) {
                        score += 10;
                        reasons.push({ reason: 'エゾシカ多発時期・時間帯（衝突リスクあり）', priority: 8 });
                    }
                }
            }
        }

        return { score, reasons };
    }
}
