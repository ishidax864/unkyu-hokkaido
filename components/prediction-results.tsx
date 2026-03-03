'use client';

import { PredictionResult, HourlyRiskData, WeatherForecast, PredictionInput, TimeShiftSuggestion, JRStatus } from '@/lib/types';
import { Station, getRouteById } from '@/lib/hokkaido-data';
import { getHotelsForStation } from '@/lib/hotel-data';
import { PredictionResultCard } from './prediction-result';
import { ShareCard } from './share-card';
import { HourlyRiskChart } from './hourly-risk-chart';
import { ReportButtons } from './report-buttons';
import { Star, ArrowUp } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';
import { useTranslation } from '@/lib/i18n';
import dynamic from 'next/dynamic';

// 遅延ロード: 検索結果表示後にしか使わないコンポーネント
const AlternativeRoutes = dynamic(() => import('./alternative-routes').then(m => m.AlternativeRoutes), { ssr: false });
const HotelSuggestions = dynamic(() => import('./hotel-suggestions').then(m => m.HotelSuggestions), { ssr: false });
const WeeklyForecastChart = dynamic(() => import('./weekly-forecast').then(m => m.WeeklyForecastChart), { ssr: false });
const TimetableView = dynamic(() => import('./timetable-view').then(m => m.TimetableView), { ssr: false });

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
    handleReport: (type: 'stopped' | 'delayed' | 'crowded' | 'normal', comment?: string, trainId?: string) => void;
    isFavorite: (depId: string, arrId: string) => boolean;
    addFavorite: (depId: string, arrId: string, depName: string, arrName: string) => void;
    removeFavorite: (id: string) => void;
}

export function PredictionResults({
    prediction,
    selectedRouteId,
    date,
    time: _time,
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
    const { t } = useTranslation();
    if (!selectedRouteId) return null;
    const route = getRouteById(selectedRouteId);

    if (!route || !depStation || !arrStation) return null;

    return (
        <section className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ヘッダー：駅名表示とお気に入り */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-[var(--primary)] text-white px-2 py-0.5 rounded-md leading-none">予測結果</span>
                    <h2 className="text-[19px] font-bold text-[var(--foreground)] leading-none tracking-tight">
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-sm ${isFavorite(depStation.id, arrStation.id)
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--background-secondary)]'
                            }`}
                    >
                        <Star className={`w-3.5 h-3.5 ${isFavorite(depStation.id, arrStation.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        {isFavorite(depStation.id, arrStation.id) ? '登録済み' : 'お気に入り登録'}
                    </button>
                    {/* P3-1: オンボーディング — 未登録時のみツールチップ表示 */}
                    {!isFavorite(depStation.id, arrStation.id) && (
                        <div className="absolute -bottom-8 right-0 bg-[var(--foreground)] text-[var(--card)] text-[11px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            ★ このルートを保存して次回ワンタップ検索
                        </div>
                    )}
                </div>
            </div>


            {/* 予測カード */}
            <PredictionResultCard
                result={prediction}
                route={route}
                isFuture={!isToday}
            />

            {/* 時刻表 (MVP: 千歳線のみ) */}
            {selectedRouteId.includes('chitose') && (() => {
                const routeStatus: JRStatus = prediction.isCurrentlySuspended ? 'suspended'
                    : prediction.isPartialSuspension ? 'partial'
                        : prediction.probability >= 80 ? 'suspended'
                            : prediction.probability >= 40 ? 'delay'
                                : 'normal';
                return (
                    <TimetableView
                        routeStatus={routeStatus}
                        rawStatusText={prediction.partialSuspensionText}
                        isFuture={!isToday}
                        onTrainReport={isToday ? (trainId, type) => handleReport(type, undefined, trainId) : undefined}
                    />
                );
            })()}

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

            {/* UX5: Check another route CTA */}
            <div className="text-center pt-8 mt-2">
                <button
                    type="button"
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[var(--primary)] text-[var(--primary)] font-bold text-sm hover:bg-[var(--primary)] hover:text-white transition-all"
                >
                    <ArrowUp className="w-4 h-4" />
                    {t('results.searchAgain')}
                </button>
            </div>
        </section>
    );
}
