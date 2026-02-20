
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
            title: '移動困難 (Severe)',
            message: '移動の延期、または代替手段の検討を強く推奨します',
            bgColor: 'bg-red-500 text-white',
            subColor: 'bg-red-600',
            iconType: 'x-circle'
        };
    }

    // 2. HIGH RISK (Orange): High Probability (50-79%) OR Partial Suspension
    if (result.probability >= 50 || result.isPartialSuspension) {
        return {
            type: 'HIGH_RISK',
            title: '警戒 (High Risk)',
            message: '大幅な遅れや運休の可能性があります。最新情報を確認してください',
            bgColor: 'bg-orange-500 text-white',
            subColor: 'bg-orange-600',
            iconType: 'alert-triangle'
        };
    }

    // 3. CAUTION (Yellow): Medium Probability (20-49%) OR Chaos Flag
    if (result.isPostResumptionChaos || result.probability >= 20 || result.status === 'delay' || result.status === 'delayed') {
        return {
            type: 'CAUTION',
            title: '注意 (Caution)',
            message: '一部列車に遅れが生じる可能性があります',
            bgColor: 'bg-amber-400 text-black', // Yellow needs black text for contrast
            subColor: 'bg-amber-500',
            iconType: 'info'
        };
    }

    // 4. NORMAL (Green): Low Probability (<20%)
    return {
        type: 'NORMAL',
        title: '平常運転見込み (Normal)',
        message: '現時点では定刻通りの運行が予測されます',
        bgColor: 'bg-emerald-500 text-white',
        subColor: 'bg-emerald-600',
        iconType: 'check-circle'
    };
}
