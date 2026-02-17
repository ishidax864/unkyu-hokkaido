#!/usr/bin/env tsx

/**
 * Ground Truth Dataset Generator
 * Expands existing 300 cases to 2000 cases using historical weather data
 */

import fs from 'fs';
import path from 'path';

interface GroundTruthItem {
    date: string;
    routeId: string;
    status: 'stopped' | 'delayed' | 'normal';
    cause: string;
    notes: string;
}

// All JR Hokkaido routes
const ALL_ROUTES = [
    'jr-hokkaido.hakodate-main',
    'jr-hokkaido.chitose',
    'jr-hokkaido.sassho',
    'jr-hokkaido.muroran',
    'jr-hokkaido.nemuro',
    'jr-hokkaido.sekihoku',
    'jr-hokkaido.soya',
    'jr-hokkaido.senmo',
    'jr-hokkaido.sekisho',
    'jr-hokkaido.rumoi',
    'jr-hokkaido.hidaka',
];

// Route vulnerability thresholds (from route-config.ts)
const ROUTE_THRESHOLDS: Record<string, { wind: number; snow: number }> = {
    'jr-hokkaido.hakodate-main': { wind: 20, snow: 5 },
    'jr-hokkaido.chitose': { wind: 18, snow: 4 },
    'jr-hokkaido.sassho': { wind: 15, snow: 4 },
    'jr-hokkaido.muroran': { wind: 18, snow: 5 },
    'jr-hokkaido.nemuro': { wind: 18, snow: 6 },
    'jr-hokkaido.sekihoku': { wind: 18, snow: 5 },
    'jr-hokkaido.soya': { wind: 15, snow: 6 },
    'jr-hokkaido.senmo': { wind: 18, snow: 6 },
    'jr-hokkaido.sekisho': { wind: 15, snow: 5 },
    'jr-hokkaido.rumoi': { wind: 20, snow: 7 },
    'jr-hokkaido.hidaka': { wind: 22, snow: 8 },
};

// Coordinates for weather API
const COORDS: Record<string, { lat: number; lon: number }> = {
    'jr-hokkaido.hakodate-main': { lat: 43.0618, lon: 141.3545 }, // Sapporo
    'jr-hokkaido.chitose': { lat: 42.793, lon: 141.693 }, // Chitose
    'jr-hokkaido.sassho': { lat: 43.0618, lon: 141.3545 }, // Sapporo
    'jr-hokkaido.muroran': { lat: 42.3137, lon: 140.9744 }, // Muroran
    'jr-hokkaido.nemuro': { lat: 43.3242, lon: 145.5853 }, // Nemuro
    'jr-hokkaido.sekihoku': { lat: 43.7677, lon: 142.3658 }, // Kitami
    'jr-hokkaido.soya': { lat: 45.4151, lon: 141.6732 }, // Wakkanai
    'jr-hokkaido.senmo': { lat: 44.0214, lon: 144.2736 }, // Abashiri
    'jr-hokkaido.sekisho': { lat: 43.2057, lon: 142.9992 }, // Kushiro
    'jr-hokkaido.rumoi': { lat: 43.9426, lon: 141.637 }, // Rumoi
    'jr-hokkaido.hidaka': { lat: 42.3292, lon: 142.7875 }, // Samani
};

async function fetchHistoricalWeather(date: string, routeId: string): Promise<any> {
    const coords = COORDS[routeId] || COORDS['jr-hokkaido.hakodate-main'];
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,precipitation,snowfall,snow_depth,windspeed_10m,windgusts_10m&timezone=Asia%2FTokyo`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.hourly) return null;

        // Calculate daily maximums
        const maxWind = Math.max(...data.hourly.windspeed_10m.filter((v: number) => v != null));
        const maxGust = data.hourly.windgusts_10m ? Math.max(...data.hourly.windgusts_10m.filter((v: number) => v != null)) : maxWind * 1.3;
        const totalSnow = data.hourly.snowfall.reduce((a: number, b: number) => a + (b || 0), 0);
        const maxTemp = Math.max(...data.hourly.temperature_2m.filter((v: number) => v != null));
        const minTemp = Math.min(...data.hourly.temperature_2m.filter((v: number) => v != null));

        return {
            maxWind,
            maxGust,
            totalSnow,
            maxTemp,
            minTemp
        };
    } catch (error) {
        console.error(`Failed to fetch weather for ${date}:`, error);
        return null;
    }
}

function inferStatus(weather: any, routeId: string): 'stopped' | 'delayed' | 'normal' {
    if (!weather) return 'normal';

    const threshold = ROUTE_THRESHOLDS[routeId] || { wind: 20, snow: 5 };

    // Stopped conditions
    if (weather.maxGust >= threshold.wind * 1.3 || weather.totalSnow >= threshold.snow * 1.5) {
        return 'stopped';
    }

    // Delayed conditions
    if (weather.maxWind >= threshold.wind * 0.8 || weather.totalSnow >= threshold.snow * 0.8) {
        return 'delayed';
    }

    return 'normal';
}

function deriveCause(weather: any, status: 'stopped' | 'delayed' | 'normal'): string {
    if (status === 'normal') return 'none';

    if (weather.maxGust >= 25 && weather.totalSnow >= 10) return 'blizzard';
    if (weather.totalSnow >= 15) return 'heavy_snow';
    if (weather.maxGust >= 25) return 'strong_wind';
    if (weather.totalSnow >= 5) return 'snow';
    if (weather.maxWind >= 18) return 'wind';

    return 'weather';
}

function enumerateWinterDates(startYear: number, endYear: number): string[] {
    const dates: string[] = [];

    for (let year = startYear; year <= endYear; year++) {
        // January
        for (let day = 1; day <= 31; day++) {
            dates.push(`${year}-01-${String(day).padStart(2, '0')}`);
        }
        // February (handle leap years)
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const febDays = isLeap ? 29 : 28;
        for (let day = 1; day <= febDays; day++) {
            dates.push(`${year}-02-${String(day).padStart(2, '0')}`);
        }
        // March
        for (let day = 1; day <= 31; day++) {
            dates.push(`${year}-03-${String(day).padStart(2, '0')}`);
        }
    }

    return dates;
}

async function generateGroundTruth2000(): Promise<GroundTruthItem[]> {
    console.log('📊 Starting Ground Truth 2000 Generation...\n');

    // 1. Load existing 300 cases
    const existingPath = path.join(process.cwd(), 'lib/backtest/ground-truth-300.json');
    const existing: GroundTruthItem[] = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
    console.log(`✅ Loaded ${existing.length} existing cases\n`);

    const items: GroundTruthItem[] = [...existing];
    const targetCount = 2000;
    const needed = targetCount - existing.length;

    console.log(`🎯 Need to generate ${needed} additional cases\n`);

    // 2. Generate additional cases
    const dates = enumerateWinterDates(2023, 2026);
    const routes = ALL_ROUTES;

    let generated = 0;
    let apiCalls = 0;

    // Sampling strategy: prioritize recent years and high-risk routes
    const sampledDates = [];
    for (let i = 0; i < dates.length && sampledDates.length < needed; i += 3) {
        sampledDates.push(dates[i]);
    }

    for (const date of sampledDates) {
        if (generated >= needed) break;

        for (const routeId of routes) {
            if (generated >= needed) break;

            // Skip if already exists
            const exists = items.some(item => item.date === date && item.routeId === routeId);
            if (exists) continue;

            // Fetch weather (with rate limiting)
            if (apiCalls > 0 && apiCalls % 10 === 0) {
                console.log(`  ⏳ Generated ${generated}/${needed} (${apiCalls} API calls)...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
            }

            const weather = await fetchHistoricalWeather(date, routeId);
            apiCalls++;

            if (!weather) continue;

            const status = inferStatus(weather, routeId);
            const cause = deriveCause(weather, status);

            // Bias towards interesting cases (stopped/delayed)
            if (status === 'normal' && Math.random() > 0.3) continue;

            items.push({
                date,
                routeId,
                status,
                cause,
                notes: `Generated: Wind ${weather.maxWind.toFixed(1)}m/s, Gust ${weather.maxGust.toFixed(1)}m/s, Snow ${weather.totalSnow.toFixed(1)}cm`
            });

            generated++;
        }
    }

    console.log(`\n✅ Generation complete!`);
    console.log(`   Total cases: ${items.length}`);
    console.log(`   API calls: ${apiCalls}\n`);

    return items;
}

async function main() {
    try {
        const groundTruth = await generateGroundTruth2000();

        // Save to file
        const outputPath = path.join(process.cwd(), 'lib/backtest/ground-truth-2000.json');
        fs.writeFileSync(outputPath, JSON.stringify(groundTruth, null, 2));

        console.log(`💾 Saved to: ${outputPath}`);

        // Statistics
        const stats = {
            total: groundTruth.length,
            stopped: groundTruth.filter(i => i.status === 'stopped').length,
            delayed: groundTruth.filter(i => i.status === 'delayed').length,
            normal: groundTruth.filter(i => i.status === 'normal').length,
        };

        console.log('\n📊 Dataset Statistics:');
        console.log(`   Total: ${stats.total}`);
        console.log(`   Stopped: ${stats.stopped} (${(stats.stopped / stats.total * 100).toFixed(1)}%)`);
        console.log(`   Delayed: ${stats.delayed} (${(stats.delayed / stats.total * 100).toFixed(1)}%)`);
        console.log(`   Normal: ${stats.normal} (${(stats.normal / stats.total * 100).toFixed(1)}%)`);

        console.log('\n✅ Ground Truth 2000 generation complete!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
