
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
    jrStatus: { status: string; resumptionTime?: string | null } | null | undefined,
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
    if (jrStatus.status === 'suspended' || jrStatus.status === 'cancelled') {
        // If resumption time is set, check if we passed it
        if (jrStatus.resumptionTime) {
            const resumption = new Date(jrStatus.resumptionTime);
            if (targetDateTime.getTime() >= resumption.getTime()) {
                // Passed resumption time -> Treat as Resumed (Delay/Caution)
                return {
                    status: 'delayed', // Or 'resumed' conceptually
                    isOfficialSuspended: false,
                    maxProbabilityCap: 50, // Cap at Delay
                    overrideReason: `【公式発表】運転再開予定時刻（${jrStatus.resumptionTime.substring(11, 16)}）を過ぎているため、運行再開と予測します`
                };
            }
        }

        // If no resumption time OR target is before resumption
        // BUT only if it is TODAY (or we don't handle future suspensions yet, usually they are for today)
        // actually, if it's tomorrow and suspended, it's suspended.
        return {
            status: '運休', // 'suspended'
            isOfficialSuspended: true,
            maxProbabilityCap: undefined, // No cap, allow high risk
            overrideReason: undefined
        };
    }

    // 2. Check for Delay
    if (jrStatus.status === 'delay' || jrStatus.status === 'delayed') {
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
