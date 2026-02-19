
import { JRStatusItem, OperationStatus } from '../types';

export interface BaseStatusResult {
    status: OperationStatus | 'partial' | 'unknown';
    isOfficialSuspended: boolean;  // True if officially suspended AND not yet resumed
    maxProbabilityCap?: number;    // If set, cap probability at this value
    overrideReason?: string;       // Reason for the override
}

/**
 * Determines the effective base status from JR official information.
 * Handles resumption time logic and partial suspensions.
 */
export function determineBaseStatus(
    jrStatus: { status: string; resumptionTime?: string | null; rawText?: string; statusText?: string } | null | undefined,
    targetDate: string,
    targetTime: string
): BaseStatusResult {
    // Default: No official info or Normal
    if (!jrStatus) {
        return { status: 'unknown', isOfficialSuspended: false };
    }

    const todayJST = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(new Date());

    const isToday = targetDate === todayJST;
    const targetDateTime = new Date(`${targetDate}T${targetTime}:00`);

    // 1. Check for Suspension / Cancellation
    // 🆕 Robust Fallback: Check raw text for '運休'/'見合わせ' even if status says 'normal' (crawler bug safeguard)
    const rawText = jrStatus.rawText || jrStatus.statusText || '';
    const hasSuspensionKeywords = rawText.includes('運休') || rawText.includes('見合わせ');

    if (jrStatus.status === 'suspended' || jrStatus.status === 'cancelled' || hasSuspensionKeywords) {
        // 🆕 Check if Resumption Time has passed
        if (jrStatus.resumptionTime) {
            const resumptionDate = new Date(jrStatus.resumptionTime);
            // Add 1 hour buffer for "resumed but maybe delayed" state
            // If target time is largely past resumption time, treat as Delay or Normal
            const bufferTime = new Date(resumptionDate.getTime() + 60 * 60 * 1000); // +1 hour

            if (targetDateTime > bufferTime) {
                // Downgrade to Delay (yellow) instead of Suspended (red)
                return {
                    status: '遅延', // 'delay'
                    isOfficialSuspended: false,
                    maxProbabilityCap: 60,
                    overrideReason: `【公式】運転再開（${jrStatus.resumptionTime.substring(11, 16)}頃再開）後の遅延・ダイヤ乱れの可能性があります`
                };
            }
        }

        // 🆕 User Request: If official status is Suspended, FORCE SUSPENDED (100%)
        // Do NOT lower the risk even if targetTime > resumptionTime.
        // The resumption info will be used for display only.
        return {
            status: '運休', // 'suspended'
            isOfficialSuspended: true,
            maxProbabilityCap: undefined, // No cap, allow high risk (will be forced to 100 in index.ts)
            overrideReason: jrStatus.resumptionTime
                ? `【公式発表】運転見合わせ中（${jrStatus.resumptionTime.substring(11, 16)}頃再開見込み）`
                : undefined
        };
    }

    // 2. Check for Delay
    if (jrStatus.status === 'delay') {
        return {
            status: '遅延',
            isOfficialSuspended: false,
            maxProbabilityCap: 60, // Allow up to 60% (Delay) but not Suspended
            overrideReason: undefined
        };
    }

    // 3. Normal
    if (jrStatus.status === 'normal') {
        return {
            status: '平常運転',
            isOfficialSuspended: false,
            maxProbabilityCap: undefined, // Don't strictly cap here, let constraints handle "Wolf Boy"
            overrideReason: undefined
        };
    }

    return { status: 'unknown', isOfficialSuspended: false };
}
