
import fs from 'fs';
import path from 'path';
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput } from '../lib/types';

const COORDS = {
    SAPPORO: { lat: 43.0618, lon: 141.3545 },
    IWAMIZAWA: { lat: 43.2048, lon: 141.7733 },
    CHITOSE: { lat: 42.793, lon: 141.693 }
};

async function fetchHistoricalWeather(date: string, routeId: string) {
    let lat = COORDS.SAPPORO.lat;
    let lon = COORDS.SAPPORO.lon;
    if (routeId.includes('hakodate-main')) { lat = COORDS.IWAMIZAWA.lat; lon = COORDS.IWAMIZAWA.lon; }
    else if (routeId.includes('chitose')) { lat = COORDS.CHITOSE.lat; lon = COORDS.CHITOSE.lon; }

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,precipitation,snowfall,snow_depth,windspeed_10m,winddirection_10m,windgusts_10m&timezone=Asia%2FTokyo`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.hourly) return [];

        return data.hourly.time.map((t: string, i: number) => ({
            time: t.split('T')[1],
            windSpeed: data.hourly.windspeed_10m[i],
            snowfall: data.hourly.snowfall[i],
            snowDepth: data.hourly.snow_depth ? data.hourly.snow_depth[i] * 100 : 0,
            precipitation: data.hourly.precipitation[i],
            windDirection: data.hourly.winddirection_10m[i],
            windGust: data.hourly.windgusts_10m[i]
        }));
    } catch (e) { return []; }
}

async function runAnalysis() {
    const groundTruthPath = path.join(process.cwd(), 'lib/backtest/ground-truth-300.json');
    const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));

    const stats = {
        total: 0,
        tp: 0, fp: 0, tn: 0, fn: 0,
        byRoute: {} as any
    };

    console.log('Running detailed accuracy analysis on 50 samples...');

    const subset = groundTruth.slice(0, 50);

    for (const item of subset) {
        if (!stats.byRoute[item.routeId]) {
            stats.byRoute[item.routeId] = { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 };
        }

        const hourly = await fetchHistoricalWeather(item.date, item.routeId);
        if (hourly.length === 0) continue;

        const maxWind = Math.max(...hourly.map((h: any) => h.windSpeed));
        const maxSnow = Math.max(...hourly.map((h: any) => h.snowfall));

        const input: PredictionInput = {
            routeId: item.routeId,
            routeName: 'Test Route',
            targetDate: item.date,
            weather: {
                date: item.date,
                weather: 'snow',
                tempMax: 0, tempMin: -5,
                precipitation: 0,
                windSpeed: maxWind,
                snowfall: maxSnow,
                warnings: []
            } as any
        };

        const result = calculateSuspensionRisk(input);
        const predictedStop = result.probability >= 50;
        const actualStop = item.status === 'stopped' || item.status === 'delayed';

        stats.total++;
        stats.byRoute[item.routeId].total++;

        if (predictedStop && actualStop) {
            stats.tp++;
            stats.byRoute[item.routeId].tp++;
        } else if (!predictedStop && !actualStop) {
            stats.tn++;
            stats.byRoute[item.routeId].tn++;
        } else if (predictedStop && !actualStop) {
            stats.fp++;
            stats.byRoute[item.routeId].fp++;
        } else if (!predictedStop && actualStop) {
            stats.fn++;
            stats.byRoute[item.routeId].fn++;
        }

        await new Promise(r => setTimeout(r, 50));
    }

    console.log('\n=== Confusion Matrix (n=50) ===');
    console.log(`Total: ${stats.total}`);
    console.log(`TP (Correct Stop): ${stats.tp}`);
    console.log(`TN (Correct Normal): ${stats.tn}`);
    console.log(`FP (Wolf Boy): ${stats.fp}`);
    console.log(`FN (Missed Detection): ${stats.fn}`);

    const accuracy = ((stats.tp + stats.tn) / stats.total * 100).toFixed(1);
    const recall = (stats.tp / (stats.tp + stats.fn) * 100).toFixed(1);
    const precision = (stats.tp / (stats.tp + stats.fp) * 100).toFixed(1);

    console.log(`\nAccuracy: ${accuracy}%`);
    console.log(`Recall (Detection Rate): ${recall}%`);
    console.log(`Precision (Trustworthiness): ${precision}%`);

    console.log('\n=== Breakdown by Route ===');
    Object.keys(stats.byRoute).forEach(r => {
        const s = stats.byRoute[r];
        if (s.total > 0) {
            console.log(`${r}: TP=${s.tp}, TN=${s.tn}, FP=${s.fp}, FN=${s.fn}`);
        }
    });
}

runAnalysis();
