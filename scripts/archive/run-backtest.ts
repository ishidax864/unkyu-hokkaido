/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from 'fs';
import path from 'path';
import { fetchHistoricalWeather } from '@/lib/backtest/weather-loader';
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
import { calculateResumptionTime } from '@/lib/prediction-engine/resumption';
import { PredictionInput, WeatherForecast } from '@/lib/types';

const GROUND_TRUTH_PATH = path.join(process.cwd(), 'lib/backtest/ground-truth.json');

interface GroundTruth {
    date: string;
    routeId: string;
    status: 'stopped' | 'delayed' | 'normal';
    cause: string;
    notes: string;
}

interface TestResult {
    date: string;
    routeId: string;
    actualStatus: string;
    predictedStatus: string; // 'stopped', 'delayed', 'normal'
    probability: number;
    isCorrect: boolean;
    weatherCode: number;
    windSpeed: number;
    snowfall: number;
    resumptionPrediction?: string | null;
}

// 簡易的なリスク確率 -> ステータス変換
function getPredictedStatus(probability: number): 'stopped' | 'delayed' | 'normal' {
    if (probability >= 70) return 'stopped';
    if (probability >= 40) return 'delayed'; // 閾値調整 (通常は20-40くらいで遅延リスクが出る)
    return 'normal';
}

async function runBacktest() {
    console.log('Starting Backtest...');

    // 1. Load Ground Truth
    if (!fs.existsSync(GROUND_TRUTH_PATH)) {
        console.error('Ground truth file not found:', GROUND_TRUTH_PATH);
        return;
    }
    const groundTruth: GroundTruth[] = JSON.parse(fs.readFileSync(GROUND_TRUTH_PATH, 'utf-8'));
    console.log(`Loaded ${groundTruth.length} cases.`);

    const results: TestResult[] = [];
    const errors: any[] = [];

    // Limit for testing (e.g., first 50 cases) or run all? Let's run all but with delay.
    // Or filter significantly.
    // Let's take a sample of 200 cases if possible, or all.
    // The user asked for "200 cases".
    const casesToRun = groundTruth.slice(0, 200);

    for (const testCase of casesToRun) {
        console.log(`Testing: ${testCase.date} ${testCase.routeId} (Actual: ${testCase.status})...`);

        try {
            // 2. Fetch Historical Weather (Hourly)
            // We need hourly data to simulate "throughout the day" risk.
            // The prediction engine typically takes "current weather" or "daily forecast".
            // Let's use the "worst hour" approach to see if ANY time in the day triggered a suspension.
            // Or maybe average?
            // Usually, if wind > 25m/s at any point, it's a suspension day.

            const hourlyForecasts = await fetchHistoricalWeather(testCase.routeId, testCase.date);

            if (!hourlyForecasts || hourlyForecasts.length === 0) {
                console.warn(`No weather data for ${testCase.date} ${testCase.routeId}`);
                continue;
            }

            // Evaluate risk for each hour and take the MAX probability
            let maxProbability = 0;
            let worstWeather: WeatherForecast = hourlyForecasts[0];

            for (const hourWeather of hourlyForecasts) {
                // Mock PredictionInput
                const input: PredictionInput = {
                    routeId: testCase.routeId,
                    routeName: 'Test Route', // Doesn't matter for logic
                    targetDate: testCase.date,
                    targetTime: hourWeather.targetTime,
                    weather: hourWeather,
                    jrStatus: null, // Pure Prediction (No official info)
                    crowdsourcedStatus: null,
                };

                const risk = calculateSuspensionRisk(input);
                if (risk.probability > maxProbability) {
                    maxProbability = risk.probability;
                    worstWeather = hourWeather;
                }
            }

            // 3. Resumption Prediction (if stopped)
            let resumptionTime: string | null = null;
            if (getPredictedStatus(maxProbability) === 'stopped' || testCase.status === 'stopped') {
                // Calculate resumption based on the hourly sequence
                const resumption = calculateResumptionTime(hourlyForecasts, testCase.routeId);
                resumptionTime = resumption.estimatedResumption;
            }

            // 4. Compare
            const predictedStatus = getPredictedStatus(maxProbability);
            // "delayed" in ground truth might match "stopped" prediction? No, strictly different.
            // But verify roughly.

            // Allow loose matching: if actual is 'stopped', predicted 'delayed' is PARTIAL correct?
            // For now, strict match.
            const isCorrect = predictedStatus === testCase.status;

            results.push({
                date: testCase.date,
                routeId: testCase.routeId,
                actualStatus: testCase.status,
                predictedStatus,
                probability: maxProbability,
                isCorrect,
                weatherCode: worstWeather.weatherCode || 0,
                windSpeed: worstWeather.windSpeed,
                snowfall: worstWeather.snowfall || 0,
                resumptionPrediction: resumptionTime
            });

            // Rate limit wait
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (e) {
            console.error(`Error processing ${testCase.date}:`, e);
            errors.push({ case: testCase, error: e });
        }
    }

    // 5. Summary
    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = (correctCount / results.length) * 100;

    // Confusion Matrix
    // Actual \ Predicted | Stopped | Delayed | Normal
    const matrix = {
        stopped: { stopped: 0, delayed: 0, normal: 0, total: 0 },
        delayed: { stopped: 0, delayed: 0, normal: 0, total: 0 },
        normal: { stopped: 0, delayed: 0, normal: 0, total: 0 }
    };

    results.forEach(r => {
        const act = r.actualStatus as 'stopped' | 'delayed' | 'normal';
        const pred = r.predictedStatus as 'stopped' | 'delayed' | 'normal';
        if (matrix[act]) {
            matrix[act][pred]++;
            matrix[act].total++;
        }
    });

    console.log('--- Backtest Summary ---');
    console.log(`Total Cases: ${results.length}`);
    console.log(`Accuracy: ${accuracy.toFixed(2)}%`);
    console.table(matrix);

    // Save details
    fs.writeFileSync(
        path.join(process.cwd(), 'lib/backtest/results.json'),
        JSON.stringify({ summary: { accuracy, matrix }, results }, null, 2)
    );
    console.log('Results saved to lib/backtest/results.json');
}

runBacktest();
