
import fs from 'fs';
import path from 'path';

const ROUTES = {
    'jr-hokkaido.sekihoku': { lat: 43.803, lon: 143.896, name: 'Sekihoku' },
    'jr-hokkaido.soya': { lat: 45.415, lon: 141.673, name: 'Soya' },
    'jr-hokkaido.chitose': { lat: 42.793, lon: 141.693, name: 'Chitose' },
    'jr-hokkaido.hakodate-main': { lat: 43.204, lon: 141.773, name: 'HakodateMain' },
    'jr-hokkaido.nemuro': { lat: 42.990, lon: 144.382, name: 'Nemuro' },
    'jr-hokkaido.jurigi': { lat: 43.1, lon: 142.0, name: 'Jurigi' }, // Placeholder for variety if needed
};

// Safe Wind Directions (0-360)
const SAFE_WIND_DIRECTIONS: Record<string, number[][]> = {
    'jr-hokkaido.chitose': [[350, 360], [0, 10]],
};

// Config
const TARGET_COUNT = 3000; // Sufficient for trend learning
const START_YEAR = 2020;
const END_YEAR = 2024;
const WINTER_MONTHS = [12, 1, 2, 3];

function getRandomDate() {
    const year = START_YEAR + Math.floor(Math.random() * (END_YEAR - START_YEAR + 1));
    const month = WINTER_MONTHS[Math.floor(Math.random() * WINTER_MONTHS.length)];
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

async function fetchHourlyData(lat: number, lon: number, date: string) {
    await new Promise(r => setTimeout(r, 60));
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,precipitation,snowfall,snow_depth,windspeed_10m,winddirection_10m,windgusts_10m,pressure_msl&timezone=Asia%2FTokyo`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            if (res.status === 429) await new Promise(r => setTimeout(r, 2000));
            return null;
        }
        return await res.json();
    } catch (e) { return null; }
}

function getThreeHourTrend(hourly: any, startIndex: number) {
    // Collect data for T0, T+1, T+2
    const data = [];
    for (let i = 0; i < 3; i++) {
        const idx = startIndex + i;
        if (idx >= hourly.time.length) break;
        data.push({
            wind: hourly.windspeed_10m[idx],
            gust: hourly.windgusts_10m[idx],
            snow: hourly.snowfall[idx],
            temp: hourly.temperature_2m[idx],
            pressure: hourly.pressure_msl[idx],
            dir: hourly.winddirection_10m[idx],
            depth: hourly.snow_depth[idx] || 0
        });
    }
    return data;
}

function calculateRecoveryTruth(hourly: any, startIndex: number, threshold: number): number {
    // Look ahead to find when wind drops below threshold
    // Scan up to 12 hours ahead
    let hours = 0;
    for (let i = 0; i < 12; i++) {
        const idx = startIndex + i;
        if (idx >= hourly.windspeed_10m.length) break;
        if (hourly.windspeed_10m[idx] < threshold) {
            return hours; // Found clear weather
        }
        hours++;
    }
    return 12; // Cap at 12h
}

function isSafeWind(dir: number, ranges?: number[][]): boolean {
    if (!ranges) return false;
    return ranges.some(([min, max]) => dir >= min && dir <= max);
}

function determineStatusAndRecovery(hourlyData: any, hourIndex: number, routeId: string) {
    const trend = getThreeHourTrend(hourlyData.hourly, hourIndex);
    if (trend.length < 3) return null;

    const current = trend[0];
    const next1 = trend[1];

    // Feature: Trend (Gradient)
    const windChange = next1.wind - current.wind;
    const pressureChange = next1.pressure - current.pressure;

    // Base Risk Score (Current)
    let score = 0;
    let windScore = Math.max(0, current.wind - 18) * 5; // Stricter logic
    if (isSafeWind(current.dir, SAFE_WIND_DIRECTIONS[routeId])) windScore *= 0.5;
    score += windScore;

    score += Math.max(0, current.gust - 25) * 4;
    score += Math.max(0, current.snow - 2) * 10;

    // Status Logic
    let status = 'normal';
    if (score > 60) status = 'suspended';
    else if (score > 25) status = 'delayed';

    // Recovery Logic (Ground Truth)
    // If suspended, how long until wind < 15m/s?
    let recoveryTime = 0;
    if (status === 'suspended') {
        recoveryTime = calculateRecoveryTruth(hourlyData.hourly, hourIndex, 15);
        // Add small penalty for snow depth (clearing time)
        const depth = current.depth * 100; // m to cm
        if (depth > 30) recoveryTime += (depth - 30) * 0.05;
    } else if (status === 'delayed') {
        // Delayed usually recovers quickly unless it turns into suspension
        recoveryTime = Math.random() * 1.5;
    }

    return {
        features: {
            ...current,
            windChange,
            pressureChange,
            month: new Date(hourlyData.hourly.time[hourIndex]).getMonth() + 1
        },
        label: { status, recoveryTime }
    };
}

async function generate() {
    const outPath = path.join(process.cwd(), 'lib/backtest/dataset_hourly_trend.csv');
    const stream = fs.createWriteStream(outPath);

    stream.write('route_id,month,wind_speed,wind_dir,wind_gust,snowfall,snow_depth,temperature,pressure,wind_change,pressure_change,status,recovery_time\n');

    console.log(`Generating ${TARGET_COUNT} hourly trend cases...`);

    const routeKeys = Object.keys(ROUTES);
    let generated = 0;
    const CONCURRENCY = 10;
    const TARGET = TARGET_COUNT;

    async function worker() {
        while (generated < TARGET) {
            if (generated >= TARGET) break;

            const routeId = routeKeys[Math.floor(Math.random() * routeKeys.length)];
            const route = ROUTES[routeId as keyof typeof ROUTES];
            const date = getRandomDate();

            const data = await fetchHourlyData(route.lat, route.lon, date);

            if (data && data.hourly) {
                // Pick 3 random hours from this day (e.g. 08:00, 14:00, 20:00)
                // Avoid end of day to allow lookahead
                for (let k = 0; k < 3; k++) {
                    if (generated >= TARGET) break;

                    const hourIdx = Math.floor(Math.random() * 18) + 4; // 04:00 to 22:00
                    const result = determineStatusAndRecovery(data, hourIdx, routeId);

                    if (result) {
                        const { features, label } = result;

                        stream.write(`${routeId},${features.month},${features.wind},${features.dir},${features.gust},${features.snow},${features.depth * 100},${features.temp},${features.pressure},${features.windChange.toFixed(2)},${features.pressureChange.toFixed(2)},${label.status},${label.recoveryTime.toFixed(1)}\n`);

                        generated++;
                        if (generated % 100 === 0) console.log(`Generated ${generated}/${TARGET}`);
                    }
                }
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }).map(worker));
    stream.end();
    console.log('Done!');
}

generate();
