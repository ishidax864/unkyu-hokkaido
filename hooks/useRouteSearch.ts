
import { useState } from 'react';
import { Station, getRouteById, getStationById, getCommonLines, getConnectingRoute } from '@/lib/hokkaido-data';
import { PredictionResult, WeatherForecast, HourlyRiskData } from '@/lib/types';
import { findTrain } from '@/lib/timetable-data';
import { fetchRealWeatherForecast, fetchHourlyWeatherForecast } from '@/lib/weather';
import { JROperationStatus } from '@/lib/jr-status';
import { aggregateCrowdsourcedStatus } from '@/lib/user-reports';
import { calculateSuspensionRisk, calculateWeeklyForecast } from '@/lib/prediction-engine';

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
    const [realtimeStatus, setRealtimeStatus] = useState<any | null>(null);

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
            console.error('Hourly weather fetch failed', error);
        }

        try {
            weeklyWeather = await fetchRealWeatherForecast(routeId);
        } catch (error) {
            console.error('Weekly weather fetch failed', error);
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
                const data = await response.json();
                const routeName = primaryRoute?.name || '';
                let matchingStatus = data.items.find((item: any) =>
                    item.routeName === routeName || routeName.includes(item.routeName)
                );
                if (!matchingStatus) {
                    matchingStatus = data.items.find((item: any) => item.routeName === 'JR北海道');
                }
                if (isToday && data.hasAlerts && matchingStatus && matchingStatus.status !== 'normal') {
                    jrStatus = {
                        routeId: routeId,
                        routeName: primaryRoute?.name || matchingStatus.routeName,
                        status: matchingStatus.status === 'suspended' ? 'suspended' :
                            matchingStatus.status === 'delay' ? 'delay' : 'normal',
                        statusText: matchingStatus.description,
                        updatedAt: matchingStatus.updatedAt,
                    };
                }
            }
        } catch (error) {
            console.error('JR Status fetch failed', error);
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
                console.warn('Historical data fetch failed', e);
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
        if (result.probability >= 30) {
            // ... (Logic for time shift suggestion - Simplified for now or copied)
            // I will copy the logic in separate steps if needed, but for now I'll include the core logic.
            // Actually, logic is complex. I should extract `generateTimeShiftSuggestions` to a helper if possible?
            // Or just keep it here.

            // Re-implementing Time Shift Logic here:
            const currentHour = parseInt(targetTimeStr.split(':')[0]);
            const surroundingHours = [-2, -1, 1, 2];
            let bestShift = null;
            const trendData: HourlyRiskData[] = [];

            for (let offset = -2; offset <= 2; offset++) {
                const h = currentHour + offset;
                if (h < 0 || h > 23) continue;
                const hStr = h.toString().padStart(2, '0');
                const checkTime = `${hStr}:00`;
                const checkDateTime = `${searchDate}T${checkTime}:00`;

                let w: WeatherForecast | null = null;
                try {
                    w = await fetchHourlyWeatherForecast(routeId, checkDateTime);
                } catch { }

                // Simple risk calc for trend
                const r = calculateSuspensionRisk({
                    weather: w,
                    routeId,
                    routeName: primaryRoute?.name || '',
                    targetDate: searchDate,
                    targetTime: checkTime,
                    historicalData,
                    jrStatus: offset === 0 ? jrStatus : null, // Only apply current status to current? Or all? Usually current.
                    crowdsourcedStatus: offset === 0 ? crowdsourcedStatus : null
                });

                trendData.push({
                    time: checkTime,
                    risk: r.probability,
                    weatherIcon: w ? (w.snowfall && w.snowfall > 0 ? 'snow' : w.windSpeed > 10 ? 'wind' : 'cloud') : 'cloud',
                    isTarget: offset === 0,
                    isCurrent: offset === 0
                });

                if (offset !== 0) {
                    const diff = result.probability - r.probability;
                    if (diff >= 20) {
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
        } else {
            setRiskTrend([]);
            setTimeShiftSuggestion(null);
        }

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
