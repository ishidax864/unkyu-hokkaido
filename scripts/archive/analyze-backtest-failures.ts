
import fs from 'fs';
import path from 'path';

// Types (simplified)
interface ErrorCase {
    date: string;
    route: string;
    actual: string;
    predicted: string;
    errorType: 'FN' | 'FP';
    predictions: {
        morning: { prob: number; wind: number; snow: number };
        afternoon: { prob: number; wind: number; snow: number };
        evening: { prob: number; wind: number; snow: number };
    };
}

interface BacktestResults {
    errorCases: ErrorCase[];
}

async function analyzeFailures() {
    const resultsPath = path.join(process.cwd(), 'lib/backtest/results-600.json');
    if (!fs.existsSync(resultsPath)) {
        console.error('Results file not found');
        return;
    }

    const results: BacktestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

    console.log('📊 Analyzing Prediction Failures...');

    // 1. Analyze Missed Suspensions (False Negatives - Actual: Stopped, Predicted: Normal/Delayed)
    const missedSuspensions = results.errorCases.filter(c => c.actual === 'stopped' && c.predicted !== 'stopped');
    console.log(`\n❌ Missed Suspensions (False Negatives): ${missedSuspensions.length} cases`);

    // Group by Route
    const routeFailures: Record<string, number> = {};
    missedSuspensions.forEach(c => {
        routeFailures[c.route] = (routeFailures[c.route] || 0) + 1;
    });

    console.log('\n--- By Route ---');
    Object.entries(routeFailures)
        .sort(([, a], [, b]) => b - a)
        .forEach(([route, count]) => console.log(`${route}: ${count}`));

    // Detail Analysis of Top Misses
    console.log('\n--- Top 5 Missed Suspension Details ---');
    missedSuspensions.slice(0, 5).forEach(c => {
        const p = c.predictions.morning; // specific time might vary, just scoping morning for now
        console.log(`[${c.date}] ${c.route}`);
        console.log(`  Actual: ${c.actual}, Predicted: ${c.predicted}`);
        console.log(`  Morning Weather - Wind: ${p.wind}m/s, Snow: ${p.snow}cm, Prob: ${p.prob}%`);
    });

    // 2. Analyze Missed Delays
    const missedDelays = results.errorCases.filter(c => c.actual === 'delayed' && c.predicted === 'normal');
    console.log(`\n⚠️ Missed Delays: ${missedDelays.length} cases`);

    // Group by Route
    const delayFailures: Record<string, number> = {};
    missedDelays.forEach(c => {
        delayFailures[c.route] = (delayFailures[c.route] || 0) + 1;
    });
    console.log('\n--- By Route ---');
    Object.entries(delayFailures)
        .sort(([, a], [, b]) => b - a)
        .forEach(([route, count]) => console.log(`${route}: ${count}`));


    // 3. Analyze False Alarms (False Positives - Actual: Normal, Predicted: Stopped)
    const falseAlarms = results.errorCases.filter(c => c.actual === 'normal' && c.predicted === 'stopped');
    console.log(`\n🚨 False Alarms (False Positives): ${falseAlarms.length} cases`);

    console.log('\n--- Top 5 False Alarm Details ---');
    falseAlarms.slice(0, 5).forEach(c => {
        const p = c.predictions.morning;
        console.log(`[${c.date}] ${c.route}`);
        console.log(`  Actual: ${c.actual}, Predicted: ${c.predicted}`);
        console.log(`  Morning Weather - Wind: ${p.wind}m/s, Snow: ${p.snow}cm, Prob: ${p.prob}%`);
    });
}

analyzeFailures();
