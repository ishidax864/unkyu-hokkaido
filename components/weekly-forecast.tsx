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

    const _maxProb = Math.max(...predictions.map(p => p.probability), 50);

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

    // リスクに応じた色 (Bar Background)
    const getRiskColor = (prob: number) => {
        if (prob >= 80) return 'bg-red-600';     // Severe
        if (prob >= 50) return 'bg-orange-500';  // High Risk
        if (prob >= 20) return 'bg-amber-400';   // Caution
        return 'bg-emerald-500';                 // Normal
    };

    const getRiskTextColor = (prob: number) => {
        if (prob >= 80) return 'text-red-700';
        if (prob >= 50) return 'text-orange-700';
        if (prob >= 20) return 'text-amber-700';
        return 'text-slate-600';
    };

    return (
        <section className="card p-5" aria-labelledby="weekly-forecast-title">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <h3 id="weekly-forecast-title" className="text-sm font-bold text-gray-700">向こう5日間の運休リスク予測</h3>
            </div>

            <div className="space-y-4">
                {predictions.slice(0, 5).map((pred, _index) => {
                    const dayWeather = weather.find(w => w.date === pred.targetDate);
                    const dateText = formatDate(pred.targetDate);
                    // '今日'や'明日'の場合はそのまま、それ以外は日付と曜日(カッコ内)を分割
                    const hasParen = dateText.includes('(');
                    const mainDate = hasParen ? dateText.split('(')[0] : dateText;
                    const subDate = hasParen ? `(${dateText.split('(')[1]}` : '';

                    return (
                        <div key={pred.targetDate} className="flex items-center gap-4">
                            {/* 日付 */}
                            <div className="w-14 flex-shrink-0 text-xs text-gray-500 text-center">
                                <div className="font-bold text-gray-700 text-sm">{mainDate}</div>
                                <div className="scale-90 opacity-80">{subDate}</div>
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
            {/* 凡例 */}
            <div className="flex flex-wrap text-center items-center justify-center gap-4 mt-6 pt-4 border-t border-dashed border-gray-200">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>通常 (0-20%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>注意 (20-50%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span>要警戒 (50-80%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <span>運休高確率 (80%+)</span>
                </div>
            </div>
        </section>
    );
}
