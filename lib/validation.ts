// 入力バリデーション・サニタイズユーティリティ

// =====================
// 型定義
// =====================

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

// =====================
// 駅・路線バリデーション
// =====================

export function isValidStationId(id: unknown): id is string {
    if (typeof id !== 'string') return false;
    // 有効なフォーマット: hokkaido.sapporo, hokkaido.shin-chitose など
    return /^[a-z0-9.-]+$/i.test(id) && id.length <= 50;
}

export function isValidRouteId(id: unknown): id is string {
    if (typeof id !== 'string') return false;
    // 有効なフォーマット: jr-hokkaido.hakodate-main など
    return /^[a-z0-9.-]+$/i.test(id) && id.length <= 100;
}

// =====================
// 日付・時刻バリデーション
// =====================

export function isValidDate(date: unknown): date is string {
    if (typeof date !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return false;

    // 過去30日から未来7日まで許可
    const now = new Date();
    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() - 30);
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 7);

    return parsed >= minDate && parsed <= maxDate;
}

export function isValidTime(time: unknown): time is string {
    if (typeof time !== 'string') return false;
    if (!/^\d{2}:\d{2}$/.test(time)) return false;

    const [hours, minutes] = time.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

// =====================
// サニタイズ
// =====================

export function sanitizeComment(input: unknown): string {
    if (typeof input !== 'string') return '';

    return input
        .trim()
        .slice(0, 200)
        .replace(/<[^>]*>/g, '') // HTMLタグ除去
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/[\x00-\x1F\x7F]/g, ''); // 制御文字除去
}

export function sanitizeString(input: unknown, maxLength = 100): string {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .slice(0, maxLength)
        .replace(/[\x00-\x1F\x7F]/g, '');
}

export function sanitizeUrlParam(param: string | null): string {
    if (!param) return '';
    return encodeURIComponent(param.trim().slice(0, 100));
}

// =====================
// 報告バリデーション
// =====================

const VALID_REPORT_TYPES = ['stopped', 'delayed', 'crowded', 'normal', 'resumed'] as const;
export type ValidReportType = typeof VALID_REPORT_TYPES[number];

export function isValidReportType(type: unknown): type is ValidReportType {
    return typeof type === 'string' && VALID_REPORT_TYPES.includes(type as ValidReportType);
}

export function validateReportInput(input: unknown): ValidationResult<{
    routeId: string;
    reportType: ValidReportType;
    comment?: string;
}> {
    if (!input || typeof input !== 'object') {
        return { success: false, error: 'Invalid input object' };
    }

    const obj = input as Record<string, unknown>;

    if (!isValidRouteId(obj.routeId)) {
        return { success: false, error: 'Invalid routeId' };
    }

    if (!isValidReportType(obj.reportType)) {
        return { success: false, error: 'Invalid reportType' };
    }

    return {
        success: true,
        data: {
            routeId: obj.routeId,
            reportType: obj.reportType,
            comment: obj.comment ? sanitizeComment(obj.comment) : undefined,
        },
    };
}

// =====================
// 数値バリデーション
// =====================

export function isValidNumber(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

export function isValidProbability(value: unknown): value is number {
    return isValidNumber(value, 0, 100);
}

// =====================
// セキュリティ用ユーティリティ
// =====================

// 簡易的なハッシュ生成（プライバシー保護用）
export function hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(36);
}

// =====================
// レート制限
// =====================

export class RateLimiter {
    private tokens: Map<string, { count: number; resetTime: number }> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor(
        private maxTokens: number = 60,
        private windowMs: number = 60000
    ) {
        // メモリリーク防止: 定期的にクリーンアップ
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs * 2);
        }
    }

    isAllowed(key: string): boolean {
        const now = Date.now();
        const record = this.tokens.get(key);

        if (!record || now > record.resetTime) {
            this.tokens.set(key, { count: 1, resetTime: now + this.windowMs });
            return true;
        }

        if (record.count >= this.maxTokens) {
            return false;
        }

        record.count++;
        return true;
    }

    getRemainingTokens(key: string): number {
        const record = this.tokens.get(key);
        if (!record || Date.now() > record.resetTime) {
            return this.maxTokens;
        }
        return Math.max(0, this.maxTokens - record.count);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, record] of this.tokens) {
            if (now > record.resetTime) {
                this.tokens.delete(key);
            }
        }
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.tokens.clear();
    }
}
