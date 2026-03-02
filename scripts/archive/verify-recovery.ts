
import fs from 'fs';
import path from 'path';
import { calculateResumptionTime } from '../lib/prediction-engine/resumption';
import { WeatherForecast } from '../lib/types';
import { findHistoricalMatch } from '../lib/historical-data/suspension-patterns';

// Ground Truth Data Type
interface GroundTruthItem {
    date: string; // YYYY-MM-DD
    routeId: string;
    status: 'stopped' | 'delayed' | 'normal';
    cause: string;
    notes: string;
}

const COORDS = {
    SAPPORO: { lat: 43.0618, lon: 141.3545 },
    IWAMIZAWA: { lat: 43.2048, lon: 141.7733 },
    CHITOSE: { lat: 42.793, lon: 141.693 }
};

async function fetch48HourWeather(startDate: string, routeId: string): Promise<WeatherForecast[]> {
    let lat = COORDS.SAPPORO.lat;
    let lon = COORDS.SAPPORO.lon;

    if (routeId.includes('hakodate-main')) {
        lat = COORDS.IWAMIZAWA.lat;
        lon = COORDS.IWAMIZAWA.lon;
    } else if (routeId.includes('chitose')) {
        lat = COORDS.CHITOSE.lat;
        lon = COORDS.CHITOSE.lon;
    }

    const d1 = new Date(startDate);
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + 1);
    const endDate = d2.toISOString().split('T')[0];

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m,precipitation,snowfall,snow_depth,windspeed_10m,winddirection_10m,windgusts_10m&timezone=Asia%2FTokyo`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.hourly) return [];

        return data.hourly.time.map((timeStr: string, index: number) => ({
            date: timeStr.split('T')[0],
            targetTime: timeStr.split('T')[1],
            weather: 'snow',
            tempMax: data.hourly.temperature_2m[index],
            tempMin: data.hourly.temperature_2m[index],
            precipitation: data.hourly.precipitation[index],
            snowfall: data.hourly.snowfall[index],
            snowDepth: data.hourly.snow_depth[index] * 100,
            windSpeed: data.hourly.windspeed_10m[index],
            windGust: data.hourly.windgusts_10m[index],
            weatherCode: 71,
        }));
    } catch {
        return [];
    }
}

function timeToHours(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
}

async function runPrecisionVerification() {
    const groundTruthPath = path.join(process.cwd(), 'lib/backtest/ground-truth.json');
    const groundTruth: GroundTruthItem[] = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));

    const stoppedCases = groundTruth.filter(item => item.status === 'stopped');
    console.log(`Analyzing precision for ${stoppedCases.length} Stopped cases...`);

    let totalError = 0;
    let validCases = 0;
    let hitCount = 0; // Within 2 hours
    let underPrediction = 0; // Too optimistic
    let overPrediction = 0; // Too pessimistic

    for (const item of stoppedCases) {
        const hourly = await fetch48HourWeather(item.date, item.routeId);
        if (hourly.length === 0) continue;

        // 1. Identify the *Actual Event Start* (First unsafe hour)
        let firstUnsafeIndex = hourly.findIndex(h => !isConditionSafeForTarget(h));
        if (firstUnsafeIndex === -1) firstUnsafeIndex = 0;

        const firstUnsafeHour = timeToHours(hourly[firstUnsafeIndex].targetTime || '06:00');

        // Find Peak Weather for Matching (Consistent with resumption.ts)
        const peakSnowInEvent = Math.max(...hourly.map(h => h.snowfall || 0));
        const peakWindInEvent = Math.max(...hourly.map(h => h.windSpeed || 0));
        const peakGustInEvent = Math.max(...hourly.map(h => h.windGust || 0));

        const repWeather = hourly.find(h => (h.snowfall || 0) === peakSnowInEvent) || hourly[0];
        const match = findHistoricalMatch({
            ...repWeather,
            windSpeed: peakWindInEvent,
            windGust: peakGustInEvent
        });

        if (!match) continue;

        // "Actual" Resumption based on Historical Pattern from the FIRST unsafe hour
        let actualResumptionTotalHours = firstUnsafeHour + match.consequences.typicalDurationHours;

        // Realistic constraint: Trains don't start at 02:00 AM
        const hourOfDay = actualResumptionTotalHours % 24;
        if (hourOfDay >= 0 && hourOfDay < 5) {
            actualResumptionTotalHours += (6 - hourOfDay);
        }

        // 2. Predict at 3 hours AFTER the event started (or 09:00, whichever is later)
        const predictionStartTime = Math.max(9, firstUnsafeHour + 3);
        const subHourly = hourly.filter(h => {
            const hTime = timeToHours(h.targetTime || '00:00');
            const d = (new Date(h.date)).getTime();
            const startD = (new Date(item.date)).getTime();
            if (d === startD) return hTime >= predictionStartTime;
            return true;
        });

        const predictionResult = calculateResumptionTime(subHourly, item.routeId, match, firstUnsafeHour, item.date);

        if (!predictionResult.estimatedResumption) {
            console.log(`- Skipping ${item.date}: No resumption predicted`);
            continue;
        }

        // Only evaluate if Actual Resumption is in the FUTURE relative to prediction start
        if (actualResumptionTotalHours < predictionStartTime) {
            // console.log(`- Skipping ${item.date}: Already recovered in history at ${actualResumptionTotalHours}h vs Prediction start ${predictionStartTime}h`);
            continue;
        }

        const predictedHour = timeToHours(predictionResult.estimatedResumption);
        let predictedTotalOffset = predictedHour;

        // If predicted date is multi-day
        let rolledDays = 0;
        const matchDays = predictionResult.reason.match(/【(\d+)日後】/);
        if (matchDays) {
            rolledDays = parseInt(matchDays[1]);
        } else if (predictionResult.reason.includes('翌日')) {
            rolledDays = 1;
        }

        predictedTotalOffset += (rolledDays * 24);

        const error = predictedTotalOffset - actualResumptionTotalHours;
        totalError += Math.abs(error);
        validCases++;

        if (Math.abs(error) > 2) {
            console.log(`- ${item.date} [${match.label}]: Start ${firstUnsafeHour}h | Actual ~${actualResumptionTotalHours.toFixed(1)}h vs Pred ~${predictedTotalOffset.toFixed(1)}h (Error: ${error.toFixed(1)}h)`);
        }

        if (Math.abs(error) <= 2) hitCount++;
        if (error < -2) underPrediction++;
        if (error > 2) overPrediction++;
    }

    // Helper for the script
    function isConditionSafeForTarget(weather: WeatherForecast): boolean {
        // Simplified version matching resumption.ts logic
        if (weather.windSpeed >= 22) return false;
        if ((weather.snowfall || 0) >= 2.5) return false;
        return true;
    }

    const mae = totalError / validCases;
    const accuracy = (hitCount / validCases) * 100;

    console.log('\n=== Recovery Time Precision Report ===');
    console.log(`Valid Test Cases: ${validCases}`);
    console.log(`MAE (Mean Absolute Error): ${mae.toFixed(2)} hours`);
    console.log(`Accuracy (within ±2h): ${accuracy.toFixed(1)}%`);
    console.log(`Bias: Optimistic: ${underPrediction}, Pessimistic: ${overPrediction}, Within Range: ${hitCount}`);

    console.log('\n--> Interpretation:');
    if (underPrediction > overPrediction) {
        console.log('    AI is currently TOO OPTIMISTIC (predicts earlier than history). Increase buffers.');
    } else if (overPrediction > underPrediction) {
        console.log('    AI is currently TOO PESSIMISTIC (predicts later than history). Decrease buffers.');
    } else {
        console.log('    AI is relatively balanced but can be tightened.');
    }
}

runPrecisionVerification();
