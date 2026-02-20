
import { JRStatusItem, OperationStatus } from '../types';

export interface BaseStatusResult {
    status: OperationStatus | 'partial' | 'unknown';
    isOfficialSuspended: boolean;  // True if officially suspended AND not yet resumed
    isPostResumptionChaos?: boolean; // 🆕 True if within chaos window after resumption
    isPartialSuspension?: boolean;   // 🆕 True if "Partial Suspension" detected (suppress recovery time)
    partialSuspensionText?: string;  // 🆕 Official text describing the partial suspension
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
    targetTime: string,
    snowDepth: number = 0 // 🆕 Added snowDepth for chaos buffer calculation
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

    // 🆕 Partial Suspension Check (Pre-filter)
    // If text contains "some trains" or "partial", treat as Delay/Caution, NOT Suspended.
    const partialKeywords = ['一部の列車', '部分運休', '本数を減ら', '間引き'];
    const isPartialSuspension = partialKeywords.some(k => rawText.includes(k));

    if (isPartialSuspension) {
        return {
            status: '遅延', // 'delay'
            isOfficialSuspended: false,
            // 🆕 Signal Partial Suspension to suppress "Recovery Time"
            isPartialSuspension: true,
            partialSuspensionText: rawText, // 🆕 Pass the raw text for display
            maxProbabilityCap: undefined, // 🆕 Allow higher risk (e.g. 90%) if weather is severe. Floor is 60% (handled in index.ts).
            overrideReason: `【一部運休・詳細】${rawText}` // Use raw text for reason too
        };
    }

    const hasSuspensionKeywords = (rawText.includes('運休') || rawText.includes('見合わせ'));

    if (jrStatus.status === 'suspended' || jrStatus.status === 'cancelled' || hasSuspensionKeywords) {
        // 🆕 Check if Resumption Time has passed
        if (jrStatus.resumptionTime) {
            const resumptionDate = new Date(jrStatus.resumptionTime);

            // 🆕 Post-Resumption Chaos Logic
            // Base buffer: 2 hours
            // Heavy Snow buffer (>30cm): +1 hour (Total 3 hours)
            const chaosHours = snowDepth >= 30 ? 3 : 2;
            const chaosEndTime = new Date(resumptionDate.getTime() + chaosHours * 60 * 60 * 1000);

            // If target is AFTER resumption but BEFORE chaos end -> CHAOS STATE
            if (targetDateTime >= resumptionDate && targetDateTime <= chaosEndTime) {
                return {
                    status: '遅延', // 'delay'
                    isOfficialSuspended: false,
                    isPostResumptionChaos: true, // 🆕
                    maxProbabilityCap: undefined, // Let index.ts set specific chaos score (e.g. 50-60)
                    overrideReason: `【混雑・遅延】運転再開直後（${chaosHours}時間以内）のため、大幅なダイヤ乱れや積み残しが予想されます`
                };
            }

            // If target is AFTER chaos end -> NORMAL / DELAY (Standard Buffer)
            // Still keep a small buffer (1 hour) for standard "Delay" status without chaos flag
            const standardBufferTime = new Date(resumptionDate.getTime() + 60 * 60 * 1000); // +1 hour

            if (targetDateTime > resumptionDate) {
                // Downgrade to Delay (yellow) baseline, but allow higher risks if weather persists
                return {
                    status: '遅延', // 'delay'
                    isOfficialSuspended: false,
                    maxProbabilityCap: undefined, // 🆕 Allow higher risk (e.g. re-suspension) based on weather
                    overrideReason: `【公式】運転再開（${jrStatus.resumptionTime.substring(11, 16)}頃再開）後の遅延・ダイヤ乱れの可能性があります`
                };
            }
        }

        // 🆕 User Request: Absolute Priority for Official Suspension
        // If official status is Suspended, FORCE SUSPENDED (100%) until the resumption time.
        // Do NOT allow "future safe" logic to lower this risk before the resumption time.
        return {
            status: '運休', // 'suspended'
            isOfficialSuspended: true,
            maxProbabilityCap: undefined, // No cap, will be forced to 100
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
