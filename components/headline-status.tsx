'use client';

import { AlertTriangle, CheckCircle, Cloud, Train } from 'lucide-react';
import { WeatherWarning, JRStatusItem } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';

interface HeadlineStatusProps {
    warnings: WeatherWarning[];
    weatherCondition: string;
    jrStatus?: JRStatusItem[]; //
    isLoading?: boolean;
}

/**
 * rawText（JR公式の発表文）から路線に対応する具体的な運休情報を抽出する。
 * 例: "根室線　新得～池田駅間：11時頃から終日運休" → "新得～池田 11時頃から終日運休"
 */
function extractRouteSummary(routeName: string, rawText?: string): string | null {
    if (!rawText) return null;

    // Route name variants for matching
    const nameVariants: Record<string, string[]> = {
        '千歳線': ['千歳線', 'エアポート', '千歳'],
        '石勝線': ['石勝線', 'おおぞら', 'とかち'],
        '根室本線': ['根室線', '根室本線'],
        '函館本線': ['函館本線', '函館線'],
        '室蘭本線': ['室蘭本線', '室蘭線'],
        '宗谷本線': ['宗谷本線', '宗谷線', 'サロベツ', '宗谷'],
        '石北本線': ['石北本線', '石北線', 'オホーツク', '大雪'],
        '富良野線': ['富良野線', 'ラベンダー', '富良野'],
        '日高本線': ['日高本線', '日高線'],
        '釧網本線': ['釧網本線', '釧網線'],
        '学園都市線（札沼線）': ['学園都市線', '札沼線'],
        '留萌本線': ['留萌本線', '留萌線'],
    };

    const variants = nameVariants[routeName] || [routeName];

    // Split rawText into segments by ・ or newline-like patterns
    const segments = rawText.split(/[・\n]/).map(s => s.trim()).filter(Boolean);

    // Find the most specific segment matching this route
    for (const seg of segments) {
        for (const v of variants) {
            if (seg.includes(v)) {
                // Clean up: extract the core info (section and schedule)
                // e.g., "根室線　新得～池田駅間：11時頃から終日運休" → "新得～池田 11時頃から終日運休"
                let summary = seg;
                // Remove route name prefix for brevity
                for (const rv of variants) {
                    summary = summary.replace(rv, '').trim();
                }
                // Clean leading whitespace/punctuation
                summary = summary.replace(/^[\s　：:]+/, '').trim();

                if (summary.length > 3) {
                    // Cap length for display
                    return summary.length > 40 ? summary.substring(0, 38) + '…' : summary;
                }
            }
        }
    }

    return null;
}

/**
 * ページ上部に表示する今日の全体的な運行予報サマリー
 */
export function HeadlineStatus({ warnings, weatherCondition: _weatherCondition, jrStatus = [], isLoading }: HeadlineStatusProps) {
    const { t } = useTranslation();
    if (isLoading) {
        return (
            <div className="card p-4 mb-4 border-2 bg-gray-50 border-gray-100 animate-pulse">
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-1.5" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                </div>
            </div>
        );
    }

    // JR運行情報の判定（最優先）
    const suspendedRoutes = jrStatus.filter(s => s.status === 'suspended' || s.status === 'cancelled');
    const delayedRoutes = jrStatus.filter(s => s.status === 'delay' || s.status === 'partial');

    // 警報の重要度判定
    const hasCriticalWarnings = warnings.some(w =>
        ['暴風雪警報', '暴風警報', '大雪警報'].includes(w.type)
    );
    const hasMinorWarnings = warnings.length > 0 && !hasCriticalWarnings;

    // ステータス決定
    const getStatus = () => {
        // 1. 実際の運休（最優先）
        if (suspendedRoutes.length > 0) {
            // 各路線の詳細サマリーを生成
            const routeDetails = suspendedRoutes.slice(0, 4).map(r => {
                const summary = extractRouteSummary(r.routeName, r.rawText);
                return {
                    name: r.routeName,
                    detail: summary,
                };
            });

            return {
                level: 'critical' as const,
                icon: AlertTriangle,
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                textColor: 'text-red-800',
                iconColor: 'text-red-500',
                headline: `❌ ${t('headline.suspendedRoutes', { count: String(suspendedRoutes.length) })}`,
                routeDetails,
            };
        }

        // 2. 実際の遅延
        if (delayedRoutes.length > 0) {
            return {
                level: 'warning' as const,
                icon: Train,
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                textColor: 'text-orange-800',
                iconColor: 'text-orange-500',
                headline: `⚠️ ${t('headline.delayedRoutes', { count: String(delayedRoutes.length) })}`,
                message: t('headline.minorWarning'),
            };
        }

        // 3. 気象警報（暴風雪等）
        if (hasCriticalWarnings) {
            return {
                level: 'critical' as const,
                icon: AlertTriangle,
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                textColor: 'text-red-800',
                iconColor: 'text-red-500',
                headline: `⚠️ ${t('headline.criticalWarning')}`,
                message: t('headline.criticalWarning'),
            };
        }

        // 4. 注意報
        if (hasMinorWarnings) {
            return {
                level: 'warning' as const,
                icon: Cloud,
                bgColor: 'bg-yellow-50',
                borderColor: 'border-yellow-200',
                textColor: 'text-yellow-800',
                iconColor: 'text-yellow-600',
                headline: `⚡ ${t('headline.minorWarning')}`,
                message: t('headline.minorWarning'),
            };
        }

        // 5. 平常
        return {
            level: 'normal' as const,
            icon: CheckCircle,
            bgColor: 'bg-[var(--primary-light)]',
            borderColor: 'border-[var(--brand-green-100)]',
            textColor: 'text-[var(--status-normal)]',
            iconColor: 'text-[var(--status-normal)]',
            headline: `✅ ${t('headline.allNormal')}`,
            message: t('headline.allNormalDetail'),
        };
    };

    const status = getStatus();
    const Icon = status.icon;

    return (
        <div className={`card p-4 mb-4 border-2 ${status.bgColor} ${status.borderColor}`}>
            <div className="flex items-start gap-3">
                <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${status.iconColor}`} />
                <div className="flex-1">
                    <div className={`font-bold text-[17px] leading-tight ${status.textColor}`}>
                        {status.headline}
                    </div>
                    {'routeDetails' in status && status.routeDetails ? (
                        <div className="mt-1.5 space-y-0.5">
                            {status.routeDetails.map((r: { name: string; detail: string | null }) => (
                                <div key={r.name} className={`text-[12px] ${status.textColor} opacity-70 leading-snug`}>
                                    <span className="font-bold">{r.name}</span>
                                    {r.detail && (
                                        <span className="ml-1 opacity-80">: {r.detail}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`text-[12px] mt-0.5 ${status.textColor} opacity-60`}>
                            {'message' in status ? (status as { message: string }).message : ''}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
