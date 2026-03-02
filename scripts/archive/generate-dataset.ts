
import fs from 'fs';
import path from 'path';
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput } from '../lib/types';

const COORDS = {
    SAPPORO: { lat: 43.0618, lon: 141.3545 },
    IWAMIZAWA: { lat: 43.2048, lon: 141.7733 },
    CHITOSE: { lat: 42.793, lon: 141.693 }
};

// Define types
interface GroundTruthItem {
    routeId: string;
    date: string;
    status: string;
}

interface HourlyWeather {
    time: string;
    windSpeed: number;
    snowfall: number;
    snowDepth: number;
    precipitation: number;
    windGust: number;
    temperature: number;
}

// Fixed function
async function fetchHistoricalWeather(date: string, routeId: string): Promise<HourlyWeather[]> {
    let lat = COORDS.SAPPORO.lat;
    let lon = COORDS.SAPPORO.lon;
    if (routeId.includes('hakodate-main')) { lat = COORDS.IWAMIZAWA.lat; lon = COORDS.IWAMIZAWA.lon; }
    else if (routeId.includes('chitose')) { lat = COORDS.CHITOSE.lat; lon = COORDS.CHITOSE.lon; }

    // Add delay to be nice to the API
    await new Promise(r => setTimeout(r, 100));

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,precipitation,snowfall,snow_depth,windspeed_10m,winddirection_10m,windgusts_10m&timezone=Asia%2FTokyo`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.hourly) return [];

        return data.hourly.time.map((t: string, i: number) => ({
            time: t.split('T')[1],
            windSpeed: data.hourly.windspeed_10m[i],
            snowfall: data.hourly.snowfall[i],
            snowDepth: data.hourly.snow_depth ? data.hourly.snow_depth[i] * 100 : 0, // m to cm
            precipitation: data.hourly.precipitation[i],
            windGust: data.hourly.windgusts_10m[i],
            temperature: data.hourly.temperature_2m[i]
        }));
    } catch (e) {
        console.error(`Failed to fetch for ${date} ${routeId}`, e);
        return [];
    }
}

async function generateDataset() {
    const groundTruthPath = path.join(process.cwd(), 'lib/backtest/ground-truth-300.json');
    const groundTruth: GroundTruthItem[] = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));

    const outputPath = path.join(process.cwd(), 'lib/backtest/training_data.csv');
    const stream = fs.createWriteStream(outputPath);

    // Header
    stream.write('route_id,month,hour,wind_speed,wind_gust,snowfall,snow_depth,temperature,precipitation,status,is_stopped\n');

    console.log(`Processing ${groundTruth.length} records...`);

    let count = 0;
    for (const item of groundTruth) {
        const hourly = await fetchHistoricalWeather(item.date, item.routeId);
        if (hourly.length === 0) continue;

        // We need to aggregate hourly data into a single row per day, 
        // OR output hourly rows if we want to predict "Will it stop at 9AM?".
        // For simplicity and matching the current "Daily" nature of the app's main prediction (often whole day),
        // let's create a row for the "Worst Case" hour of that day, as suspension is triggered by the peak.
        // OR better: Create 3 rows per day (Morning 8am, Afternoon 14pm, Night 20pm) to capture time-of-day dynamics.
        // Since the ground truth `status` is usually "Day Level", mapping it to specific hours is tricky.
        // Let's stick to "Worst Case of the Day" features for now to predict the Day Status.

        const maxWind = Math.max(...hourly.map((h: HourlyWeather) => h.windSpeed));
        const maxGust = Math.max(...hourly.map((h: HourlyWeather) => h.windGust));
        const maxSnow = Math.max(...hourly.map((h: HourlyWeather) => h.snowfall));
        const maxDepth = Math.max(...hourly.map((h: HourlyWeather) => h.snowDepth)); // Already cm
        const minTemp = Math.min(...hourly.map((h: HourlyWeather) => h.temperature));
        const totalPrecip = hourly.reduce((sum: number, h: HourlyWeather) => sum + h.precipitation, 0);

        const dateObj = new Date(item.date);
        const month = dateObj.getMonth() + 1;

        // Target Variable
        const isStopped = (item.status === 'stopped') ? 1 : 0;

        // Write Row
        stream.write(`${item.routeId},${month},12,${maxWind},${maxGust},${maxSnow},${maxDepth},${minTemp},${totalPrecip},${item.status},${isStopped}\n`);

        count++;
        if (count % 10 === 0) console.log(`Processed ${count}/${groundTruth.length}`);
    }

    stream.end();
    console.log(`Dataset generated at ${outputPath}`);
}

generateDataset();
