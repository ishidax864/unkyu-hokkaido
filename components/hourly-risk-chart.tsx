'use client';

import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

import { HourlyRiskData } from '@/lib/types';

interface HourlyRiskChartProps {
    data: HourlyRiskData[];
}

export function HourlyRiskChart({ data }: HourlyRiskChartProps) {
    if (data.length === 0) return null;

    // 天気アイコンを絵文字に変換
    const getWeatherEmoji = (icon: string) => {
        switch (icon) {
            case 'snow': return '❄️';
            case 'rain': return '🌧️';
            case 'wind': return '💨';
            case 'cloud': return '☁️';
            case 'sun': return '☀️';
            default: return '🌤️';
        }
    };

    // 高さ計算用

    const getBarColor = (risk: number) => {
        if (risk >= 80) return 'bg-red-600';     // Severe
        if (risk >= 50) return 'bg-orange-500';  // High Risk
        if (risk >= 20) return 'bg-amber-400';   // Caution
        return 'bg-emerald-400';                 // Normal
    };

    return (
        <section className="card p-4 mt-4" aria-labelledby="hourly-risk-title">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                <h3 id="hourly-risk-title" className="text-base font-black">時間帯別リスク推移</h3>
            </div>

            <div className="flex items-end justify-between gap-3 pt-2 pb-2">
                {data.map((item, index) => {
                    // リスク0%でも少しバーを表示する(5%)
                    const heightPercent = Math.max((item.risk / 100) * 100, 5);

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center group relative">
                            {/* リスク値ラベル */}
                            <span className={cn(
                                "text-xs font-bold mb-1",
                                item.risk >= 80 ? "text-red-700" :
                                    item.risk >= 50 ? "text-orange-700" :
                                        item.risk >= 20 ? "text-amber-700" : "text-slate-500"
                            )}>
                                {item.risk}%
                            </span>

                            {/* バー領域 (高さを固定) */}
                            <div className="w-full h-24 flex items-end justify-center relative bg-gray-50/50 rounded-sm">
                                <div
                                    className={cn(
                                        "w-[80%] rounded-t-sm transition-all duration-500 relative",
                                        getBarColor(item.risk),
                                        item.isTarget ? "ring-2 ring-[var(--primary)] ring-offset-1 z-10" : "opacity-80 hover:opacity-100"
                                    )}
                                    style={{ height: `${heightPercent}%` }}
                                />
                            </div>

                            {/* 時刻と天気 */}
                            <div className="text-center mt-3">
                                <div className={cn(
                                    "text-xs font-medium",
                                    item.isTarget ? "text-[var(--primary)] font-bold bg-green-50 px-2 py-0.5 rounded-full" : "text-[var(--foreground)]"
                                )}>
                                    {item.time}
                                </div>
                                <div className="text-base mt-1">{getWeatherEmoji(item.weatherIcon)}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* P3-2: 凡例 */}
            <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                    <span className="text-[11px] text-[var(--muted)]">安全</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                    <span className="text-[11px] text-[var(--muted)]">注意</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                    <span className="text-[11px] text-[var(--muted)]">高リスク</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-red-600" />
                    <span className="text-[11px] text-[var(--muted)]">危険</span>
                </div>
            </div>

            <div className="text-[11px] text-center text-[var(--muted)] mt-2 space-y-0.5">
                <div>※前後2時間の予測推移</div>
                <div>リアルタイム気象 + JR公式運行情報 + ユーザー報告を統合</div>
            </div>
        </section>
    );
}
