
import { useState } from 'react';
import { Station, getStationById, getCommonLines, getConnectingRoute } from '@/lib/hokkaido-data';
import { PredictionResult, WeatherForecast, HourlyRiskData } from '@/lib/types';
import { findTrain } from '@/lib/timetable-data';
import { fetchRealWeatherForecast, fetchHourlyWeatherForecast } from '@/lib/weather';
import { JROperationStatus } from '@/lib/jr-status';
import { aggregateCrowdsourcedStatus } from '@/lib/user-reports';
import { calculateSuspensionRisk, calculateWeeklyForecast } from '@/lib/prediction-engine';
import { logger } from '@/lib/logger';
import { JRStatusItem, JRStatusResponse, PredictionInput } from '@/lib/types';

export function useRouteSearch() {
    // Search Form State
    const [departureStation, setDepartureStation] = useState<Station | null>(null);
    const [arrivalStation, setArrivalStation] = useState<Station | null>(null);
    const [date, setDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [time, setTime] = useState(() => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    });
    const [timeType, setTimeType] = useState<'departure' | 'arrival'>('departure');

    // Search Result State
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [weeklyPredictions, setWeeklyPredictions] = useState<PredictionResult[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [timeShiftSuggestion, setTimeShiftSuggestion] = useState<{
        time: string;
        risk: number;
        difference: number;
        isEarlier: boolean;
    } | null>(null);
    const [riskTrend, setRiskTrend] = useState<HourlyRiskData[]>([]);
    // 🆕 Always hold real-time status
    const [realtimeStatus, setRealtimeStatus] = useState<PredictionInput['crowdsourcedStatus'] | null>(null);

    const handleSearch = async (
        departureId: string,
        arrivalId: string,
        searchDate: string,
        searchTime: string,
        type: 'departure' | 'arrival'
    ) => {
        setIsLoading(true);
        setSearchError(null);

        // Update local state if called directly (e.g. from Favorites)
        // Note: If this is called from SearchForm, state might already be updated, but this ensures consistency
        const depStation = getStationById(departureId);
        const arrStation = getStationById(arrivalId);
        setDepartureStation(depStation || null);
        setArrivalStation(arrStation || null);
        setDate(searchDate);
        setTime(searchTime);
        setTimeType(type);

        const commonLines = depStation && arrStation ? getCommonLines(depStation, arrStation) : [];
        let primaryRoute = commonLines[0] || null;

        // 🆕 直通路線がない場合、主要連絡ルート（コリドー）を検索
        if (!primaryRoute && depStation && arrStation) {
            const connectingRoute = getConnectingRoute(depStation, arrStation);
            if (connectingRoute) {
                primaryRoute = connectingRoute;
            }
        }
        const routeId = primaryRoute?.id || '';

        setSelectedRouteId(routeId);

        // Timeline Lookup
        let targetTimeStr = searchTime;
        let timetableTrain = null;

        if (departureId && arrivalId) {
            const trainResult = findTrain(departureId, arrivalId, searchTime, type);
            if (trainResult) {
                targetTimeStr = trainResult.departureTime;
                timetableTrain = trainResult.train;
            }
        }

        // Weather & JR Status Fetching — 並列化 (Promise.allSettled)
        const targetDateTime = `${searchDate}T${targetTimeStr}:00`;
        let targetWeather: WeatherForecast | null = null;
        let weeklyWeather: WeatherForecast[] = [];

        // 駅の座標から中間地点を計算（ルート代表座標より正確）
        const stationCoordinates = (depStation && arrStation && depStation.lat != null && depStation.lon != null && arrStation.lat != null && arrStation.lon != null)
            ? {
                lat: (depStation.lat + arrStation.lat) / 2,
                lon: (depStation.lon + arrStation.lon) / 2,
            }
            : undefined;

        // 3つの独立したAPI呼び出しを並列実行
        const [hourlyResult, weeklyResult, jrResult] = await Promise.allSettled([
            fetchHourlyWeatherForecast(routeId, targetDateTime, stationCoordinates),
            fetchRealWeatherForecast(routeId, stationCoordinates),
            fetch('/api/jr-status'),
        ]);

        if (hourlyResult.status === 'fulfilled') {
            targetWeather = hourlyResult.value;
        } else {
            logger.error('Hourly weather fetch failed', hourlyResult.reason);
        }

        if (weeklyResult.status === 'fulfilled') {
            weeklyWeather = weeklyResult.value;
        } else {
            logger.error('Weekly weather fetch failed', weeklyResult.reason);
        }

        // JR Status
        let jrStatus: JROperationStatus | null = null;
        // Fix: Use Local Time for isToday check
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isToday = searchDate === todayStr;

        if (jrResult.status === 'fulfilled' && jrResult.value.ok) {
            try {
                const data: JRStatusResponse & { hasAlerts?: boolean } = await jrResult.value.json();
                // Match by routeId first, then routeName as fallback
                let matchingStatus = data.items.find((item: JRStatusItem) =>
                    (item.routeId && item.routeId === routeId) ||
                    item.routeName === (primaryRoute?.name || '')
                );

                if (!matchingStatus) {
                    matchingStatus = data.items.find((item: JRStatusItem) => item.routeName === 'JR北海道');
                }

                if (matchingStatus) {
                    jrStatus = {
                        routeId: routeId,
                        routeName: primaryRoute?.name || matchingStatus.routeName,
                        status: matchingStatus.status,
                        statusText: matchingStatus.description,
                        updatedAt: matchingStatus.updatedAt,
                        rawText: matchingStatus.rawText,
                    };
                }
            } catch (error) {
                logger.error('JR Status parse failed', error);
            }
        } else if (jrResult.status === 'rejected') {
            logger.error('JR Status fetch failed', jrResult.reason);
        }

        // Crowdsourced Status
        // 🆕 週間予測の「今日」の行のために、本日でなくても取得する（ただし計算に使用するのは1行目のみ）
        const rtStatus = routeId ? aggregateCrowdsourcedStatus(routeId) : null;
        setRealtimeStatus(rtStatus);

        // 検索日が今日の場合のみ、メインの計算用にStatusを使用する
        const currentCrowdsourcedStatus = isToday ? rtStatus : null;

        // 🆕 過去30日の運休履歴、および公的ステータス履歴は v2 API がサーバー側で取得済み
        // クライアント側での冗長な取得を廃止
        let historicalData: PredictionInput['historicalData'] = null;
        let officialHistory: PredictionInput['officialHistory'] = null;

        // ML Prediction (Server-side)
        // Now authorizes the server as the single source of truth for both Main Result and Trend.
        let finalPrediction: PredictionResult | null = null;
        let trendData: HourlyRiskData[] = [];

        try {
            const apiRes = await fetch('/api/prediction/v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    routeId,
                    date: searchDate,
                    time: targetTimeStr,
                    lat: stationCoordinates?.lat,
                    lon: stationCoordinates?.lon
                })
            });

            if (apiRes.ok) {
                const mlResult: PredictionResult & { trend?: HourlyRiskData[]; _serverData?: Record<string, unknown> } = await apiRes.json();

                // 🆕 サーバーから取得した enriched data を利用
                if (mlResult._serverData) {
                    historicalData = mlResult._serverData.historicalData as PredictionInput['historicalData'];
                    officialHistory = mlResult._serverData.officialHistory as PredictionInput['officialHistory'];
                    // crowdsourcedStatus is already included in the main prediction
                }

                setPrediction(mlResult);
                finalPrediction = mlResult;

                // Use Server-Side Trend
                if (mlResult.trend) {
                    trendData = mlResult.trend;
                }
            } else {
                throw new Error('API Error');
            }
        } catch (e) {
            logger.error('ML API error', e);
            // Fallback (Local Calc)
            try {
                const result = calculateSuspensionRisk({
                    weather: targetWeather,
                    routeId: routeId,
                    routeName: primaryRoute?.name || '',
                    targetDate: searchDate,
                    targetTime: targetTimeStr,
                    jrStatus: isToday ? jrStatus : null,
                    crowdsourcedStatus: currentCrowdsourcedStatus,
                    timetableTrain: timetableTrain || undefined,
                    officialHistory: officialHistory
                });
                setPrediction(result);
                finalPrediction = result;
            } catch (fallbackError) {
                logger.error('Fallback calc also failed', fallbackError);
                setSearchError('予測の取得に失敗しました。しばらくしてから再度お試しください。');
            }
        }

        // Helper: Weekly Calculation
        // 🆕 API v2のofficialStatus（サーバー側で取得）を優先使用
        // サーバー側はSupabaseのエリア広域チェックを含むため、より正確に周辺路線の影響を検出する
        if (weeklyWeather.length > 0) {
            const weeklyJrStatus = finalPrediction?.officialStatus
                ? {
                    routeId: routeId,
                    routeName: finalPrediction.officialStatus.statusText || primaryRoute?.name || '',
                    status: finalPrediction.officialStatus.status,
                    statusText: finalPrediction.officialStatus.statusText || '',
                    updatedAt: finalPrediction.officialStatus.updatedAt || '',
                    rawText: finalPrediction.officialStatus.rawText,
                }
                : jrStatus;
            setWeeklyPredictions(calculateWeeklyForecast(
                routeId,
                primaryRoute?.name || '',
                weeklyWeather,
                weeklyJrStatus,
                rtStatus,
                historicalData,
                officialHistory
            ));
        }

        // Helper: Time Shift & Risk Trend
        const currentHour = parseInt(targetTimeStr.split(':')[0]);
        let bestShift: {
            time: string;
            risk: number;
            difference: number;
            isEarlier: boolean;
        } | null = null;

        // If API didn't return trend (or fallback used), use empty or calculate locally
        if (trendData.length === 0) {
            // Fallback Trend Gen Logic (Simplified for now - can be expanded if robust fallback needed)
            // For now, trusting API primarily.
        }

        // 🆕 Recalculate Best Shift based on the NEW trend data
        // Filter out high risk options effectively
        if (trendData.length > 0) {
            const currentRisk = finalPrediction?.probability ?? 0;
            // Find lowest risk in future
            const futureOptions = trendData.filter(d => {
                const h = parseInt(d.time.split(':')[0]);
                const currentH = parseInt(targetTimeStr.split(':')[0]);
                return h > currentH; // Only future
            });

            if (futureOptions.length > 0) {
                // Find minimum risk
                const minRisk = Math.min(...futureOptions.map(o => o.risk));

                // Only suggest if significantly better and safe enough (<50%)
                if (minRisk < 50 && (currentRisk - minRisk >= 20)) {
                    const bestOption = futureOptions.find(o => o.risk === minRisk);
                    if (bestOption) {
                        const diff = parseInt(bestOption.time.split(':')[0]) - currentHour;
                        bestShift = {
                            time: bestOption.time,
                            risk: bestOption.risk,
                            difference: currentRisk - bestOption.risk, // リスク差分（％ポイント）
                            isEarlier: false
                        };
                    }
                }
            }
        }


        setRiskTrend(trendData);
        setTimeShiftSuggestion(bestShift);

        setIsLoading(false);
    };

    const refreshRealtimeStatus = () => {
        if (selectedRouteId) {
            const rtStatus = aggregateCrowdsourcedStatus(selectedRouteId);
            setRealtimeStatus(rtStatus);
        }
    };

    return {
        departureStation, setDepartureStation,
        arrivalStation, setArrivalStation,
        date, setDate,
        time, setTime,
        timeType, setTimeType,
        isLoading,
        searchError, // 🆕
        prediction,
        weeklyPredictions,
        selectedRouteId,
        timeShiftSuggestion,
        riskTrend,
        realtimeStatus,
        handleSearch,
        refreshRealtimeStatus // 🆕
    };
}
