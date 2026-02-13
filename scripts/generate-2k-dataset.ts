
import fs from 'fs';
import path from 'path';

// Define Routes and Coordinates
const ROUTES = {
    'jr-hokkaido.sekihoku': { lat: 43.803, lon: 143.896, name: 'Sekihoku' },
    'jr-hokkaido.soya': { lat: 45.415, lon: 141.673, name: 'Soya' },
    'jr-hokkaido.chitose': { lat: 42.793, lon: 141.693, name: 'Chitose' },
    'jr-hokkaido.hakodate-main': { lat: 43.204, lon: 141.773, name: 'HakodateMain' },
    'jr-hokkaido.nemuro': { lat: 42.990, lon: 144.382, name: 'Nemuro' },
    'jr-hokkaido.muroran': { lat: 42.315, lon: 140.974, name: 'Muroran' },
    'jr-hokkaido.sekisho': { lat: 42.969, lon: 142.815, name: 'Sekisho' },
    'jr-hokkaido.senmo': { lat: 44.020, lon: 144.273, name: 'Senmo' },
    'jr-hokkaido.rumoi': { lat: 43.941, lon: 141.652, name: 'Rumoi' },
    'jr-hokkaido.furano': { lat: 43.342, lon: 142.383, name: 'Furano' },
};

// Config
const TARGET_COUNT = 2000;
const START_YEAR = 2020;
const END_YEAR = 2024;
const WINTER_MONTHS = [12, 1, 2, 3];

function getRandomDate() {
    const year = START_YEAR + Math.floor(Math.random() * (END_YEAR - START_YEAR + 1));
    const month = WINTER_MONTHS[Math.floor(Math.random() * WINTER_MONTHS.length)];
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

async function fetchWeather(lat: number, lon: number, date: string) {
    // Add delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100)); // Slightly increased delay for safety in parallel

    // Fetch real historical weather
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,precipitation,snowfall,snow_depth,windspeed_10m,windgusts_10m,pressure_msl&timezone=Asia%2FTokyo`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            // If rate limited, wait and retry once
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, 2000));
                return null; // Skip for now to keep it simple, worker will pick another
            }
            return null;
        }
        const data = await res.json();
        if (!data.hourly) return null;

        const wind = data.hourly.windspeed_10m;
        const gust = data.hourly.windgusts_10m;
        const snow = data.hourly.snowfall;
        const depth = data.hourly.snow_depth;
        const temp = data.hourly.temperature_2m;
        const pressure = data.hourly.pressure_msl;

        return {
            wind_speed: Math.max(...wind),
            wind_gust: Math.max(...gust),
            snowfall: Math.max(...snow),
            snow_depth: Math.max(...(depth || [0])) * 100, // m -> cm
            temperature: Math.min(...temp),
            pressure: Math.min(...pressure),
            month: new Date(date).getMonth() + 1
        };
    } catch (e) {
        return null;
    }
}

function determineStatusAndRecovery(features: any, routeId: string) {
    const { wind_speed, wind_gust, snowfall, snow_depth, temperature } = features;

    let vulnerability = 1.0;
    if (routeId === 'jr-hokkaido.soya' || routeId === 'jr-hokkaido.sekihoku') vulnerability = 1.2;
    if (routeId === 'jr-hokkaido.chitose') vulnerability = 1.1;

    let score = 0;
    score += Math.max(0, wind_speed - 15) * 5;
    score += Math.max(0, wind_gust - 25) * 3;
    score += Math.max(0, snowfall - 2) * 10;
    score += Math.max(0, snow_depth - 30) * 0.5;

    if (temperature < -5) score *= 1.1;
    if (temperature < -10) score *= 1.2;

    score *= vulnerability;

    let status = 'normal';
    if (score > 80) status = 'suspended';
    else if (score > 30) status = 'delayed';

    if (Math.random() < 0.1) {
        if (status === 'suspended') status = 'delayed';
        else if (status === 'delayed') status = 'normal';
        else if (status === 'normal' && score > 20) status = 'delayed';
    }

    let recovery_time = 0;
    if (status === 'suspended') {
        recovery_time = 2 + Math.max(0, (wind_speed - 20) * 0.5) + Math.max(0, (snow_depth - 30) * 0.1);
        recovery_time += (Math.random() * 4 - 2);
        if (recovery_time < 1) recovery_time = 1;
    } else if (status === 'delayed') {
        recovery_time = Math.random() * 2;
    }

    return { status, recovery_time: parseFloat(recovery_time.toFixed(1)) };
}

async function generate() {
    const outPath = path.join(process.cwd(), 'lib/backtest/dataset_2k.csv');
    const stream = fs.createWriteStream(outPath);

    stream.write('route_id,date,month,wind_speed,wind_gust,snowfall,snow_depth,temperature,pressure,status,recovery_time\n');

    console.log(`Generating ${TARGET_COUNT} cases with concurrency (10)...`);

    const routeKeys = Object.keys(ROUTES);
    let generated = 0;
    const CONCURRENCY = 10;
    const TARGET = TARGET_COUNT;

    // We can't use simple Promise.all with shared 'generated' counter efficiently without a mutex or atomic in JS loop?
    // Actually JS is single threaded so 'generated++' is atomic. Use a recursive worker pattern.

    async function worker() {
        while (generated < TARGET) {
            // Check again inside loop
            if (generated >= TARGET) break;

            // Proactively increment to reserve the slot
            // But we only want to count *successful* generations.
            // If we fail, we just loop again.
            // So we don't increment here. We increment on success.
            // But that might lead to over-generation if many succeed at once. 
            // It's fine if we have slight over-generation. 

            const routeId = routeKeys[Math.floor(Math.random() * routeKeys.length)];
            const route = ROUTES[routeId as keyof typeof ROUTES];
            const date = getRandomDate();

            const weather = await fetchWeather(route.lat, route.lon, date);

            if (weather) {
                // Check limit again before writing
                if (generated >= TARGET) break;

                const { status, recovery_time } = determineStatusAndRecovery(weather, routeId);
                stream.write(`${routeId},${date},${weather.month},${weather.wind_speed},${weather.wind_gust},${weather.snowfall},${weather.snow_depth},${weather.temperature},${weather.pressure},${status},${recovery_time}\n`);

                generated++;
                if (generated % 50 === 0) console.log(`Generated ${generated}/${TARGET}`);
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }).map(worker));

    stream.end();
    console.log('Done!');
}

generate();
