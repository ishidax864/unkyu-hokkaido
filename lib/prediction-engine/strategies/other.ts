
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
        if (input.weather?.warnings?.some(w => w.type === '雷注意報')) {
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

        // 4. 気圧急変検出（爆弾低気圧: 24h で -24hPa 以上の降下）
        if (input.weather?.pressure && input.weather?.surroundingHours?.length) {
            const hours = input.weather.surroundingHours;
            // 前後12時間の気圧データから最大降下量を計算
            const pressures = hours
                .filter(h => h.pressure !== undefined)
                .map(h => h.pressure as number);

            if (pressures.length >= 6) {
                // 前半と後半の平均気圧差で降下傾向を検出
                const firstHalf = pressures.slice(0, Math.floor(pressures.length / 2));
                const secondHalf = pressures.slice(Math.floor(pressures.length / 2));
                const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

                // 最大→最小の降下量
                const maxPressure = Math.max(...pressures);
                const minPressure = Math.min(...pressures);
                const pressureDrop = maxPressure - minPressure;

                // 24hPa 以上の降下（国際基準の爆弾低気圧）
                if (pressureDrop >= 24) {
                    score += 25;
                    reasons.push({
                        reason: `爆弾低気圧の兆候: ${pressureDrop.toFixed(0)}hPa急降下`,
                        priority: 3
                    });
                } else if (pressureDrop >= 12 || (avgFirst - avgSecond) >= 8) {
                    // 12hPa以上、または顕著な降下傾向
                    score += 15;
                    reasons.push({
                        reason: `気圧急変: ${pressureDrop.toFixed(0)}hPa降下（荒天リスク）`,
                        priority: 5
                    });
                }
            }
        }

        return { score, reasons };
    }
}
