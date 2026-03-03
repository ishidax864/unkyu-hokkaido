// Open-Meteo API クライアント（北海道・路線別・時間単位対応）
// APIキー不要・無料

import { WeatherForecast, WeatherWarning } from './types';
import { logger } from './logger';
import { getJMAWarningsForRoute } from './jma-warnings';

// 路線別の代表座標（最も影響を受けやすい地点）
// 長距離路線は複数地点を設定し、最悪地点の気象を採用
export const ROUTE_COORDINATES: Record<string, { lat: number; lon: number; name: string }[]> = {
    // 札幌近郊
    'jr-hokkaido.hakodate-main': [
        { lat: 43.0621, lon: 141.3544, name: '札幌' },
        { lat: 43.2000, lon: 140.9833, name: '小樽' },
        { lat: 43.3333, lon: 141.9167, name: '岩見沢' },
    ],
    'jr-hokkaido.chitose': [
        { lat: 42.7752, lon: 141.6922, name: '千歳' },
    ],
    'jr-hokkaido.sassho': [
        { lat: 43.2167, lon: 141.3500, name: '石狩当別' },
    ],
    // 道央
    'jr-hokkaido.muroran-main': [
        { lat: 42.3150, lon: 140.9736, name: '室蘭' },
        { lat: 42.6333, lon: 141.6000, name: '苫小牧' },
    ],
    'jr-hokkaido.hidaka': [
        { lat: 42.4833, lon: 142.0500, name: '日高門別' },
    ],
    // 道南
    'jr-hokkaido.hakodate-south': [
        { lat: 41.7686, lon: 140.7289, name: '函館' },
        { lat: 42.5000, lon: 140.2333, name: '長万部' },
    ],
    // 道北
    'jr-hokkaido.soya-main': [
        { lat: 45.4167, lon: 141.6833, name: '稚内' },
        { lat: 44.3500, lon: 142.3833, name: '名寄' },
    ],
    'jr-hokkaido.rumoi': [
        { lat: 43.9500, lon: 141.6333, name: '留萌' },
    ],
    // 道東
    'jr-hokkaido.sekihoku-main': [
        { lat: 43.8000, lon: 143.9000, name: '北見' },
        { lat: 43.7706, lon: 142.3650, name: '上川（白滝）' },
    ],
    'jr-hokkaido.senmo-main': [
        { lat: 44.0200, lon: 144.2700, name: '網走' },
        { lat: 42.9849, lon: 144.3816, name: '釧路' },
    ],
    'jr-hokkaido.nemuro-main': [
        { lat: 42.9200, lon: 143.2000, name: '帯広' },
        { lat: 42.9849, lon: 144.3816, name: '釧路' },
    ],
    'jr-hokkaido.furano': [
        { lat: 43.3500, lon: 142.3833, name: '富良野' },
    ],
    'jr-hokkaido.sekisho': [
        { lat: 43.0000, lon: 142.7500, name: '占冠' },
        { lat: 42.9200, lon: 143.2000, name: '帯広' },
    ],
};

// デフォルト座標（札幌）
const DEFAULT_LAT = 43.0621;
const DEFAULT_LON = 141.3544;

// 座標間の距離を計算 (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Find the nearest weather observation point from the given coordinates.
 * @param lat Latitude
 * @param lon Longitude
 * @returns Object containing the ID and name of the nearest point.
 */
export function findNearestWeatherPoint(lat: number, lon: number): { id: string; name: string } {
    let nearestPoint = 'jr-hokkaido.hakodate-main'; // デフォルト札幌
    let minDistance = Infinity;

    Object.entries(ROUTE_COORDINATES).forEach(([id, points]) => {
        // 各路線の全地点から最も近いものを探す
        for (const point of points) {
            const dist = calculateDistance(lat, lon, point.lat, point.lon);
            if (dist < minDistance) {
                minDistance = dist;
                nearestPoint = id;
            }
        }
    });

    return {
        id: nearestPoint,
        name: ROUTE_COORDINATES[nearestPoint][0].name
    };
}

/**
 * Get the primary (first) coordinates for a specific route ID or use provided coordinates.
 * For multi-point weather, use getRouteAllCoordinates() instead.
 * Defaults to Sapporo if neither is valid.
 */
export function getRouteCoordinates(routeId?: string, coordinates?: { lat: number; lon: number }): { lat: number; lon: number } {
    if (coordinates) {
        logger.debug('Using provided user coordinates', { coordinates });
        return coordinates;
    }

    if (routeId && ROUTE_COORDINATES[routeId]) {
        const primary = ROUTE_COORDINATES[routeId][0];
        const coords = { lat: primary.lat, lon: primary.lon };
        logger.debug('Using route-specific coordinates', {
            routeId,
            coords,
            name: primary.name
        });
        return coords;
    }
    logger.debug('Using default coordinates (Sapporo)', { routeId });
    return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
}

/**
 * Get all coordinates for a route (multiple observation points for long routes).
 */
export function getRouteAllCoordinates(routeId?: string): { lat: number; lon: number; name: string }[] {
    if (routeId && ROUTE_COORDINATES[routeId]) {
        return ROUTE_COORDINATES[routeId];
    }
    return [{ lat: DEFAULT_LAT, lon: DEFAULT_LON, name: '札幌（デフォルト）' }];
}

interface OpenMeteoHourlyResponse {
    latitude: number;
    longitude: number;
    timezone: string;
    hourly: {
        time: string[];
        temperature_2m: number[];
        precipitation: number[];
        wind_speed_10m: number[];
        wind_gusts_10m: number[];
        snow_depth: number[];
        weather_code: number[];
        snowfall?: number[];
        winddirection_10m: number[]; // 🆕
        pressure_msl?: number[]; // 🆕
    };
}

interface _OpenMeteoDailyResponse {
    latitude: number;
    longitude: number;
    timezone: string;
    daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        wind_speed_10m_max: number[];
        wind_gusts_10m_max: number[];
        snowfall_sum: number[];
    };
}

// 天気コードから天気名（日本語）
export function getWeatherName(code: number): string {
    if (code === 0) return '快晴';
    if (code <= 3) return '晴れ';
    if (code <= 48) return '曇り';
    if (code <= 67) return '雨';
    if (code <= 77) return '雪';
    if (code <= 82) return '雨';
    if (code <= 86) return '雪';
    if (code <= 99) return '雷雨';
    return '不明';
}

// 擬似警報生成（時間単位データ用） — JMA公式データ取得失敗時のフォールバック
export function generateWarningsFromHourly(
    precipitation: number,
    windSpeed: number,
    snowfall: number, // snowfall (intensity) instead of depth
    windGust: number
): WeatherWarning[] {
    const warnings: WeatherWarning[] = [];
    const now = new Date().toISOString();

    // 暴風警報（風速23m/s以上） - JMA基準より少し高めに設定（APIの過大評価補正）
    if (windSpeed >= 23) {
        warnings.push({ type: '暴風警報', area: '北海道', issuedAt: now, source: 'pseudo' });
    } else if (windSpeed >= 16 || windGust >= 35) {
        // 平均16m/s以上で注意報
        warnings.push({ type: '暴風注意報', area: '北海道', issuedAt: now, source: 'pseudo' });
    }

    // 大雨警報（1時間降水量30mm以上）
    if (precipitation >= 30) {
        warnings.push({ type: '大雨警報', area: '北海道', issuedAt: now, source: 'pseudo' });
    } else if (precipitation >= 10) {
        warnings.push({ type: '大雨注意報', area: '北海道', issuedAt: now, source: 'pseudo' });
    }

    // 大雪警報（強度ベース）
    // 気象庁基準はおおむね「12時間降雪量が30-40cm」など。時間当たり3-4cm続くと警報級。
    if (snowfall >= 4) {
        warnings.push({ type: '大雪警報', area: '北海道', issuedAt: now, source: 'pseudo' });
    }

    return warnings;
}

/**
 * Fetch hourly weather forecast for a specific route and time.
 * Used for detailed risk calculation at a specific point in time.
 * @param routeId Route ID
 * @param targetDateTime Target date and time (ISO string)
 * @param coordinates Optional custom coordinates
 */
export async function fetchHourlyWeatherForecast(
    routeId?: string,
    targetDateTime?: string, // ISO format: "2026-02-03T15:00"
    coordinates?: { lat: number; lon: number }
): Promise<WeatherForecast | null> {
    const { lat, lon } = getRouteCoordinates(routeId, coordinates);

    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${lat}&longitude=${lon}` +
            `&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,snow_depth,weather_code,snowfall,winddirection_10m,pressure_msl` +
            `&timezone=Asia/Tokyo` +
            `&wind_speed_unit=ms` + // 🆕 m/sに統一
            `&forecast_days=7`,
            { next: { revalidate: 3600 } } // 1時間ごとに更新
        );

        if (!response.ok) {
            throw new Error(`Open-Meteo API error: ${response.status}`);
        }

        const data: OpenMeteoHourlyResponse = await response.json();

        // ターゲット時刻に最も近い時間を見つける
        const targetTime = targetDateTime || new Date().toISOString();
        const targetDate = targetTime.split('T')[0];
        const targetHour = parseInt(targetTime.split('T')[1].split(':')[0]);

        let closestIndex = 0;
        let minDiff = Infinity;

        data.hourly.time.forEach((time, index) => {
            const hourTime = new Date(time);
            const hourDate = time.split('T')[0];
            const hour = hourTime.getHours();

            // 同じ日で最も近い時間を探す
            if (hourDate === targetDate) {
                const diff = Math.abs(hour - targetHour);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = index;
                }
            }
        });

        const snowDepthMeters = data.hourly.snow_depth[closestIndex] || 0;
        const prevSnowDepthMeters = closestIndex > 0 ? (data.hourly.snow_depth[closestIndex - 1] || 0) : snowDepthMeters;
        const snowDepthChangeVal = (snowDepthMeters - prevSnowDepthMeters) * 100; // m -> cm

        const currentHourData = {
            time: data.hourly.time[closestIndex],
            temp: data.hourly.temperature_2m[closestIndex],
            precipitation: data.hourly.precipitation[closestIndex],
            windSpeed: data.hourly.wind_speed_10m[closestIndex],
            windGust: data.hourly.wind_gusts_10m[closestIndex],
            snowDepth: data.hourly.snow_depth[closestIndex],
            snowDepthChange: parseFloat(snowDepthChangeVal.toFixed(1)),
            snowfall: data.hourly.snowfall ? data.hourly.snowfall[closestIndex] : 0,
            weatherCode: data.hourly.weather_code[closestIndex],
            windDirection: data.hourly.winddirection_10m[closestIndex], // 🆕
            pressure: data.hourly.pressure_msl ? data.hourly.pressure_msl[closestIndex] : 1013, // 🆕
        };

        // 気象庁公式警報を優先し、取得失敗時は擬似警報にフォールバック
        let warnings: WeatherWarning[];
        const jmaWarnings = await getJMAWarningsForRoute(routeId || '');
        if (jmaWarnings !== null) {
            warnings = jmaWarnings;
            logger.info('[Weather] Using JMA official warnings', { routeId, count: jmaWarnings.length });
        } else {
            warnings = generateWarningsFromHourly(
                currentHourData.precipitation,
                currentHourData.windSpeed,
                currentHourData.snowfall || 0,
                currentHourData.windGust
            );
            logger.info('[Weather] Using pseudo warnings (JMA unavailable)', { routeId });
        }

        // 前後12時間のデータを抽出（タイムシフト提案・グラフ用）
        const surroundingHours: WeatherForecast[] = [];
        for (let i = -12; i <= 12; i++) {
            // if (i === 0) continue; // 🆕 Include target hour to avoid data hole!
            const targetIdx = closestIndex + i;
            if (targetIdx >= 0 && targetIdx < data.hourly.time.length) {
                const hTime = data.hourly.time[targetIdx];
                const hSnowfall = data.hourly.snowfall ? data.hourly.snowfall[targetIdx] : 0;

                // 簡易警告生成
                const hWarnings = generateWarningsFromHourly(
                    data.hourly.precipitation[targetIdx],
                    data.hourly.wind_speed_10m[targetIdx],
                    hSnowfall,
                    data.hourly.wind_gusts_10m[targetIdx]
                );

                // snowDepthChange を算出（メインweatherと同一ロジック）
                const hSnowDepthM = data.hourly.snow_depth[targetIdx] || 0;
                const hPrevSnowDepthM = targetIdx > 0 ? (data.hourly.snow_depth[targetIdx - 1] || 0) : hSnowDepthM;
                const hSnowDepthChangeCm = parseFloat(((hSnowDepthM - hPrevSnowDepthM) * 100).toFixed(1));

                surroundingHours.push({
                    date: hTime.split('T')[0],
                    targetTime: hTime.split('T')[1], // 時間も保持
                    weather: getWeatherName(data.hourly.weather_code[targetIdx]),
                    temperature: data.hourly.temperature_2m[targetIdx], // 🆕 メインweatherと同一
                    tempMax: data.hourly.temperature_2m[targetIdx], // 便宜上
                    tempMin: data.hourly.temperature_2m[targetIdx],
                    precipitation: data.hourly.precipitation[targetIdx],
                    windSpeed: data.hourly.wind_speed_10m[targetIdx],
                    snowfall: hSnowfall,
                    snowDepth: hSnowDepthM, // 🆕 メインweatherと同一
                    snowDepthChange: hSnowDepthChangeCm, // 🆕 メインweatherと同一
                    windGust: data.hourly.wind_gusts_10m[targetIdx],
                    pressure: data.hourly.pressure_msl ? data.hourly.pressure_msl[targetIdx] : 1013, // 🆕 メインweatherと同一
                    weatherCode: data.hourly.weather_code[targetIdx],
                    windDirection: data.hourly.winddirection_10m[targetIdx], // 🆕
                    warnings: hWarnings,
                });
            }
        }

        return {
            date: targetDate,
            weather: getWeatherName(currentHourData.weatherCode),
            temperature: currentHourData.temp, // 🆕
            tempMax: currentHourData.temp + 2,
            tempMin: currentHourData.temp - 2,
            precipitation: currentHourData.precipitation,
            windSpeed: currentHourData.windSpeed,
            snowfall: currentHourData.snowfall,
            windGust: currentHourData.windGust,
            weatherCode: currentHourData.weatherCode,
            windDirection: currentHourData.windDirection, // 🆕
            pressure: currentHourData.pressure, // 🆕
            warnings,
            surroundingHours, // 追加
        };
    } catch (error) {
        logger.error('Failed to fetch hourly weather', error, { routeId, targetDateTime });
        return null;
    }
}

/**
 * Fetch daily weather forecast for the next 7 days.
 * Aggregates hourly data to find daily maximums/minimums and risks.
 * @param routeId Route ID
 * @param coordinates Optional custom coordinates
 */
export async function fetchDailyWeatherForecast(
    routeId?: string,
    coordinates?: { lat: number; lon: number }
): Promise<WeatherForecast[]> {
    const { lat, lon } = getRouteCoordinates(routeId, coordinates);

    try {
        // 時間単位のデータを7日間分取得して、独自に集計する
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${lat}&longitude=${lon}` +
            `&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,snow_depth,weather_code,winddirection_10m,snowfall` +
            `&timezone=Asia/Tokyo` +
            `&wind_speed_unit=ms` + // 🆕 m/sに統一
            `&forecast_days=7`,
            { next: { revalidate: 3600 } } // 1時間ごとに更新
        );

        if (!response.ok) {
            throw new Error(`Open-Meteo API error: ${response.status}`);
        }

        const data: OpenMeteoHourlyResponse = await response.json();
        const dailyForecasts: WeatherForecast[] = [];

        // 日付ごとにグループ化して集計
        const groupedByDate: Record<string, {
            temps: number[];
            precipitations: number[];
            windSpeeds: number[];
            windGusts: number[];
            snowDepths: number[];
            windDirections: number[]; // 🆕
            weatherCodes: number[];
        }> = {};

        data.hourly.time.forEach((t, i) => {
            const date = t.split('T')[0];
            const hour = parseInt(t.split('T')[1].split(':')[0]);

            // 営業時間内 (06:00 - 23:00) のデータのみをおおむね考慮する
            // ただし、運休リスクは「始発前」の状況も影響するため、04:00くらいから含めるのが妥当
            // ユーザー感覚に合わせるため、深夜(00:00-04:00)の突発的な悪天候は除外する（翌日の運休影響は別途考慮されるべきだが）
            if (hour >= 5 && hour <= 23) {
                if (!groupedByDate[date]) {
                    groupedByDate[date] = {
                        temps: [],
                        precipitations: [],
                        windSpeeds: [],
                        windGusts: [],
                        snowDepths: [],
                        windDirections: [], // 🆕
                        weatherCodes: [],
                    };
                }
                groupedByDate[date].temps.push(data.hourly.temperature_2m[i]);
                groupedByDate[date].precipitations.push(data.hourly.precipitation[i]);
                groupedByDate[date].windSpeeds.push(data.hourly.wind_speed_10m[i]);
                groupedByDate[date].windGusts.push(data.hourly.wind_gusts_10m[i]);
                groupedByDate[date].snowDepths.push(data.hourly.snow_depth[i]);
                groupedByDate[date].windDirections.push(data.hourly.winddirection_10m[i]); // 🆕
                groupedByDate[date].weatherCodes.push(data.hourly.weather_code[i]);
            }
        });

        // 集計
        Object.keys(groupedByDate).sort().forEach(date => {
            const group = groupedByDate[date];
            if (group.temps.length === 0) return;

            const tempMax = Math.max(...group.temps);
            const tempMin = Math.min(...group.temps);

            // 降水量は合計（営業時間内）
            const precipitation = group.precipitations.reduce((a, b) => a + b, 0);

            // 風速は「営業時間内の上位30%点（70パーセンタイル）」を採用
            // これにより、一瞬の突風のみで一日全体が高リスクになるのを防ぎつつ、
            // ある程度継続する悪天候を捕捉する。
            const sortedWinds = [...group.windSpeeds].sort((a, b) => b - a);
            const sortedGusts = [...group.windGusts].sort((a, b) => b - a);

            // 例: 18時間分なら 18 * 0.30 = 5.4 -> index 5 (6番目に強い風)
            const percentileIndex = Math.floor(group.windSpeeds.length * 0.30);
            const windSpeed = sortedWinds[percentileIndex] || sortedWinds[0] || 0;
            const windGust = sortedGusts[percentileIndex] || sortedGusts[0] || 0;

            // 風向は「最大風速時」のものを採用する
            // 全体の平均をとるより、リスクがある瞬間の風向が重要
            // windSpeedに対応するindexを見つけるのは難しい（sortしてしまっているため）
            // なので簡易的に「最多風向」または「平均ベクトル」を採用すべきだが、
            // ここではシンプルに「最大風速を記録した時間帯の風向」に近いものを取るのがベスト。
            // しかしgroup.windSpeedsはsort済みではない元の配列が欲しい。
            // -> group.windSpeedsは未ソート。

            // 最大風速のインデックスを探す
            let maxWindIndex = 0;
            let maxWindVal = -1;
            group.windSpeeds.forEach((w, idx) => {
                if (w > maxWindVal) {
                    maxWindVal = w;
                    maxWindIndex = idx;
                }
            });
            const windDirection = group.windDirections[maxWindIndex] || 0;

            // 積雪は最大深さ - 最小深さ（その日の積雪増分）または最大値
            // ここではシンプルにその日の最大積雪深を採用（除雪閾値と比較するため）
            const snowfall = Math.max(...group.snowDepths);

            // 天気コードは最も頻出するもの、または悪天候を優先
            // ここでは簡易的に「昼12時」に近いインデックスのもの、あるいは悪天候コード(>50)があればそれを優先
            const badWeather = group.weatherCodes.find(c => c >= 51) || group.weatherCodes[Math.floor(group.weatherCodes.length / 2)];
            const weatherCode = badWeather;

            const warnings: WeatherWarning[] = [];
            const now = new Date().toISOString();

            // 暴風警報 (基準を厳しくして過剰反応を防ぐ)
            // 気象庁基準: 平均風速20m/s以上だが、APIの予測値は高めに出がちなので調整
            if (windSpeed >= 23) {
                warnings.push({ type: '暴風警報', area: '北海道', issuedAt: now });
            } else if (windSpeed >= 16 || windGust >= 35) {
                warnings.push({ type: '暴風注意報', area: '北海道', issuedAt: now });
            }

            // 大雨警報
            if (precipitation >= 30) { // 時間降水積み上げなので閾値調整
                warnings.push({ type: '大雨警報', area: '北海道', issuedAt: now });
            } else if (precipitation >= 10) {
                warnings.push({ type: '大雨注意報', area: '北海道', issuedAt: now });
            }

            // 大雪警報
            if (snowfall >= 30) {
                warnings.push({ type: '大雪警報', area: '北海道', issuedAt: now });
            }

            dailyForecasts.push({
                date,
                weather: getWeatherName(weatherCode),
                tempMax,
                tempMin,
                precipitation,
                windSpeed,
                snowfall,
                windGust,
                windDirection, // 🆕
                weatherCode,
                warnings,
            });
        });

        return dailyForecasts;
    } catch (error) {
        logger.error('Failed to fetch/aggregate hourly weather for weekly forecast', error, { routeId });
        return [];
    }
}

/**
 * Fetch active weather warnings for major areas in Hokkaido.
 * @returns Array of areas with their active warnings.
 */
export async function fetchAllHokkaidoWarnings(): Promise<Array<{ area: string; warnings: WeatherWarning[] }>> {
    const results: Array<{ area: string; warnings: WeatherWarning[] }> = [];

    // 主要地域の代表地点
    const targetAreas = [
        { id: 'jr-hokkaido.hakodate-main', area: '石狩・空知・後志（札幌周辺）' },
        { id: 'jr-hokkaido.chitose', area: '石狩・胆振（千歳周辺）' },
        { id: 'jr-hokkaido.hakodate', area: '渡島・檜山（函館周辺）' },
        { id: 'jr-hokkaido.sekihoku', area: '網走・北見・紋別' },
        { id: 'jr-hokkaido.nemuro', area: '釧路・根室' },
        { id: 'jr-hokkaido.soya', area: '宗谷・上川（旭川周辺）' },
        { id: 'jr-hokkaido.hidaka', area: '日高・胆振東部' }
    ];

    try {
        const promises = targetAreas.map(async (target) => {
            // 現在の天気を取得（警告判定のためfetchHourlyWeatherForecastを再利用）
            // 未来予測を含めた直近の警報状態を知りたいため、現在時刻で取得
            const forecast = await fetchHourlyWeatherForecast(target.id);
            if (forecast && forecast.warnings.length > 0) {
                return {
                    area: target.area,
                    warnings: forecast.warnings.map(w => ({ ...w, area: target.area }))
                };
            }
            return null;
        });

        const fetchResults = await Promise.all(promises);
        fetchResults.forEach(r => {
            if (r) results.push(r);
        });

    } catch (error) {
        logger.error('Failed to fetch all Hokkaido warnings', error);
    }

    return results;
}

// 互換性のため（既存コードで使用）
export async function fetchRealWeatherForecast(routeId?: string, coordinates?: { lat: number; lon: number }): Promise<WeatherForecast[]> {
    return fetchDailyWeatherForecast(routeId, coordinates);
}
