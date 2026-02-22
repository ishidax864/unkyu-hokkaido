'use client';

import { PredictionResult, HourlyRiskData, WeatherForecast, PredictionInput, TimeShiftSuggestion } from '@/lib/types';
import { Station, getRouteById } from '@/lib/hokkaido-data';
import { getHotelsForStation } from '@/lib/hotel-data';
import { PredictionResultCard } from './prediction-result';
import { ShareCard } from './share-card';
import { HourlyRiskChart } from './hourly-risk-chart';
import { ReportButtons } from './report-buttons';
import { AlternativeRoutes } from './alternative-routes';
import { HotelSuggestions } from './hotel-suggestions';
import { WeeklyForecastChart } from './weekly-forecast';
import { Star } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';

interface PredictionResultsProps {
    prediction: PredictionResult;
    selectedRouteId: string | null;
    date: string;
    time: string;
    depStation: Station | null;
    arrStation: Station | null;
    riskTrend: HourlyRiskData[] | null;
    realtimeStatus: PredictionInput['crowdsourcedStatus'];
    timeShiftSuggestion: TimeShiftSuggestion | null;
    weeklyPredictions: PredictionResult[];
    weather: WeatherForecast[];
    handleReport: (type: 'stopped' | 'delayed' | 'crowded' | 'normal', comment?: string) => void;
    isFavorite: (depId: string, arrId: string) => boolean;
    addFavorite: (depId: string, arrId: string, depName: string, arrName: string) => void;
    removeFavorite: (id: string) => void;
}

export function PredictionResults({
    prediction,
    selectedRouteId,
    date,
    time,
    depStation,
    arrStation,
    riskTrend,
    realtimeStatus,
    timeShiftSuggestion,
    weeklyPredictions,
    weather,
    handleReport,
    isFavorite,
    addFavorite,
    removeFavorite
}: PredictionResultsProps) {
    const isToday = date === new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
    if (!selectedRouteId) return null;
    const route = getRouteById(selectedRouteId);

    if (!route || !depStation || !arrStation) return null;

    return (
        <section className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ヘッダー：駅名表示とお気に入り */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-gray-900 text-white px-2 py-0.5 rounded leading-none dark:bg-gray-100 dark:text-gray-900">予測結果</span>
                    <h2 className="text-xl font-black text-[var(--foreground)] leading-none">
                        {depStation.name} → {arrStation.name}
                    </h2>
                </div>

                <div className="relative group">
                    <button
                        onClick={() => {
                            if (isFavorite(depStation.id, arrStation.id)) {
                                sendGAEvent('event', 'favorite_remove', { route: `${depStation.name}-${arrStation.name}` });
                                removeFavorite(`${depStation.id}-${arrStation.id}`);
                            } else {
                                sendGAEvent('event', 'favorite_add', { route: `${depStation.name}-${arrStation.name}` });
                                addFavorite(depStation.id, arrStation.id, depStation.name, arrStation.name);
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${isFavorite(depStation.id, arrStation.id)
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <Star className={`w-3.5 h-3.5 ${isFavorite(depStation.id, arrStation.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        {isFavorite(depStation.id, arrStation.id) ? '登録済み' : 'お気に入り登録'}
                    </button>
                    {/* P3-1: オンボーディング — 未登録時のみツールチップ表示 */}
                    {!isFavorite(depStation.id, arrStation.id) && (
                        <div className="absolute -bottom-8 right-0 bg-gray-900 text-white text-[11px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            ★ このルートを保存して次回ワンタップ検索
                        </div>
                    )}
                </div>
            </div>


            {/* 予測カード */}
            <PredictionResultCard
                result={prediction}
                route={route}
            />

            {/* 免責注記 */}
            <div className="flex items-start gap-1.5 justify-center -mt-3 mb-1 px-2">
                <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                    {prediction.isOfficialOverride
                        ? '※ JR北海道の公式情報に基づくAI予測です。'
                        : '※ 本予測はAIによる予測であり、JR北海道の公式情報ではありません。'}
                    最新の運行情報は
                    <a
                        href="https://www.jrhokkaido.co.jp/train/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-[var(--primary)] hover:opacity-80 ml-0.5 font-medium"
                    >
                        JR北海道公式サイト
                    </a>
                    をご確認ください。
                </p>
            </div>

            {/* P1-3: SNSシェア — 結果直後に配置して感情的なシェアを促進 */}
            <ShareCard
                prediction={prediction}
                routeName={route.name}
                departureStation={depStation.name}
                arrivalStation={arrStation.name}
            />

            {/* ユーザー報告（当日のみ）— 予測直後に配置して報告を促進 */}
            {isToday && (
                <ReportButtons
                    routeId={selectedRouteId}
                    routeName={route.name}
                    onReport={handleReport}
                    counts={realtimeStatus?.last15minCounts}
                />
            )}

            {/* 代替ルート提案: アクションに直結する情報 */}
            {(prediction.probability >= 30 || prediction.isPartialSuspension) && (
                <AlternativeRoutes
                    originalRoute={route}
                    predictionResult={prediction}
                    departureStation={depStation}
                    arrivalStation={arrStation}
                    timeShiftSuggestion={timeShiftSuggestion}
                    futureRisks={riskTrend || undefined}
                    onSelect={() => { }}
                />
            )}

            {/* 時間帯別リスク推移 */}
            {riskTrend && riskTrend.length > 0 && (
                <HourlyRiskChart data={riskTrend} />
            )}

            {/* 週間予測 */}
            {weeklyPredictions.length > 0 && (
                <WeeklyForecastChart
                    predictions={weeklyPredictions}
                    weather={weather}
                />
            )}

            {/* P2-3: 宿泊提案 — リスク70%以上のみ表示（通勤者にはノイズを減らす） */}
            {(prediction.probability >= 70 || prediction.isPartialSuspension) && (
                <HotelSuggestions
                    hotels={getHotelsForStation(arrStation.id)}
                    arrivalStationName={arrStation.name}
                />
            )}
        </section>
    );
}
