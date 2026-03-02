#!/usr/bin/env tsx

/**
 * Comprehensive 200 Backtest - Enhanced Accuracy Validation
 * Tests 2000 cases with detailed metrics collection and error analysis
 */

import fs from 'fs';
import path from 'path';
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { PredictionInput } from '../lib/types';

interface HourlyForecast {
    time: string;
    temp: number;
    windSpeed: number;
    precipitation: number;
    snowfall: number;
    snowDepth: number;
    weatherCode: number;
    windDirection: number;
    windGust?: number;
}

interface GroundTruthItem {
    date: string;
    routeId: string;
    status: 'stopped' | 'delayed' | 'normal';
    cause: string;
    notes: string;
}

interface TestResult {
    groundTruth: GroundTruthItem;
    predictions: {
        morning: { prob: number; wind: number; snow: number };
        afternoon: { prob: number; wind: number; snow: number };
        evening: { prob: number; wind: number; snow: number };
    };
    predicted: 'stopped' | 'delayed' | 'normal';
    isCorrect: boolean;
    errorType?: 'FP' | 'FN' | 'None';
}

interface AccuracyMetrics {
    overall: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
    };
    byStatus: {
        stopped: { tp: number; fp: number; fn: number; tn: number };
        delayed: { tp: number; fp: number; fn: number; tn: number };
        normal: { tp: number; fp: number; fn: number; tn: number };
    };
    byRoute: Record<string, { accuracy: number; sampleCount: number }>;
    byTimeOfDay: {
        morning: number;
        afternoon: number;
        evening: number;
    };
    consistency: {
        flipFlopRate: number;
    };
}

// Coordinates
const COORDS: Record<string, { lat: number; lon: number }> = {
    'jr-hokkaido.hakodate-main': { lat: 43.0618, lon: 141.3545 },
    'jr-hokkaido.chitose': { lat: 42.793, lon: 141.693 },
    'jr-hokkaido.sassho': { lat: 43.0618, lon: 141.3545 },
    'jr-hokkaido.muroran': { lat: 42.3137, lon: 140.9744 },
    'jr-hokkaido.nemuro': { lat: 43.3242, lon: 145.5853 },
    'jr-hokkaido.sekihoku': { lat: 43.7677, lon: 142.3658 },
    'jr-hokkaido.soya': { lat: 45.4151, lon: 141.6732 },
    'jr-hokkaido.senmo': { lat: 44.0214, lon: 144.2736 },
    'jr-hokkaido.sekisho': { lat: 43.2057, lon: 142.9992 },
    'jr-hokkaido.rumoi': { lat: 43.9426, lon: 141.637 },
    'jr-hokkaido.hidaka': { lat: 42.3292, lon: 142.7875 },
};

async function fetchHistoricalWeather(date: string, routeId: string): Promise<HourlyForecast[]> {
    const coords = COORDS[routeId] || COORDS['jr-hokkaido.hakodate-main'];
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,precipitation,snowfall,snow_depth,windspeed_10m,winddirection_10m,windgusts_10m&timezone=Asia%2FTokyo`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.hourly) {
            throw new Error(`No hourly data for ${date}`);
        }

        const hourly: HourlyForecast[] = data.hourly.time.map((timeStr: string, index: number) => {
            return {
                time: timeStr.split('T')[1]?.substring(0, 5) || '00:00',
                temp: data.hourly.temperature_2m[index],
                windSpeed: data.hourly.windspeed_10m[index],
                windGust: data.hourly.windgusts_10m ? data.hourly.windgusts_10m[index] : data.hourly.windspeed_10m[index] * 1.3,
                precipitation: data.hourly.precipitation[index],
                snowfall: data.hourly.snowfall[index],
                snowDepth: data.hourly.snow_depth ? data.hourly.snow_depth[index] * 100 : 0,
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

function getPredictionForTime(hourly: HourlyForecast[], timeStr: string, item: GroundTruthItem) {
    const targetHour = parseInt(timeStr.split(':')[0]);
    const windowStart = Math.max(0, targetHour - 2);
    const windowEnd = Math.min(23, targetHour + 2);

    const relevantHours = hourly.filter(h => {
        const hTime = parseInt(h.time.split(':')[0]);
        return hTime >= windowStart && hTime <= windowEnd;
    });

    if (relevantHours.length === 0) return { prob: 0, wind: 0, snow: 0 };

    const maxWind = Math.max(...relevantHours.map(h => h.windSpeed));
    const maxGust = Math.max(...relevantHours.map(h => h.windGust || h.windSpeed * 1.3));
    const maxSnow = Math.max(...relevantHours.map(h => h.snowfall));
    const avgTemp = relevantHours.reduce((a, h) => a + h.temp, 0) / relevantHours.length;
    const topHour = relevantHours.find(h => h.windSpeed === maxWind) || relevantHours[0];

    const input: PredictionInput = {
        routeId: item.routeId,
        routeName: 'Backtest Route',
        targetDate: item.date,
        targetTime: timeStr,
        weather: {
            date: item.date,
            weather: 'snow',
            tempMax: avgTemp + 2,
            tempMin: avgTemp - 2,
            precipitation: 0,
            windSpeed: maxWind,
            windGust: maxGust,
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

function predictStatus(predictions: any): 'stopped' | 'delayed' | 'normal' {
    // Use evening prediction as primary (worst case)
    const prob = predictions.evening.prob;

    if (prob >= 70) return 'stopped';
    if (prob >= 30) return 'delayed';
    return 'normal';
}

async function runComprehensiveBacktest() {
    const groundTruthPath = path.join(process.cwd(), 'lib/backtest/ground-truth-600.json');

    if (!fs.existsSync(groundTruthPath)) {
        console.error('❌ ground-truth-600.json not found. Please run create-optimization-dataset.ts first.');
        process.exit(1);
    }

    const groundTruth: GroundTruthItem[] = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  Comprehensive 2000-Case Accuracy Validation         ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log(`📊 Testing ${groundTruth.length} cases...\n`);

    const results: TestResult[] = [];
    let processed = 0;

    for (const item of groundTruth) {
        const hourly = await fetchHistoricalWeather(item.date, item.routeId);
        if (hourly.length === 0) {
            processed++;
            continue;
        }

        const predictions = {
            morning: getPredictionForTime(hourly, '07:00', item),
            afternoon: getPredictionForTime(hourly, '12:00', item),
            evening: getPredictionForTime(hourly, '18:00', item)
        };

        const predicted = predictStatus(predictions);
        const isCorrect = predicted === item.status;

        let errorType: 'FP' | 'FN' | 'None' = 'None';
        if (!isCorrect) {
            if (predicted !== 'normal' && item.status === 'normal') errorType = 'FP';
            if (predicted === 'normal' && item.status !== 'normal') errorType = 'FN';
        }

        results.push({
            groundTruth: item,
            predictions,
            predicted,
            isCorrect,
            errorType
        });

        processed++;
        if (processed % 100 === 0) {
            console.log(`  ⏳ Processed ${processed}/${groundTruth.length} cases...`);
        }
    }

    console.log(`\n✅ Testing complete! Processed ${results.length} cases\n`);

    // Calculate metrics
    const metrics = calculateMetrics(results);

    // Print results
    printResults(metrics, results);

    // Save detailed results
    const outputPath = path.join(process.cwd(), 'lib/backtest/results-600.json');
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalCases: results.length,
        metrics,
        errorCases: results.filter(r => !r.isCorrect).map(r => ({
            date: r.groundTruth.date,
            route: r.groundTruth.routeId,
            actual: r.groundTruth.status,
            predicted: r.predicted,
            errorType: r.errorType,
            predictions: r.predictions
        }))
    }, null, 2));

    console.log(`\n💾 Detailed results saved to: ${outputPath}\n`);
}

function calculateMetrics(results: TestResult[]): AccuracyMetrics {
    const total = results.length;
    const correct = results.filter(r => r.isCorrect).length;

    // Confusion matrix for each status
    const byStatus = {
        stopped: { tp: 0, fp: 0, fn: 0, tn: 0 },
        delayed: { tp: 0, fp: 0, fn: 0, tn: 0 },
        normal: { tp: 0, fp: 0, fn: 0, tn: 0 }
    };

    for (const r of results) {
        for (const status of ['stopped', 'delayed', 'normal'] as const) {
            const actualIs = r.groundTruth.status === status;
            const predictedIs = r.predicted === status;

            if (actualIs && predictedIs) byStatus[status].tp++;
            else if (!actualIs && predictedIs) byStatus[status].fp++;
            else if (actualIs && !predictedIs) byStatus[status].fn++;
            else byStatus[status].tn++;
        }
    }

    // Overall metrics
    const tp = byStatus.stopped.tp + byStatus.delayed.tp + byStatus.normal.tp;
    const fp = byStatus.stopped.fp + byStatus.delayed.fp + byStatus.normal.fp;
    const fn = byStatus.stopped.fn + byStatus.delayed.fn + byStatus.normal.fn;

    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    // By route
    const byRoute: Record<string, { accuracy: number; sampleCount: number }> = {};
    const routeGroups = results.reduce((acc, r) => {
        if (!acc[r.groundTruth.routeId]) acc[r.groundTruth.routeId] = [];
        acc[r.groundTruth.routeId].push(r);
        return acc;
    }, {} as Record<string, TestResult[]>);

    for (const [route, routeResults] of Object.entries(routeGroups)) {
        const routeCorrect = routeResults.filter(r => r.isCorrect).length;
        byRoute[route] = {
            accuracy: (routeCorrect / routeResults.length) * 100,
            sampleCount: routeResults.length
        };
    }

    // Flip-flop rate
    let flipFlops = 0;
    for (const r of results) {
        if (r.predictions.morning.prob < 40 && r.predictions.evening.prob >= 70) {
            flipFlops++;
        }
    }

    return {
        overall: {
            accuracy: (correct / total) * 100,
            precision: precision * 100,
            recall: recall * 100,
            f1Score: f1Score * 100
        },
        byStatus,
        byRoute,
        byTimeOfDay: {
            morning: 0, // Simplified for now
            afternoon: 0,
            evening: 0
        },
        consistency: {
            flipFlopRate: (flipFlops / total) * 100
        }
    };
}

function printResults(metrics: AccuracyMetrics, results: TestResult[]) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  📊 COMPREHENSIVE ACCURACY METRICS');
    console.log('═══════════════════════════════════════════════════════\n');

    // Overall
    console.log('■ Overall Performance:');
    console.log(`  Accuracy:  ${metrics.overall.accuracy.toFixed(2)}%`);
    console.log(`  Precision: ${metrics.overall.precision.toFixed(2)}%`);
    console.log(`  Recall:    ${metrics.overall.recall.toFixed(2)}%`);
    console.log(`  F1 Score:  ${metrics.overall.f1Score.toFixed(2)}%\n`);

    // By status
    console.log('■ By Status:');
    for (const [status, cm] of Object.entries(metrics.byStatus)) {
        const precision = cm.tp / (cm.tp + cm.fp) || 0;
        const recall = cm.tp / (cm.tp + cm.fn) || 0;
        console.log(`  ${status.toUpperCase()}:`);
        console.log(`    Precision: ${(precision * 100).toFixed(1)}% | Recall: ${(recall * 100).toFixed(1)}%`);
    }
    console.log();

    // Top 5 routes by accuracy
    console.log('■ Top Routes:');
    const sortedRoutes = Object.entries(metrics.byRoute)
        .sort((a, b) => b[1].accuracy - a[1].accuracy)
        .slice(0, 5);
    for (const [route, stats] of sortedRoutes) {
        console.log(`  ${route}: ${stats.accuracy.toFixed(1)}% (n=${stats.sampleCount})`);
    }
    console.log();

    // Consistency
    console.log('■ Consistency:');
    console.log(`  Flip-Flop Rate: ${metrics.consistency.flipFlopRate.toFixed(2)}%\n`);

    // Error analysis
    const errors = results.filter(r => !r.isCorrect);
    console.log('■ Error Analysis:');
    console.log(`  Total Errors: ${errors.length}/${results.length} (${(errors.length / results.length * 100).toFixed(1)}%)`);
    console.log(`  False Positives: ${errors.filter(r => r.errorType === 'FP').length}`);
    console.log(`  False Negatives: ${errors.filter(r => r.errorType === 'FN').length}\n`);

    console.log('═══════════════════════════════════════════════════════\n');
}

runComprehensiveBacktest();
