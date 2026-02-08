import { useState, useEffect } from 'react';
import { fetchDailyWeatherForecast, fetchAllHokkaidoWarnings, findNearestWeatherPoint } from '@/lib/weather';
import { WeatherForecast, WeatherWarning } from '@/lib/types';
import { logger } from '@/lib/logger';

interface AppInitState {
    weather: WeatherForecast[];
    warnings: Array<{ area: string; warnings: WeatherWarning[] }>;
    currentTime: string;
    isWeatherLoading: boolean;
    lastWeatherUpdate: string;
    locationName: string;
    userLocation: { lat: number; lon: number } | undefined;
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

            // 1. Geolocation
            let currentCoords: { lat: number; lon: number } | undefined = undefined;
            let currentLocationName = '札幌'; // Default

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
                                resolve(); // Continue with default
                            },
                            { timeout: 5000 }
                        );
                    });
                }
            } catch (e) {
                logger.error('Geolocation setup failed', e);
            }

            // 2. Weather
            let realWeather: WeatherForecast[] = [];
            let updateTime = '';
            try {
                realWeather = await fetchDailyWeatherForecast(undefined, currentCoords);
                updateTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            } catch (error) {
                logger.error('Weather fetch failed', error);
            }

            // 3. Warnings
            let allWarnings: Array<{ area: string; warnings: WeatherWarning[] }> = [];
            try {
                allWarnings = await fetchAllHokkaidoWarnings();
            } catch (error) {
                logger.error('Warning fetch failed', error);
            }

            setState(prev => ({
                ...prev,
                userLocation: currentCoords,
                locationName: currentLocationName,
                weather: realWeather,
                lastWeatherUpdate: updateTime,
                warnings: allWarnings,
                isWeatherLoading: false
            }));
        };

        loadData();
        const interval = setInterval(loadData, 30 * 60 * 1000); // 30 mins
        return () => clearInterval(interval);
    }, []);

    return state;
}
