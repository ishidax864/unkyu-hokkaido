'use client';

import { AlertTriangle, CheckCircle, Cloud } from 'lucide-react';
import { WeatherWarning } from '@/lib/types';

interface HeadlineStatusProps {
    warnings: WeatherWarning[];
    weatherCondition: string;
}

/**
 * ページ上部に表示する今日の全体的な運行予報サマリー
 */
export function HeadlineStatus({ warnings, weatherCondition }: HeadlineStatusProps) {
    // 警報の重要度判定
    const hasCriticalWarnings = warnings.some(w =>
        ['暴風雪警報', '暴風警報', '大雪警報'].includes(w.type)
    );
    const hasMinorWarnings = warnings.length > 0 && !hasCriticalWarnings;

    // ステータス決定
    const getStatus = () => {
        if (hasCriticalWarnings) {
            return {
                level: 'critical' as const,
                icon: AlertTriangle,
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                textColor: 'text-red-800',
                iconColor: 'text-red-500',
                headline: '⚠️ 本日の運行に大きな影響の恐れ',
                message: '暴風雪・大雪警報が発令されています。JR各線で運休・大幅遅延の可能性があります。',
            };
        }

        if (hasMinorWarnings) {
            return {
                level: 'warning' as const,
                icon: Cloud,
                bgColor: 'bg-yellow-50',
                borderColor: 'border-yellow-200',
                textColor: 'text-yellow-800',
                iconColor: 'text-yellow-600',
                headline: '⚡ 本日の運行に注意が必要',
                message: '気象注意報が発令されています。一部路線で遅延の可能性があります。',
            };
        }

        return {
            level: 'normal' as const,
            icon: CheckCircle,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-800',
            iconColor: 'text-blue-500',
            headline: '✅ 本日は平常運行の見込み',
            message: '現在、運行に影響する気象警報はありません。',
        };
    };

    const status = getStatus();
    const Icon = status.icon;

    return (
        <div className={`card p-4 mb-4 border-2 ${status.bgColor} ${status.borderColor}`}>
            <div className="flex items-start gap-3">
                <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${status.iconColor}`} />
                <div className="flex-1">
                    <div className={`font-bold text-base mb-1 ${status.textColor}`}>
                        {status.headline}
                    </div>
                    <div className={`text-sm ${status.textColor} opacity-90`}>
                        {status.message}
                    </div>
                </div>
            </div>
        </div>
    );
}
