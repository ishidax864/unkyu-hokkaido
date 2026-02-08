import { OperationStatus, ConfidenceLevel } from '../types';
import {
    STATUS_CANCELLED_THRESHOLD,
    STATUS_SUSPENDED_THRESHOLD,
    STATUS_DELAYED_THRESHOLD,
    WEATHER_IMPACT_SEVERE_THRESHOLD,
    WEATHER_IMPACT_MODERATE_THRESHOLD,
    WEATHER_IMPACT_MINOR_THRESHOLD,
    REALTIME_DATA_MIN_FACTORS,
    HIGH_CONFIDENCE_MIN_FACTORS,
    HIGH_CONFIDENCE_MIN_PROBABILITY,
    MEDIUM_CONFIDENCE_MIN_FACTORS,
    MEDIUM_CONFIDENCE_MIN_PROBABILITY,
} from './constants';

/** 確率から運行ステータスを判定 */
export function getStatusFromProbability(prob: number): OperationStatus {
    if (prob >= STATUS_CANCELLED_THRESHOLD) return '運休';
    if (prob >= STATUS_SUSPENDED_THRESHOLD) return '運転見合わせ';
    if (prob >= STATUS_DELAYED_THRESHOLD) return '遅延';
    return '平常運転';
}

/** 信頼度レベルを判定 */
export function getConfidence(prob: number, factorCount: number, hasRealData: boolean): ConfidenceLevel {
    if (hasRealData && factorCount >= REALTIME_DATA_MIN_FACTORS) return 'high';
    if (factorCount >= HIGH_CONFIDENCE_MIN_FACTORS || prob >= HIGH_CONFIDENCE_MIN_PROBABILITY) return 'high';
    if (factorCount >= MEDIUM_CONFIDENCE_MIN_FACTORS || prob >= MEDIUM_CONFIDENCE_MIN_PROBABILITY) return 'medium';
    return 'low';
}

/** 天候影響レベルを判定 */
export function getWeatherImpact(prob: number): '重大' | '中程度' | '軽微' | 'なし' {
    if (prob >= WEATHER_IMPACT_SEVERE_THRESHOLD) return '重大';
    if (prob >= WEATHER_IMPACT_MODERATE_THRESHOLD) return '中程度';
    if (prob >= WEATHER_IMPACT_MINOR_THRESHOLD) return '軽微';
    return 'なし';
}

/** 公式テキストから関連する情報のみを抽出（他路線の情報をフィルタリング） */
export function filterOfficialText(text: string, routeName: string): string {
    if (!text || !routeName) return text;

    const otherRoutes = [
        '千歳線', '函館線', '函館本線', '学園都市線', '札沼線',
        '室蘭線', '室蘭本線', '石勝線', '根室線', '根室本線',
        '宗谷線', '宗谷本線', '石北線', '石北本線', '釧網線', '釧網本線', '富良野線', '日高線', '日高本線'
    ];

    const targetKeywords = routeName
        .replace('（道南）', '')
        .replace('（道北）', '')
        .replace('（道東）', '')
        .replace('（道央）', '')
        .split('・');

    const safeOtherRoutes = otherRoutes.filter(r =>
        !targetKeywords.some(k => r.includes(k) || k.includes(r))
    );

    const lines = text.split(/[\n。]/).map(l => l.trim()).filter(l => l.length > 0);
    const filteredLines = lines.filter(line => {
        if (line.includes('全区間') || line.includes('札幌圏') || line.includes('全道') || line.includes('特急')) return true;

        const hasOtherRoute = safeOtherRoutes.some(r => line.includes(r));
        const hasTargetRoute = targetKeywords.some(k => line.includes(k));

        if (hasOtherRoute && !hasTargetRoute) return false;
        return true;
    });

    return filteredLines.join('。') + (filteredLines.length > 0 ? '。' : '');
}
