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
    time, // 🆕
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
                    <span className="text-xs font-black bg-gray-900 text-white px-2 py-0.5 rounded leading-none">RESULT</span>
                    <h2 className="text-xl font-black text-gray-900 leading-none">
                        {depStation.name} → {arrStation.name}
                    </h2>
                </div>

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
            </div>


            {/* 予測カード */}
            <PredictionResultCard
                result={prediction}
                route={route}
            />

            {/* SNSシェア */}
            <ShareCard
                prediction={prediction}
                routeName={route.name}
                departureStation={depStation.name}
                arrivalStation={arrStation.name}
            />

            {/* 状況報告（当日のみ） */}
            {isToday && (
                <ReportButtons
                    routeId={selectedRouteId}
                    routeName={route.name}
                    onReport={handleReport}
                    counts={realtimeStatus?.last15minCounts}
                />
            )}


            {/* 代替ルート提案: リスク30%以上または部分運休時 */}
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

            {/* 宿泊提案: リスク30%以上または部分運休時 */}
            {(prediction.probability >= 30 || prediction.isPartialSuspension) && (
                <HotelSuggestions
                    hotels={getHotelsForStation(arrStation.id)}
                    arrivalStationName={arrStation.name}
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
        </section>
    );
}
