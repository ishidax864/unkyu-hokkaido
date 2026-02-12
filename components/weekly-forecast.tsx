'use client';

import { PredictionResult } from '@/lib/types';
import { WeatherForecast } from '@/lib/types';
import { TrendingUp } from 'lucide-react';
import { getWeatherIcon } from '@/lib/weather-utils';
import { cn } from '@/lib/utils';

interface WeeklyForecastChartProps {
    predictions: PredictionResult[];
    weather: WeatherForecast[];
}


export function WeeklyForecastChart({ predictions, weather }: WeeklyForecastChartProps) {
    if (predictions.length === 0) return null;

    const maxProb = Math.max(...predictions.map(p => p.probability), 50);

    // 日付フォーマット
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date(); // 現在時刻

        // JSTでの「今日」の日付文字列を取得 (YYYY-MM-DD)
        // sv-SEロケールは標準でYYYY-MM-DD形式を返すため、フォーマット揺れが少ない
        const jstToday = new Intl.DateTimeFormat('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Tokyo'
        }).format(now);

        // JSTでの「明日」の日付文字列を取得
        const jstTomorrowStr = new Intl.DateTimeFormat('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Tokyo'
        }).format(new Date(now.getTime() + 24 * 60 * 60 * 1000));

        if (dateStr === jstToday) return '今日';
        if (dateStr === jstTomorrowStr) return '明日';

        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        return `${month}/${day}(${weekday})`;
    };

    // リスクに応じた色
    const getRiskColor = (prob: number) => {
        if (prob >= 70) return 'bg-[var(--status-suspended)]';
        if (prob >= 50) return 'bg-orange-500';
        if (prob >= 20) return 'bg-[var(--status-warning)]';
        return 'bg-[var(--status-normal)]';
    };

    const getRiskTextColor = (prob: number) => {
        if (prob >= 50) return 'text-[var(--status-suspended)]';
        if (prob >= 20) return 'text-[var(--status-warning)]';
        return 'text-[var(--status-normal)]';
    };

    return (
        <section className="card p-5" aria-labelledby="weekly-forecast-title">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <h3 id="weekly-forecast-title" className="text-sm font-bold text-gray-700">週間運休リスク予測</h3>
            </div>

            <div className="space-y-4">
                {predictions.slice(0, 5).map((pred, index) => {
                    const dayWeather = weather.find(w => w.date === pred.targetDate);

                    return (
                        <div key={pred.targetDate} className="flex items-center gap-4">
                            {/* 日付 */}
                            <div className="w-14 flex-shrink-0 text-xs text-gray-500 text-center">
                                <div className="font-bold text-gray-700 text-sm">{formatDate(pred.targetDate).split('(')[0]}</div>
                                <div className="scale-90 opacity-80">({formatDate(pred.targetDate).split('(')[1]}</div>
                            </div>

                            {/* 天気アイコン */}
                            <div className="w-8 flex-shrink-0 text-center text-xl grayscale opacity-80">
                                {dayWeather ? getWeatherIcon(dayWeather.weather) : ''}
                            </div>

                            {/* プログレスバーエリア */}
                            <div className="flex-1 relative">
                                <div className="flex items-end justify-between mb-1">
                                    <span className="text-[10px] text-gray-400 font-medium">リスク</span>
                                    <span className={cn("text-xs font-bold", getRiskTextColor(pred.probability))}>
                                        {pred.probability}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={cn('h-full rounded-full transition-all duration-500', getRiskColor(pred.probability))}
                                        style={{ width: `${Math.max(pred.probability, 5)}%` }}
                                    />
                                </div>
                            </div>

                            {/* 天気詳細 info */}
                            <div className="w-20 text-right flex-shrink-0">
                                {dayWeather && (
                                    <div className="text-[10px] text-gray-400 font-medium space-y-0.5">
                                        <div className={cn(dayWeather.windSpeed >= 15 ? "text-orange-500 font-bold" : "")}>
                                            💨 {dayWeather.windSpeed}m/s
                                        </div>
                                        {(dayWeather.snowfall ?? 0) > 0 && (
                                            <div className={cn((dayWeather.snowfall ?? 0) >= 10 ? "text-blue-500 font-bold" : "")}>
                                                ❄️ {dayWeather.snowfall}cm
                                            </div>
                                        )}
                                        {dayWeather.windSpeed < 15 && (dayWeather.snowfall ?? 0) === 0 && (
                                            <div className="opacity-80">{dayWeather.tempMax}° / {dayWeather.tempMin}°</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 凡例 */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-dashed border-gray-200">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-[var(--status-normal)]" />
                    <span>低リスク</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-[var(--status-warning)]" />
                    <span>中リスク</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-[var(--status-suspended)]" />
                    <span>高リスク</span>
                </div>
            </div>
        </section>
    );
}
