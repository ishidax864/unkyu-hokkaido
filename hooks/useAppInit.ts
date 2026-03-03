import { useState, useEffect } from 'react';
import { fetchDailyWeatherForecast, fetchAllHokkaidoWarnings, findNearestWeatherPoint } from '@/lib/weather';
import { WeatherForecast, WeatherWarning, JRStatusItem, JRStatusResponse } from '@/lib/types';
import { logger } from '@/lib/logger';

interface AppInitState {
    weather: WeatherForecast[];
    warnings: Array<{ area: string; warnings: WeatherWarning[] }>;
    currentTime: string;
    isWeatherLoading: boolean;
    lastWeatherUpdate: string;
    locationName: string;
    userLocation: { lat: number; lon: number } | undefined;
    jrStatus: JRStatusItem[]; //
}

export function useAppInit() {
    const [state, setState] = useState<AppInitState>({
        weather: [],
        warnings: [],
        currentTime: '',
        isWeatherLoading: true,
        lastWeatherUpdate: '',
        locationName: '札幌',
        userLocation: undefined,
        jrStatus: [], //
    });

    // Time Update
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setState(prev => ({
                ...prev,
                currentTime: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
            }));
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    // Data Loading (Weather, Warnings, Geolocation)
    useEffect(() => {
        const loadData = async () => {
            setState(prev => ({ ...prev, isWeatherLoading: true }));

            // 1. Geolocation（短縮タイムアウト: 2秒）
            let currentCoords: { lat: number; lon: number } | undefined = undefined;
            let currentLocationName = '札幌';

            try {
                if (navigator.geolocation) {
                    await new Promise<void>((resolve) => {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                currentCoords = {
                                    lat: position.coords.latitude,
                                    lon: position.coords.longitude
                                };
                                const nearest = findNearestWeatherPoint(currentCoords.lat, currentCoords.lon);
                                currentLocationName = nearest.name;
                                resolve();
                            },
                            (err) => {
                                logger.warn('Geolocation denied/error', { error: err });
                                resolve();
                            },
                            { timeout: 2000 }
                        );
                    });
                }
            } catch (e) {
                logger.error('Geolocation setup failed', e);
            }

            // 2. Weather, Warnings, JR Status を並列実行
            const [weatherResult, warningsResult, jrResult] = await Promise.allSettled([
                fetchDailyWeatherForecast(undefined, currentCoords),
                fetchAllHokkaidoWarnings(),
                fetch('/api/jr-status').then(res => res.ok ? res.json() as Promise<JRStatusResponse> : null),
            ]);

            const realWeather = weatherResult.status === 'fulfilled' ? weatherResult.value : [];
            const updateTime = weatherResult.status === 'fulfilled'
                ? new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                : '';
            const allWarnings = warningsResult.status === 'fulfilled' ? warningsResult.value : [];
            const allJrStatus = jrResult.status === 'fulfilled' && jrResult.value
                ? (jrResult.value as JRStatusResponse).items : [];

            if (weatherResult.status === 'rejected') logger.error('Weather fetch failed', weatherResult.reason);
            if (warningsResult.status === 'rejected') logger.error('Warning fetch failed', warningsResult.reason);
            if (jrResult.status === 'rejected') logger.error('JR Status fetch failed', jrResult.reason);

            setState(prev => ({
                ...prev,
                userLocation: currentCoords,
                locationName: currentLocationName,
                weather: realWeather,
                lastWeatherUpdate: updateTime,
                warnings: allWarnings,
                jrStatus: allJrStatus,
                isWeatherLoading: false
            }));
        };

        loadData();
        const interval = setInterval(loadData, 30 * 60 * 1000); // 30 mins
        return () => clearInterval(interval);
    }, []);

    return state;
}
