
import { PredictionInput } from '../types';

export interface PreparedInput {
    effectiveTargetTime: string;
    isNonOperatingHour: boolean;
    todayJST: string;
    isNearRealTime: boolean;
    calculationInput: PredictionInput;
}

/**
 * Normalizes input, handles timezones, and determines if it's a non-operating hour query.
 */
export function preparePredictionInput(input: PredictionInput): PreparedInput {
    // 1. Timezone-aware today check (JST)
    const todayJST = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(new Date());

    // 2. Non-Operating Hours Logic (00:00 - 05:00)
    // If user queries late night, shift prediction to first train (06:00)
    let effectiveTargetTime = input.targetTime || '00:00';
    let isNonOperatingHour = false;
    const targetHour = parseInt(effectiveTargetTime.split(':')[0]);

    if (targetHour >= 0 && targetHour < 5) {
        effectiveTargetTime = '06:00';
        isNonOperatingHour = true;
    }

    // 3. Near Real-Time Check
    // If target time is within 45 mins of current time, treat as real-time.
    const now = new Date();
    const targetDateTime = new Date(`${input.targetDate}T${input.targetTime}:00`);
    const diffMinutes = Math.abs(targetDateTime.getTime() - now.getTime()) / (1000 * 60);
    const isNearRealTime = diffMinutes <= 45;

    const calculationInput = { ...input, targetTime: effectiveTargetTime };

    return {
        effectiveTargetTime,
        isNonOperatingHour,
        todayJST,
        isNearRealTime,
        calculationInput
    };
}
