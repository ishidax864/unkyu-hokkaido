/**
 * Performance monitoring utilities
 * Tracks API response times, database query performance, and external API latency
 */

import { logger } from './logger';

export class PerformanceMonitor {
    private static timers = new Map<string, { start: number; metadata?: Record<string, unknown> }>();

    /**
     * Start performance timer
     */
    static start(label: string, metadata?: Record<string, unknown>): void {
        this.timers.set(label, { start: performance.now(), metadata });
    }

    /**
     * End performance timer and log duration
     */
    static end(label: string): number {
        const timer = this.timers.get(label);
        if (!timer) {
            logger.warn(`Performance timer not found: ${label}`);
            return 0;
        }

        const duration = performance.now() - timer.start;
        logger.info(`Performance: ${label}`, {
            durationMs: Math.round(duration * 100) / 100,
            ...timer.metadata
        });

        this.timers.delete(label);
        return duration;
    }

    /**
     * Measure async function execution time
     */
    static async measure<T>(
        label: string,
        fn: () => Promise<T>,
        metadata?: Record<string, unknown>
    ): Promise<T> {
        this.start(label, metadata);
        try {
            const result = await fn();
            this.end(label);
            return result;
        } catch (error) {
            this.end(label);
            throw error;
        }
    }

    /**
     * Get all active timers (for debugging)
     */
    static getActiveTimers(): string[] {
        return Array.from(this.timers.keys());
    }

    /**
     * Clear all timers
     */
    static clearAll(): void {
        this.timers.clear();
    }
}

/**
 * API route performance wrapper
 */
export function withPerformanceMonitoring<T>(
    handler: () => Promise<T>,
    label: string
): Promise<T> {
    return PerformanceMonitor.measure(label, handler);
}
