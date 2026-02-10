
import { useState } from 'react';
import { Station, getRouteById, getStationById, getCommonLines, getConnectingRoute } from '@/lib/hokkaido-data';
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
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [time, setTime] = useState('08:00');
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

        try {
            targetWeather = await fetchHourlyWeatherForecast(routeId, targetDateTime);
        } catch (error) {
            logger.error('Hourly weather fetch failed', error);
        }

        try {
            weeklyWeather = await fetchRealWeatherForecast(routeId);
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

                if (isToday && data.hasAlerts && matchingStatus && matchingStatus.status !== 'normal') {
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

        // Calculate Risk
        const result = calculateSuspensionRisk({
            weather: targetWeather,
            routeId: routeId,
            routeName: primaryRoute?.name || '',
            targetDate: searchDate,
            targetTime: targetTimeStr, // Use timetable departure time
            historicalData,
            jrStatus,
            crowdsourcedStatus, // Logic uses this for RISK calculation (only if isToday)
            timetableTrain: timetableTrain || undefined
        });

        setPrediction(result);

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
        const isAllDaySuspension = result.estimatedRecoveryTime === '終日運休' || result.isOfficialOverride;

        // Calculate risk trend always
        const trendData: HourlyRiskData[] = [];
        let bestShift = null; // Initialize bestShift

        const currentHour = parseInt(targetTimeStr.split(':')[0]);

        for (let offset = -2; offset <= 2; offset++) {
            const h = currentHour + offset;
            if (h < 0 || h > 23) continue;

            // Format time string HH:00
            const hStr = h.toString().padStart(2, '0');
            const checkTime = `${hStr}:00`;
            const checkDateTime = `${searchDate}T${checkTime}:00`; // Assuming 00 minutes for trend

            let trendWeather: WeatherForecast | null = null;
            try {
                // Fetch weather for this hour
                // Note: fetchHourlyWeatherForecast might be async, ensure we await or handle
                // In this scope, we can await inside loop if it's async
                trendWeather = await fetchHourlyWeatherForecast(routeId, checkDateTime);
            } catch { }

            // Calculate risk for this hour
            const r = calculateSuspensionRisk({
                weather: trendWeather,
                routeId,
                routeName: primaryRoute?.name || '',
                targetDate: searchDate,
                targetTime: checkTime,
                historicalData: null, // Don't use historical data for trend to keep it simple/fast? Or use it?
                // Using null for historical/jr/crowd for trend to reflect WEATHER trend primarily
                jrStatus: offset === 0 ? jrStatus : null,
                crowdsourcedStatus: offset === 0 ? crowdsourcedStatus : null,
                timetableTrain: undefined // Don't verify timetable for every hour in trend
            });

            // Determine icon
            let icon: HourlyRiskData['weatherIcon'] = 'cloud';
            if (trendWeather) {
                if ((trendWeather.snowfall ?? 0) > 0) icon = 'snow';
                else if (trendWeather.precipitation && trendWeather.precipitation > 0) icon = 'rain';
                else if (trendWeather.windSpeed >= 15) icon = 'wind';
                else if (trendWeather.weather.includes('晴')) icon = 'sun';
            }

            trendData.push({
                time: checkTime,
                risk: r.probability,
                weatherIcon: icon,
                isTarget: offset === 0,
                isCurrent: offset === 0
            });

            // Calculate best shift if high risk
            if (result.probability >= 30 && !isAllDaySuspension && offset !== 0) {
                const diff = result.probability - r.probability;
                // 🆕 過去の時間は提案しない (Simple check)
                const isPast = isToday && (h < new Date().getHours());

                if (diff >= 20 && !isPast) {
                    if (!bestShift || diff > bestShift.difference) {
                        bestShift = {
                            time: checkTime,
                            risk: r.probability,
                            difference: diff,
                            isEarlier: offset < 0
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
