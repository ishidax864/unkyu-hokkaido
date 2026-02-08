'use client';

import { PredictionResult } from '@/lib/types';
import { WeatherForecast } from '@/lib/types';
import { TrendingUp } from 'lucide-react';
import { getWeatherIcon } from '@/lib/weather-utils';

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
        <section className="card p-4" aria-labelledby="weekly-forecast-title">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                <h3 id="weekly-forecast-title" className="text-sm font-bold">週間運休リスク予測</h3>
            </div>

            <div className="space-y-3">
                {predictions.slice(0, 5).map((pred, index) => {
                    const dayWeather = weather.find(w => w.date === pred.targetDate);
                    const barHeight = Math.max((pred.probability / maxProb) * 100, 8);

                    return (
                        <div key={pred.targetDate} className="flex items-center gap-3">
                            {/* 日付 */}
                            <div className="w-16 text-xs text-[var(--muted)]">
                                <div className="font-medium">{formatDate(pred.targetDate)}</div>
                            </div>

                            {/* 天気アイコン */}
                            <div className="w-8 text-center text-lg">
                                {dayWeather ? getWeatherIcon(dayWeather.weather) : ''}
                            </div>

                            {/* プログレスバー */}
                            <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden relative">
                                <div
                                    className={`h-full rounded-md transition-all duration-500 ${getRiskColor(pred.probability)}`}
                                    style={{ width: `${barHeight}%` }}
                                />
                                {/* パーセンテージ */}
                                <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold ${pred.probability > 50 ? 'text-white' : getRiskTextColor(pred.probability)}`}>
                                    {pred.probability}%
                                </div>
                            </div>

                            {/* 天気情報 */}
                            <div className="w-20 text-right">
                                {dayWeather && (
                                    <div className="text-xs text-[var(--muted)]">
                                        {dayWeather.windSpeed >= 15 && (
                                            <span className="text-orange-500">💨{dayWeather.windSpeed}m/s</span>
                                        )}
                                        {(dayWeather.snowfall ?? 0) >= 10 && (
                                            <span className="text-blue-500 ml-1">❄️{dayWeather.snowfall}cm</span>
                                        )}
                                        {dayWeather.windSpeed < 15 && (dayWeather.snowfall ?? 0) < 10 && (
                                            <span>{dayWeather.tempMax}°/{dayWeather.tempMin}°</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 凡例 */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded bg-[var(--status-normal)]" />
                    <span className="text-[var(--muted)]">低リスク</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded bg-[var(--status-warning)]" />
                    <span className="text-[var(--muted)]">中リスク</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded bg-[var(--status-suspended)]" />
                    <span className="text-[var(--muted)]">高リスク</span>
                </div>
            </div>
        </section>
    );
}
