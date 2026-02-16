import { WeatherForecast } from '@/lib/types';


interface ResumptionPrediction {
    estimatedResumption: string | null; // HH:MM or null
    safetyWindowStart: string | null;
    requiredBufferHours: number;
    reason: string;
}

import { findHistoricalMatch, HistoricalPattern } from '../historical-data/suspension-patterns';
import { getRouteVulnerability } from './route-config';

/**
 * Predicts the estimated resumption time based on hourly weather forecasts.
 * @param hourlyForecasts Array of hourly forecasts starting from the current time or suspension time.
 * @param routeId Route ID for specific wind thresholds.
 * @returns Prediction object.
 */
export function calculateResumptionTime(
    hourlyForecasts: WeatherForecast[],
    routeId: string,
    providedMatch?: HistoricalPattern | null,
    eventStartHour?: number,
    eventStartDate?: string // 🆕 運休開始日の日付
): ResumptionPrediction {
    let safetyStartTime: string | null = null;
    let safetyStartIndex = -1;

    // 0. Calculate Peak Intensities first
    const peakSnow = Math.max(...hourlyForecasts.map(h => h.snowfall || 0));
    const peakWind = Math.max(...hourlyForecasts.map(h => h.windSpeed || 0));
    const peakGust = Math.max(...hourlyForecasts.map(h => h.windGust || 0));

    // 1. Find the "Safety Window"
    // In severe weather, we need more stability (4 hours instead of 3)
    const safetyWindowSize = (peakSnow > 5 || peakWind > 20) ? 4 : 3;

    for (let i = 0; i < hourlyForecasts.length - (safetyWindowSize - 1); i++) {
        const window = hourlyForecasts.slice(i, i + safetyWindowSize);
        if (window.every(h => isConditionSafe(h, routeId))) {
            safetyStartTime = window[0].targetTime || '00:00';
            safetyStartIndex = i;
            break;
        }
    }

    if (!safetyStartTime || safetyStartIndex === -1) {
        return {
            estimatedResumption: null,
            safetyWindowStart: null,
            requiredBufferHours: 0,
            reason: '気象状況の回復が見込まれません'
        };
    }

    // 2. Identify "Historical Pattern" Baseline
    // If provided, use that. Otherwise, calculate from current sequence.
    const historicalMatch = providedMatch || findHistoricalMatch({
        ...hourlyForecasts.find(h => (h.snowfall || 0) === peakSnow) || hourlyForecasts[0],
        windSpeed: peakWind,
        windGust: peakGust
    });

    // 3. Calculate Environmental Factors during the "Unsafe" period
    let totalSnow = 0;
    let maxTemp = -999;
    for (let i = 0; i < safetyStartIndex; i++) {
        totalSnow += hourlyForecasts[i].snowfall || 0;
        const currentTemp = hourlyForecasts[i].tempMax ?? hourlyForecasts[i].tempMin ?? -5;
        if (currentTemp > maxTemp) maxTemp = currentTemp;
    }

    // 4. Determine Maintenance Buffer (Dynamic & Granular)
    // Base Mobilization: 1.0h - 1.5h depending on peak intensity
    const mobilization = (peakSnow > 2 || peakWind > 15) ? 1.5 : 1.0;

    let buffer = mobilization;
    let reason = `安全確認・点検（${mobilization}時間）`;

    // 雪かきバッファ（連続的な計算へ）
    // 基本: 1.0h + (総降雪量 * 係数)
    // 係数は路線特性（vuln.vulnerabilityScore）に連動
    const vuln = getRouteVulnerability(routeId);
    const snowWeight = 0.12 * vuln.vulnerabilityScore; // 1cmにつき約7-10分

    if (totalSnow > 0) {
        const snowBuffer = Math.min(totalSnow * snowWeight, 8); // 最大8時間
        buffer += snowBuffer;

        if (totalSnow >= 30) {
            reason = `大規模な除雪・排雪作業（${Math.ceil(buffer)}時間以上）`;
        } else if (totalSnow >= 10) {
            reason = `除雪・点検作業（${Math.ceil(buffer)}時間程度）`;
        } else {
            reason = `除雪・安全確認（${Math.ceil(buffer)}時間）`;
        }
    }

    // Temperature Adjustment (Wet snow stays longer)
    if (totalSnow > 5 && maxTemp > -1) {
        buffer += 1.0;
        reason = `重い雪（湿った雪）の${reason}`;
    }

    // Wind Damage Check (High peak wind needs more patrol)
    if (peakWind > 25 || peakGust > 35) {
        buffer += 1.0;
        reason = `暴風による設備点検のため${reason}`;
    }

    if (historicalMatch) {
        const histTypicalHours = historicalMatch.consequences.typicalDurationHours;

        // Calculate absolute elapsed hours from event start
        const referenceDate = eventStartDate || hourlyForecasts[0].date;
        const [safetyH, safetyM] = safetyStartTime.split(':').map(Number);
        const safetyDate = hourlyForecasts[safetyStartIndex].date;

        let totalElapsed = safetyH;
        if (safetyDate !== referenceDate) {
            const d1 = new Date(referenceDate);
            const d2 = new Date(safetyDate);
            const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
            totalElapsed += (diffDays * 24);
        }

        const startBase = eventStartHour ?? 6;
        const currentTotalHoursFromStart = (totalElapsed - startBase) + buffer;

        if (currentTotalHoursFromStart < histTypicalHours) {
            const neededTotalBuffer = histTypicalHours - (totalElapsed - startBase);
            if (neededTotalBuffer > buffer) {
                buffer = neededTotalBuffer;
                reason = `【過去の${historicalMatch.label}事例】に基づき${matchTendencyToText(historicalMatch.consequences.recoveryTendency)}。${reason}`;
            }
        }
    }

    // 6. Calculate Final Time (Accounting for multi-day offsets)
    const referenceDate = eventStartDate || hourlyForecasts[0].date;
    const [startHourOfDay, startMin] = safetyStartTime.split(':').map(Number);
    const safetyDate = hourlyForecasts[safetyStartIndex].date;

    let startHour = startHourOfDay;
    if (safetyDate !== referenceDate) {
        const d1 = new Date(referenceDate);
        const d2 = new Date(safetyDate);
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        startHour += (diffDays * 24);
    }

    let resumeHour = startHour + buffer;

    // 7. Apply Nighttime Constraints (JR Hokkaido specific)
    // 夜間は深夜作業後の始発（05:00-06:00）まで再開しにくい
    if (resumeHour >= 0 && resumeHour < 5) {
        resumeHour = 5.5; // 05:30頃
        reason = `深夜の安全確認後、始発より再開見込み`;
    } else if (resumeHour >= 1 && resumeHour < 5.5) {
        // 微調整
        resumeHour = 5.5;
    } else if (resumeHour >= 24) {
        const rolledDays = Math.floor(resumeHour / 24);
        resumeHour = resumeHour % 24;

        const dayLabel = rolledDays === 1 ? '翌日' : `${rolledDays}日後`;

        if (resumeHour < 5.5) {
            resumeHour = 5.5;
            reason = `【${dayLabel}】始発（05:00〜06:00頃）より順次運転再開`;
        } else {
            reason = `【${dayLabel}】${reason}`;
        }
    }

    // console.log(`[DEBUG] Final Resume Hour: ${resumeHour}, Rolled Days: ${Math.floor((startHour + buffer) / 24)}`);
    const resumeTimeStr = `${String(Math.floor(resumeHour)).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

    return {
        estimatedResumption: resumeTimeStr,
        safetyWindowStart: safetyStartTime,
        requiredBufferHours: buffer,
        reason
    };
}

export function matchTendencyToText(tendency: string): string {
    switch (tendency) {
        case 'slow': return '復旧に時間を要する傾向にあります';
        case 'next-day': return '翌日以降の再開となる傾向にあります';
        case 'fast': return '天候回復後は比較的速やかに再開します';
        default: return '';
    }
}

/**
 * Helper: Check if a single hour is "Safe" for resumption.
 */
function isConditionSafe(weather: WeatherForecast, routeId: string): boolean {
    const vuln = getRouteVulnerability(routeId);

    // Wind: Limit is typically slightly above the operation cutoff for "checking"
    const windLimit = vuln.windThreshold + 2;
    if (weather.windSpeed >= windLimit) return false;

    // Snow: 3cm/h is a hard limit for any maintenance to be effective
    const snowLimit = Math.max(vuln.snowThreshold / 2, 2.5);
    if ((weather.snowfall || 0) >= snowLimit) return false;

    return true;
}

