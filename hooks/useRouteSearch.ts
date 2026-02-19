
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

        // Weather Fetching
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

        try {
            targetWeather = await fetchHourlyWeatherForecast(routeId, targetDateTime, stationCoordinates);
        } catch (error) {
            logger.error('Hourly weather fetch failed', error);
        }

        try {
            weeklyWeather = await fetchRealWeatherForecast(routeId, stationCoordinates);
        } catch (error) {
            logger.error('Weekly weather fetch failed', error);
        }

        // JR Status
        let jrStatus: JROperationStatus | null = null;
        // Fix: Use Local Time for isToday check
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isToday = searchDate === todayStr;

        try {
            const response = await fetch('/api/jr-status');
            if (response.ok) {
                const data: JRStatusResponse & { hasAlerts?: boolean } = await response.json();
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
                        status: matchingStatus.status, // type mismatch handled in calculation
                        statusText: matchingStatus.description,
                        updatedAt: matchingStatus.updatedAt,
                        rawText: matchingStatus.rawText, // 🆕
                    };
                }
            }
        } catch (error) {
            logger.error('JR Status fetch failed', error);
        }

        // Crowdsourced Status
        // 🆕 週間予測の「今日」の行のために、本日でなくても取得する（ただし計算に使用するのは1行目のみ）
        const rtStatus = routeId ? aggregateCrowdsourcedStatus(routeId) : null;
        setRealtimeStatus(rtStatus);

        // 検索日が今日の場合のみ、メインの計算用にStatusを使用する
        const currentCrowdsourcedStatus = isToday ? rtStatus : null;

        // 🆕 過去30日の運休履歴、および公的ステータス履歴を取得
        let historicalData = null;
        let officialHistory = null;
        if (routeId) {
            try {
                // Dynamic import to avoid server-side module issues
                const { getHistoricalSuspensionRate, getOfficialRouteHistory } = await import('@/lib/supabase');

                // 1. ユーザー報告ベースの統計
                const historyResult = await getHistoricalSuspensionRate(routeId);
                if (historyResult.success && historyResult.data) {
                    historicalData = historyResult.data;
                }

                // 2. 🆕 クローラーベースの公的履歴（直近24時間）
                const officialRes = await getOfficialRouteHistory(routeId, 24);
                if (officialRes.success && officialRes.data) {
                    officialHistory = officialRes.data;
                }
            } catch (e) {
                logger.warn('History data fetch failed', { error: e });
            }
        }

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
                const mlResult: PredictionResult & { trend?: HourlyRiskData[] } = await apiRes.json();

                // 検索日が今日の場合のみ、公式情報をメイン結果に上書きする
                if (isToday && jrStatus) {
                    // Overlay JR Status info (Realtime override)
                    if (jrStatus.status === 'suspended' || jrStatus.status === 'cancelled') {
                        mlResult.probability = 100;
                        mlResult.level = 'high';
                        mlResult.status = 'suspended';
                        mlResult.reasons.unshift(`【公式発表】${jrStatus.statusText}`);
                        mlResult.isOfficialOverride = true;
                    } else if (jrStatus.status === 'delay') {
                        if (mlResult.probability < 80) mlResult.probability = 80;
                        mlResult.level = 'high';
                        mlResult.status = 'delayed';
                        mlResult.reasons.unshift(`【公式発表】${jrStatus.statusText}`);
                    }
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
            const result = calculateSuspensionRisk({
                weather: targetWeather,
                routeId: routeId,
                routeName: primaryRoute?.name || '',
                targetDate: searchDate,
                targetTime: targetTimeStr,
                historicalData,
                officialHistory,
                jrStatus: isToday ? jrStatus : null, // メイン結果には「検索日が今日」の時のみ反映
                crowdsourcedStatus: currentCrowdsourcedStatus,
                timetableTrain: timetableTrain || undefined
            });
            setPrediction(result);
            finalPrediction = result;

            // Fallback Trend Gen (Simplified)
            // ... (We could add fallback trend gen here if needed, but keeping it simple for now)
        }

        // Helper: Weekly Calculation
        // 週間予測用。ここでは jrStatus が今日のものであるため、calculateWeeklyForecast 側で正しく「今日」の行に適用される
        if (weeklyWeather.length > 0) {
            setWeeklyPredictions(calculateWeeklyForecast(
                routeId,
                primaryRoute?.name || '',
                weeklyWeather,
                jrStatus,
                rtStatus,
                historicalData,
                officialHistory
            ));
        }

        // Helper: Time Shift & Risk Trend
        // 🆕 終日運休等の場合は時間変更提案をしない
        const isAllDaySuspension = finalPrediction ? (finalPrediction.estimatedRecoveryTime === '終日運休' || finalPrediction.isOfficialOverride) : false;

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
                            difference: diff * 60, // minutes (rough)
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
