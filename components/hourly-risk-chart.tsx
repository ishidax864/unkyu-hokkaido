'use client';

import { Cloud, TrendingUp } from 'lucide-react';
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
    const maxRisk = Math.max(...data.map(d => d.risk), 10); // 最小でも10%分の高さは確保

    const getBarColor = (risk: number) => {
        if (risk >= 70) return 'bg-[var(--status-suspended)]';
        if (risk >= 50) return 'bg-orange-500';
        if (risk >= 20) return 'bg-[var(--status-warning)]';
        return 'bg-blue-300'; // 低リスクは青系で安心感を
    };

    return (
        <div className="card p-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                <span className="text-sm font-bold">時間帯別リスク推移</span>
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
                                item.risk >= 50 ? "text-red-600" : "text-[var(--muted)]"
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
            <div className="text-[10px] text-center text-[var(--muted)] mt-2">
                ※前後2時間の予測推移
            </div>
        </div>
    );
}
