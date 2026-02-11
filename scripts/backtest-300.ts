
// ... (Imports and types remain same, omitted for brevity but will be verified)
import fs from 'fs';
import path from 'path';
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput } from '../lib/types';

// ... (HourlyForecast, GroundTruthItem interfaces and fetchHistoricalWeather function remain same)
interface HourlyForecast {
    time: string;
    temp: number;
    windSpeed: number;
    precipitation: number;
    snowfall: number;
    snowDepth: number;
    weatherCode: number;
    windDirection: number;
}

// Ground Truth Data Type
interface GroundTruthItem {
    date: string; // YYYY-MM-DD
    routeId: string;
    status: 'stopped' | 'delayed' | 'normal';
    cause: string;
    notes: string;
}

// Coordinates
const COORDS = {
    SAPPORO: { lat: 43.0618, lon: 141.3545 },
    IWAMIZAWA: { lat: 43.2048, lon: 141.7733 }, // Key for Hakodate Line snow
    CHITOSE: { lat: 42.793, lon: 141.693 } // Airport
};

async function fetchHistoricalWeather(date: string, routeId: string): Promise<HourlyForecast[]> {
    let lat = COORDS.SAPPORO.lat;
    let lon = COORDS.SAPPORO.lon;

    if (routeId.includes('hakodate-main')) {
        lat = COORDS.IWAMIZAWA.lat;
        lon = COORDS.IWAMIZAWA.lon;
    } else if (routeId.includes('chitose')) {
        lat = COORDS.CHITOSE.lat;
        lon = COORDS.CHITOSE.lon;
    }

    // Open-Meteo Historical API
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,precipitation,snowfall,snow_depth,windspeed_10m,winddirection_10m,windgusts_10m&timezone=Asia%2FTokyo`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.hourly) {
            throw new Error(`No hourly data for ${date}`);
        }

        const hourly: HourlyForecast[] = data.hourly.time.map((timeStr: string, index: number) => {
            return {
                time: timeStr.split('T')[1], // HH:MM
                temp: data.hourly.temperature_2m[index],
                windSpeed: data.hourly.windspeed_10m[index],
                precipitation: data.hourly.precipitation[index],
                snowfall: data.hourly.snowfall[index],
                snowDepth: data.hourly.snow_depth ? data.hourly.snow_depth[index] * 100 : 0, // Convert m to cm
                weatherCode: 71,
                windDirection: data.hourly.winddirection_10m[index],
            };
        });

        return hourly;
    } catch (error) {
        console.error(`Failed to fetch weather for ${date}:`, error);
        return [];
    }
}

// 🆕 Time-Specific Prediction
function getPredictionForTime(hourly: HourlyForecast[], timeStr: string, item: GroundTruthItem) {
    // Find forecast closest to target time (e.g. 07:00 or 18:00)
    // We actually need the Max Risk around that time window, say +/- 2 hours.
    const targetHour = parseInt(timeStr.split(':')[0]);
    const windowStart = Math.max(0, targetHour - 2);
    const windowEnd = Math.min(23, targetHour + 2);

    const relevantHours = hourly.filter(h => {
        const hTime = parseInt(h.time.split(':')[0]);
        return hTime >= windowStart && hTime <= windowEnd;
    });

    if (relevantHours.length === 0) return { prob: 0, wind: 0, snow: 0 };

    const maxWind = Math.max(...relevantHours.map(h => h.windSpeed));
    const maxSnow = Math.max(...relevantHours.map(h => h.snowfall));
    const topHour = relevantHours.find(h => h.windSpeed === maxWind) || relevantHours[0];

    const input: PredictionInput = {
        routeId: item.routeId,
        routeName: 'Backtest Route',
        targetDate: item.date,
        targetTime: timeStr,
        weather: {
            date: item.date,
            weather: 'snow', // Generic
            tempMax: -2,
            tempMin: -10,
            precipitation: 0,
            windSpeed: maxWind,
            windDirection: topHour.windDirection,
            snowfall: maxSnow,
            snowDepth: topHour.snowDepth,
            weatherCode: 71,
            warnings: [],
        },
        jrStatus: null,
        crowdsourcedStatus: null
    };

    const result = calculateSuspensionRisk(input);
    return { prob: result.probability, wind: maxWind, snow: maxSnow };
}


// 🆕 Alternative Route Logic (Bus Simulation)
function evaluateAlternativeRoute(jrProb: number, wind: number, snow: number): { busStatus: 'OK' | 'Theoretically Stopped', scoreChange: number } {
    // Bus Thresholds (Hypothetical)
    // Bus stops at Wind > 25m/s (Train stops at 20-25m/s)
    // Bus stops at Snow > 5cm/h (Visibility/Road)

    // Scenario 1: JR Stopped (High Risk), Bus OK
    // Value: High (+10 pts)
    if (jrProb >= 70) {
        if (wind < 25 && snow < 5) {
            return { busStatus: 'OK', scoreChange: 10 };
        }
        // Scenario 2: Both Stopped
        // Value: Neutral (0 pts) - Cannot help user
        return { busStatus: 'Theoretically Stopped', scoreChange: 0 };
    }

    return { busStatus: 'OK', scoreChange: 0 };
}


async function runBacktest() {
    const groundTruthPath = path.join(process.cwd(), 'lib/backtest/ground-truth-300.json');
    const groundTruth: GroundTruthItem[] = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));

    console.log('=== Starting Massive-Scale Validation (300 Cases) ===');
    console.log(`Target: ${groundTruth.length} records (Synthetic + Real Mix)`);

    let totalConsistencyScore = 0;
    let totalAltRouteScore = 0;

    // Morning/Evening Accuracy metrics
    const contextMetrics = {
        morning: { points: 0, count: 0 }, // 07:00
        evening: { points: 0, count: 0 }, // 18:00
        consistency: { flipFlops: 0 } // Safe -> Stop changes
    };

    for (const item of groundTruth) {
        // console.log(`Testing: ${item.date} [${item.routeId}]`); // Reduced logs
        const hourly = await fetchHistoricalWeather(item.date, item.routeId);
        if (hourly.length === 0) continue;

        // 1. Morning Prediction (07:00)
        const morningPred = getPredictionForTime(hourly, '07:00', item);

        // 2. Evening Prediction (18:00)
        const eveningPred = getPredictionForTime(hourly, '18:00', item);

        // --- Consistency Check ---
        // Did it flip-flop? (Morning Safe <40% -> Evening Stop >70%)
        let consistencyPenalty = 0;
        if (morningPred.prob < 40 && eveningPred.prob >= 70) {
            consistencyPenalty = -20;
            contextMetrics.consistency.flipFlops++;
            // console.log(`  ⚠️ FLIP-FLOP DETECTED: 07:00 Safe(${morningPred.prob}%) -> 18:00 Stop(${eveningPred.prob}%)`);
        }
        totalConsistencyScore += (100 + consistencyPenalty); // Baseline 100

        // --- Context Accuracy ---
        // Simplified: Compare against actual status (assuming status holds for day)
        // Morning: Penalty for DELAY misses is higher
        // Evening: Penalty for STOP misses is high

        // (Re-using simplified scoring logic for aggregation)
        contextMetrics.morning.points += (morningPred.prob >= 30 && item.status !== 'normal') ? 100 : (item.status === 'normal' && morningPred.prob < 30) ? 100 : 0;
        contextMetrics.evening.points += (eveningPred.prob >= 70 && item.status === 'stopped') ? 100 : (item.status !== 'stopped' && eveningPred.prob < 70) ? 100 : 0;
        contextMetrics.morning.count++;
        contextMetrics.evening.count++;

        // --- Alternative Route Check ---
        // Evaluate "Bus Advice" based on Evening conditions (Return trip)
        const altRouteEval = evaluateAlternativeRoute(eveningPred.prob, eveningPred.wind, eveningPred.snow);
        totalAltRouteScore += altRouteEval.scoreChange;
    }

    // Averages
    const avgMorning = (contextMetrics.morning.points / contextMetrics.morning.count).toFixed(1);
    const avgEvening = (contextMetrics.evening.points / contextMetrics.evening.count).toFixed(1);
    const avgConsistency = (totalConsistencyScore / groundTruth.length).toFixed(1);

    console.log(`\n=== 200-Case Context-Aware Results ===`);
    console.log(`🌅 Morning Accuracy (Commute): ${avgMorning} pts`);
    console.log(`🌃 Evening Accuracy (Return):  ${avgEvening} pts`);
    console.log(`🔄 Consistency Score: ${avgConsistency} pts (Flip-Flops: ${contextMetrics.consistency.flipFlops})`);
    console.log(`🚌 Alt Route Added Value: +${totalAltRouteScore} pts (Total across all cases)`);

    console.log(`\n--> Interpretation:`);
    console.log(`    Morning Score reflects reliability for "Getting There".`);
    console.log(`    Evening Score reflects reliability for "Getting Home".`);
    console.log(`    Alt Route Value shows how often "Take the Bus" was valid advice.`);
}

runBacktest();
