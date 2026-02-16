
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

                if (isToday && matchingStatus) {
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
        const crowdsourcedStatus = isToday && routeId ? aggregateCrowdsourcedStatus(routeId) : null;

        // 🆕 過去30日の運休履歴を取得（Phase 1実装）
        let historicalData = null;
        if (routeId) {
            try {
                // Dynamic import to avoid server-side module issues if any, though here it's client side code
                const { getHistoricalSuspensionRate } = await import('@/lib/supabase');
                const result = await getHistoricalSuspensionRate(routeId);
                if (result.success && result.data) {
                    historicalData = result.data;
                }
            } catch (e) {
                logger.warn('Historical data fetch failed', { error: e });
            }
        }

        // ML Prediction (Server-side)
        let finalPrediction: PredictionResult | null = null;

        try {
            const apiRes = await fetch('/api/prediction/v2/route', {
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

                if (jrStatus) {
                    // Overlay JR Status info (Realtime override)
                    if (jrStatus.status === 'suspended' || jrStatus.status === 'cancelled') {
                        mlResult.probability = 100;
                        mlResult.level = 'high';
                        mlResult.status = 'suspended';
                        mlResult.reasons.unshift(`【公式発表】${jrStatus.statusText}`);
                        mlResult.isOfficialOverride = true;
                    } else if (jrStatus.status === 'delay') {
                        if (mlResult.probability < 50) mlResult.probability = 50;
                        mlResult.level = mlResult.probability >= 70 ? 'high' : 'medium';
                        mlResult.status = 'delayed';
                        mlResult.reasons.unshift(`【公式発表】${jrStatus.statusText}`);
                    }
                }

                setPrediction(mlResult);
                finalPrediction = mlResult;

                // APIからトレンドデータが返ってきている場合はそれを使用
                if (mlResult.trend) {
                    setRiskTrend(mlResult.trend);
                    // Need to also compute bestShift from ML trend if possible, or skip for now
                }
            } else {
                // Fallback to local calculation if API fails
                logger.error('ML API failed, falling back to local');
                const result = calculateSuspensionRisk({
                    weather: targetWeather,
                    routeId: routeId,
                    routeName: primaryRoute?.name || '',
                    targetDate: searchDate,
                    targetTime: targetTimeStr,
                    historicalData,
                    jrStatus,
                    crowdsourcedStatus,
                    timetableTrain: timetableTrain || undefined
                });
                setPrediction(result);
                finalPrediction = result;
            }
        } catch (e) {
            logger.error('ML API error', e);
            // Fallback
            const result = calculateSuspensionRisk({
                weather: targetWeather,
                routeId: routeId,
                routeName: primaryRoute?.name || '',
                targetDate: searchDate,
                targetTime: targetTimeStr,
                historicalData,
                jrStatus,
                crowdsourcedStatus,
                timetableTrain: timetableTrain || undefined
            });
            setPrediction(result);
            finalPrediction = result;
        }

        // 🆕 Always set realtime status for UI display (badges), regardless of search date
        if (routeId) {
            const rtStatus = aggregateCrowdsourcedStatus(routeId);
            setRealtimeStatus(rtStatus);
        } else {
            setRealtimeStatus(null);
        }

        // Helper: Weekly Calculation
        if (weeklyWeather.length > 0) {
            setWeeklyPredictions(calculateWeeklyForecast(
                routeId,
                primaryRoute?.name || '',
                weeklyWeather,
                jrStatus,
                crowdsourcedStatus
            ));
        }

        // Helper: Time Shift & Risk Trend
        // 🆕 終日運休等の場合は時間変更提案をしない
        const isAllDaySuspension = finalPrediction ? (finalPrediction.estimatedRecoveryTime === '終日運休' || finalPrediction.isOfficialOverride) : false;

        // Calculate risk trend using surroundingHours from the main weather fetch
        // (already fetched from correct station-midpoint coordinates)
        let trendData: HourlyRiskData[] = (finalPrediction as any)?.trend || [];
        let bestShift: {
            time: string;
            risk: number;
            difference: number;
            isEarlier: boolean;
        } | null = null;

        const currentHour = parseInt(targetTimeStr.split(':')[0]);

        // APIからトレンドデータが取れなかった場合のみ、ローカルで計算（フォールバック）
        if (trendData.length === 0) {
            const surroundingWeather = targetWeather?.surroundingHours || [];

            for (let offset = -2; offset <= 2; offset++) {
                const h = currentHour + offset;
                if (h < 0 || h > 23) continue;

                const hStr = h.toString().padStart(2, '0');
                const checkTime = `${hStr}:00`;

                let hourRisk: number;
                let hourWeather: WeatherForecast | null = null;

                if (offset === 0) {
                    hourRisk = finalPrediction?.probability ?? 0;
                    hourWeather = targetWeather;
                } else {
                    hourWeather = surroundingWeather.find(sw => {
                        const swHour = sw.targetTime ? parseInt(sw.targetTime.split(':')[0]) : -1;
                        return swHour === h;
                    }) || null;

                    if (hourWeather) {
                        const r = calculateSuspensionRisk({
                            weather: hourWeather,
                            routeId,
                            routeName: primaryRoute?.name || '',
                            targetDate: searchDate,
                            targetTime: checkTime,
                            historicalData: null,
                            jrStatus: null,
                            crowdsourcedStatus: null,
                            timetableTrain: undefined
                        });
                        hourRisk = r.probability;
                    } else {
                        continue;
                    }
                }

                // Determine icon
                const displayWeather = offset === 0 ? targetWeather : hourWeather;
                let icon: HourlyRiskData['weatherIcon'] = 'cloud';
                if (displayWeather) {
                    if ((displayWeather.snowfall ?? 0) > 0) icon = 'snow';
                    else if (displayWeather.precipitation && displayWeather.precipitation > 0) icon = 'rain';
                    else if (displayWeather.windSpeed >= 15) icon = 'wind';
                    else if (displayWeather.weather.includes('晴')) icon = 'sun';
                }

                trendData.push({
                    time: checkTime,
                    risk: hourRisk,
                    weatherIcon: icon,
                    isTarget: offset === 0,
                    isCurrent: offset === 0
                });
            }
        }

        // Calculate best shift based on trendData (common for both API/local)
        if (finalPrediction && finalPrediction.probability >= 30 && !isAllDaySuspension) {
            trendData.forEach(td => {
                const h = parseInt(td.time.split(':')[0]);
                if (h === currentHour) return;

                const diff = finalPrediction!.probability - td.risk;
                const isPast = isToday && (h < new Date().getHours());

                if (diff >= 20 && !isPast) {
                    if (!bestShift || diff > bestShift.difference) {
                        bestShift = {
                            time: td.time,
                            risk: td.risk,
                            difference: diff,
                            isEarlier: h < currentHour
                        };
                    }
                }
            });
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
