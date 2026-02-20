
import { PredictionResult } from './types';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import React from 'react';

export type ActionStatusType = 'CRITICAL' | 'HIGH_RISK' | 'CAUTION' | 'NORMAL';

export interface ActionDecision {
    type: ActionStatusType;
    title: string;
    message: string;
    bgColor: string;
    subColor: string;
    iconType: 'x-circle' | 'alert-triangle' | 'check-circle' | 'info';
    nextAction: string; // 🆕 Specific actionable advice (e.g., "Wait in cafe", "Book hotel")
    resumptionEstimate?: string; // 🆕 "15:00頃再開見込" or "終日運休"
}

/**
 * Determines the Action Decision (Go/No-Go) status based on prediction result.
 */
export function evaluateActionDecision(result: PredictionResult): ActionDecision {
    // 1. CRITICAL (Red): Very High Probability (>=80%) OR Official Suspension
    if (result.probability >= 80 ||
        result.status === 'suspended' ||
        result.status === 'cancelled' ||
        result.status === '運休' ||
        result.status === '運休中') {
        return {
            type: 'CRITICAL',
            title: '移動困難',
            message: '移動の延期、または代替手段の検討を強く推奨します',
            bgColor: 'bg-red-500 text-white',
            subColor: 'bg-red-600',
            iconType: 'x-circle',
            nextAction: (() => {
                const time = result.estimatedRecoveryTime;
                const isOfficial = result.isOfficialOverride;
                if (time?.includes('終日')) return '本日の移動は諦め、ホテルの確保や別ルート（バス等）を検討してください。';
                if (time) {
                    const label = isOfficial ? '【公式発表】' : '【AI予測】';
                    return `${label} 運転再開（${time}）まで、駅ではなくカフェや屋内施設で待機することをお勧めします。`;
                }
                return '最新の公式情報を確認し、無理な移動は控えてください。';
            })(),
            resumptionEstimate: (() => {
                const time = result.estimatedRecoveryTime;
                if (!time) return '復旧等の詳細情報なし';
                const label = result.isOfficialOverride ? '公式発表' : 'AI予測';
                return `【復旧見込 / ${label}】${time}`;
            })()
        };
    }

    // 2. HIGH RISK (Orange): High Probability (50-79%) OR Partial Suspension
    if (result.probability >= 50 || result.isPartialSuspension) {
        return {
            type: 'HIGH_RISK',
            title: '警戒',
            message: '大幅な遅れや運休の可能性があります。最新情報を確認してください',
            bgColor: 'bg-orange-500 text-white',
            subColor: 'bg-orange-600',
            iconType: 'alert-triangle',
            nextAction: result.isPartialSuspension
                ? '一部列車が運休しています。駅の掲示板やアナウンスで乗車予定の列車を確認してください。'
                : '運休のリスクが高まっています。こまめに運行状況を確認し、早めの移動を心がけてください。',
            resumptionEstimate: undefined // Avoid duplicating text; specific trains are listed below
        };
    }

    // 3. CAUTION (Yellow): Medium Probability (20-49%) OR Chaos Flag
    if (result.isPostResumptionChaos || result.probability >= 20 || result.status === 'delayed' || result.status === '遅延') {
        return {
            type: 'CAUTION',
            title: '注意',
            message: '一部列車に遅れが生じる可能性があります',
            bgColor: 'bg-amber-400 text-black', // Yellow needs black text for contrast
            subColor: 'bg-amber-500',
            iconType: 'info',
            nextAction: result.isPostResumptionChaos
                ? 'ダイヤが乱れています。接続列車に乗り継げない可能性があるため、余裕を持ったスケジュールで行動してください。'
                : '数分〜数十分の遅れが発生する可能性があります。時間は余裕を持って行動してください。',
            resumptionEstimate: result.estimatedRecoveryTime ? `【再開済み】${result.estimatedRecoveryTime}に運転再開` : undefined
        };
    }

    // 4. NORMAL (Green): Low Probability (<20%)
    return {
        type: 'NORMAL',
        title: '平常運転見込み',
        message: '現時点では定刻通りの運行が予測されます',
        bgColor: 'bg-emerald-500 text-white',
        subColor: 'bg-emerald-600',
        iconType: 'check-circle',
        nextAction: 'いつも通りご利用いただけます。気象急変には念のためご注意ください。'
    };
}
