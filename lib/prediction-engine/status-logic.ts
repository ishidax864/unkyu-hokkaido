
import { JRStatusItem, OperationStatus } from '../types';

export interface BaseStatusResult {
    status: OperationStatus | 'partial' | 'unknown';
    isOfficialSuspended: boolean;  // True if officially suspended AND not yet resumed
    isPostResumptionChaos?: boolean; // 🆕 True if within chaos window after resumption
    isPartialSuspension?: boolean;   // 🆕 True if "Partial Suspension" detected
    partialSuspensionText?: string;  // 🆕 Official text describing the partial suspension
    minProbability: number;        // 🆕 Minimum floor (e.g. 60 for partial)
    maxProbability: number;        // 🆕 Maximum cap (e.g. 75 for delay)
    overrideReason?: string;       // Reason for the override
}

/**
 * Determines the effective base status from JR official information.
 * Single source of truth for probability constraints.
 */
export function determineBaseStatus(
    jrStatus: { status: string; resumptionTime?: string | null; rawText?: string; statusText?: string } | null | undefined,
    targetDate: string,
    targetTime: string,
    snowDepth: number = 0
): BaseStatusResult {
    // Default: No official info -> Wide bounds (0-100)
    if (!jrStatus) {
        return { status: 'unknown', isOfficialSuspended: false, minProbability: 0, maxProbability: 100 };
    }

    const todayJST = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(new Date());

    const isToday = targetDate === todayJST;
    const targetDateTime = new Date(`${targetDate}T${targetTime}:00`);
    const rawText = jrStatus.rawText || jrStatus.statusText || '';

    // 1. Partial Suspension Detection (High Priority)
    const partialKeywords = ['一部の列車', '部分運休', '本数を減ら', '間引き', '一部区間', '区間運休', '一部運休', '減便', '列車を一部'];
    const isPartialSuspension = partialKeywords.some(k => rawText.includes(k)) || jrStatus.status === 'partial';

    if (isPartialSuspension) {
        return {
            status: '遅延',
            isOfficialSuspended: false,
            isPartialSuspension: true,
            partialSuspensionText: rawText,
            minProbability: 60, // Floor 60% (High Risk)
            maxProbability: 95, // Allow up to 95% if weather is extreme, but not 100%
            overrideReason: `【公式】一部の列車で運休・遅延が発生しています`
        };
    }

    // 2. Full Suspension / Cancellation Logic
    const hasSuspensionKeywords = (rawText.includes('運休') || rawText.includes('見合わせ'));
    const isSuspendedStatus = jrStatus.status === 'suspended' || jrStatus.status === 'cancelled' || hasSuspensionKeywords;

    if (isSuspendedStatus) {
        // If resumption time is provided, check if we are in chaos or normal period
        if (jrStatus.resumptionTime) {
            const resumptionDate = new Date(jrStatus.resumptionTime);
            const chaosHours = snowDepth >= 30 ? 3 : 2;
            const chaosEndTime = new Date(resumptionDate.getTime() + chaosHours * 60 * 60 * 1000);

            // Target is AFTER resumption but BEFORE chaos end
            if (targetDateTime >= resumptionDate && targetDateTime <= chaosEndTime) {
                return {
                    status: '遅延',
                    isOfficialSuspended: false,
                    isPostResumptionChaos: true,
                    minProbability: 60,
                    maxProbability: 100,
                    overrideReason: `【公式】運転再開直後（${chaosHours}時間以内）のため、大規模なダイヤ乱れが予想されます`
                };
            }

            // Target is AFTER chaos end
            if (targetDateTime > resumptionDate) {
                return {
                    status: '遅延',
                    isOfficialSuspended: false,
                    minProbability: 20,
                    maxProbability: 100, // Weather can still cause re-suspension
                    overrideReason: `【公式】運転再開（${jrStatus.resumptionTime.substring(11, 16)}頃再開）後の遅延・ダイヤ乱れの可能性があります`
                };
            }
        }

        // BEFORE Resumption (or no resumption info) -> FORCE 100%
        return {
            status: '運休',
            isOfficialSuspended: true,
            minProbability: 100,
            maxProbability: 100,
            overrideReason: jrStatus.resumptionTime
                ? `【公式】運転見合わせ中（${jrStatus.resumptionTime.substring(11, 16)}頃再開見込み）`
                : `【公式】現在、運転を見合わせています`
        };
    }

    // 3. Simple Delay
    if (jrStatus.status === 'delay') {
        return {
            status: '遅延',
            isOfficialSuspended: false,
            minProbability: 40,
            maxProbability: 75,
            overrideReason: `【公式】列車に遅れが生じています`
        };
    }

    // 4. Normal
    if (jrStatus.status === 'normal') {
        return {
            status: '平常運転',
            isOfficialSuspended: false,
            minProbability: 0,
            maxProbability: 75, // Cap weather risk if JR says Normal (Wolf Boy safeguard)
            overrideReason: undefined
        };
    }

    return { status: 'unknown', isOfficialSuspended: false, minProbability: 0, maxProbability: 100 };
}
