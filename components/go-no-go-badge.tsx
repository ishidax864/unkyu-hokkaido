'use client';

import { cn } from '@/lib/utils';
import { PredictionResult } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle, AlertCircle, Users } from 'lucide-react';

type GoNoGoLevel = 'GO' | 'CAUTION' | 'PREPARE_ALT' | 'NO_GO';

interface GoNoGoResult {
    level: GoNoGoLevel;
    label: string;
    sublabel: string;
    icon: typeof CheckCircle2;
    bgClass: string;
    textClass: string;
    crowdOverride: boolean;
}

function evaluateGoNoGo(result: PredictionResult): GoNoGoResult {
    const crowd = result.crowdStats;
    const prob = result.probability;

    // ── Crowd overrides (ユーザー報告による強制上書き) ──
    if (crowd) {
        // 3人以上が「止まっている」→ 🔴 強制
        if (crowd.last15minStopped >= 3) {
            return {
                level: 'NO_GO',
                label: '乗れません',
                sublabel: `${crowd.last15minStopped}人が「止まっている」と報告`,
                icon: XCircle,
                bgClass: 'bg-red-50 border-red-200',
                textClass: 'text-red-700',
                crowdOverride: true,
            };
        }
        // 3人以上が「遅延」→ 最低でも 🟡
        if (crowd.last15minDelayed >= 3 && prob < 20) {
            return {
                level: 'CAUTION',
                label: '乗れるが注意',
                sublabel: `${crowd.last15minDelayed}人が「遅延」と報告`,
                icon: AlertCircle,
                bgClass: 'bg-yellow-50 border-yellow-200',
                textClass: 'text-yellow-700',
                crowdOverride: true,
            };
        }
        // 5人以上が「平常」& prob < 30 → 🟢 強制
        if (crowd.last15minResumed >= 5 && prob < 30) {
            return {
                level: 'GO',
                label: '乗れます',
                sublabel: `${crowd.last15minResumed}人が「平常運転」と報告`,
                icon: CheckCircle2,
                bgClass: 'bg-emerald-50 border-emerald-200',
                textClass: 'text-emerald-700',
                crowdOverride: true,
            };
        }
    }

    // ── 予測ベースの判定 ──

    // 🔴 NO_GO: 運休中 or 80%以上
    if (result.isCurrentlySuspended || prob >= 80) {
        return {
            level: 'NO_GO',
            label: '乗れません',
            sublabel: result.isCurrentlySuspended
                ? '現在、運転を見合わせています'
                : '運休の可能性が非常に高い状況です',
            icon: XCircle,
            bgClass: 'bg-red-50 border-red-200',
            textClass: 'text-red-700',
            crowdOverride: false,
        };
    }

    // 🟠 PREPARE_ALT: 50-79% or 部分運休
    if (prob >= 50 || result.isPartialSuspension) {
        return {
            level: 'PREPARE_ALT',
            label: '代替手段を準備',
            sublabel: result.isPartialSuspension
                ? '一部の列車が運休 — 代替手段の確認を'
                : '運休リスクが高い — 代替手段の準備を',
            icon: AlertTriangle,
            bgClass: 'bg-orange-50 border-orange-200',
            textClass: 'text-orange-700',
            crowdOverride: false,
        };
    }

    // 🟡 CAUTION: 20-49%
    if (prob >= 20) {
        return {
            level: 'CAUTION',
            label: '乗れるが注意',
            sublabel: '遅延や急な運休の可能性があります',
            icon: AlertCircle,
            bgClass: 'bg-yellow-50 border-yellow-200',
            textClass: 'text-yellow-700',
            crowdOverride: false,
        };
    }

    // 🟢 GO: < 20%
    return {
        level: 'GO',
        label: '乗れます',
        sublabel: '通常通り運行しています',
        icon: CheckCircle2,
        bgClass: 'bg-emerald-50 border-emerald-200',
        textClass: 'text-emerald-700',
        crowdOverride: false,
    };
}

interface GoNoGoBadgeProps {
    result: PredictionResult;
}

export function GoNoGoBadge({ result }: GoNoGoBadgeProps) {
    const verdict = evaluateGoNoGo(result);
    const Icon = verdict.icon;

    return (
        <div className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all',
            verdict.bgClass
        )}>
            <Icon className={cn('w-7 h-7 shrink-0', verdict.textClass)} />
            <div className="min-w-0 flex-1">
                <div className={cn('text-base font-black tracking-tight', verdict.textClass)}>
                    {verdict.label}
                </div>
                <div className={cn('text-xs font-medium opacity-80 leading-snug', verdict.textClass)}>
                    {verdict.crowdOverride && (
                        <Users className="inline w-3 h-3 mr-1 -mt-0.5" />
                    )}
                    {verdict.sublabel}
                </div>
            </div>
        </div>
    );
}
