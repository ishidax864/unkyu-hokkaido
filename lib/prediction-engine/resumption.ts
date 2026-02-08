import { WeatherForecast } from '@/lib/types';


interface ResumptionPrediction {
    estimatedResumption: string | null; // HH:MM or null
    safetyWindowStart: string | null;
    requiredBufferHours: number;
    reason: string;
}

/**
 * Predicts the estimated resumption time based on hourly weather forecasts.
 * @param hourlyForecasts Array of hourly forecasts starting from the current time or suspension time.
 * @param routeId Route ID for specific wind thresholds.
 * @returns Prediction object.
 */
export function calculateResumptionTime(
    hourlyForecasts: WeatherForecast[],
    routeId: string
): ResumptionPrediction {
    let safetyStartTime: string | null = null;
    let safetyStartIndex = -1;

    // 1. Find the "Safety Window" (3 consecutive safe hours)
    for (let i = 0; i < hourlyForecasts.length - 2; i++) {
        const h1 = hourlyForecasts[i];
        const h2 = hourlyForecasts[i + 1];
        const h3 = hourlyForecasts[i + 2];

        if (isConditionSafe(h1, routeId) && isConditionSafe(h2, routeId) && isConditionSafe(h3, routeId)) {
            safetyStartTime = h1.targetTime || '00:00'; // Default if undefined
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

    // 2. Calculate Total Snowfall during the "Unsafe" period (from start of forecast to safety window)
    // Assuming hourlyForecasts starts from NOW.
    let totalSnow = 0;
    for (let i = 0; i < safetyStartIndex; i++) {
        totalSnow += hourlyForecasts[i].snowfall || 0;
    }

    // 3. Determine Maintenance Buffer
    let buffer = 1; // Base: Safety Check (1h)
    let reason = '安全確認（1時間）';

    if (totalSnow >= 30) {
        buffer = 5; // Massive snow clearing
        reason = '大規模除雪・排雪（5時間以上）';
    } else if (totalSnow >= 10) {
        buffer = 3; // Standard snow clearing
        reason = '除雪作業（3時間程度）';
    } else if (totalSnow >= 5) {
        buffer = 2; // Light snow clearing
        reason = '除雪・点検（2時間程度）';
    }

    // 4. Calculate Final Time
    const [startHour, startMin] = safetyStartTime.split(':').map(Number);
    let resumeHour = startHour + buffer;

    // Handle day rollover (simplified for now, returns >24h if generic)
    if (resumeHour >= 24) {
        resumeHour -= 24;
        reason += ' (翌日)';
    }

    const resumeTimeStr = `${String(resumeHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

    return {
        estimatedResumption: resumeTimeStr,
        safetyWindowStart: safetyStartTime,
        requiredBufferHours: buffer,
        reason
    };
}

/**
 * Helper: Check if a single hour is "Safe" for resumption.
 * Stricter than normal operation? No, usually same threshold.
 * Resume if wind < 20m/s (or regulated) and snow < 2cm/h.
 */
function isConditionSafe(weather: WeatherForecast, routeId: string): boolean {
    // Wind Check (Use existing logic or simplified threshold)
    // 25m/s is STOP, 20m/s is SLOW. To RESUME, we want < 20m/s ideally, or steady < 25m/s.
    // Let's use 20m/s as a safe resumption baseline unless route specific.

    const windThreshold = 20;
    // Note: Chitose/Hakodate might have higher tolerance, but for resumption we are conservative.

    if (weather.windSpeed >= windThreshold) return false;

    // Snow Check: Heavy snow (>3cm/h) makes point switching difficult
    if ((weather.snowfall || 0) >= 3) return false;

    return true;
}
