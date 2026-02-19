
import { PredictionResult } from './types';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import React from 'react';

export type ActionStatusType = 'CRITICAL' | 'CAUTION' | 'NORMAL';

export interface ActionDecision {
    type: ActionStatusType;
    title: string;
    message: string;
    bgColor: string;
    subColor: string;
    iconType: 'x-circle' | 'alert-triangle' | 'check-circle';
}

/**
 * Determines the Action Decision (Go/No-Go) status based on prediction result.
 */
export function evaluateActionDecision(result: PredictionResult): ActionDecision {
    // 1. CRITICAL (Red): High Probability OR Suspended
    if (result.probability >= 70 ||
        result.status === 'suspended' ||
        result.status === 'cancelled' ||
        result.status === '運休' ||
        result.status === '運休中') {
        return {
            type: 'CRITICAL',
            title: '移動困難 (High Risk)',
            message: '移動の延期、または代替手段の検討を強く推奨します',
            bgColor: 'bg-red-500 text-white',
            subColor: 'bg-red-600',
            iconType: 'x-circle'
        };
    }

    // 2. CAUTION (Orange): Chaos Flag OR Medium Probability
    if (result.isPostResumptionChaos || result.probability >= 40) {
        return {
            type: 'CAUTION',
            title: 'ダイヤ乱れ警戒 (Caution)',
            message: '運転再開直後につき、大幅な遅れや混雑が予想されます',
            bgColor: 'bg-orange-500 text-white',
            subColor: 'bg-orange-600',
            iconType: 'alert-triangle'
        };
    }

    // 3. NORMAL (Green): Low Probability
    return {
        type: 'NORMAL',
        title: '平常運転見込み (Normal)',
        message: '現時点では定刻通りの運行が予測されます',
        bgColor: 'bg-green-500 text-white',
        subColor: 'bg-green-600',
        iconType: 'check-circle'
    };
}
