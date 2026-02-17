/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking calls to failing services
 */

import { logger } from './logger';

export enum CircuitBreakerState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Blocking calls
    HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreakerOptions {
    failureThreshold: number;      // Number of failures before opening
    successThreshold: number;      // Number of successes in HALF_OPEN to close
    timeout: number;               // Time before trying HALF_OPEN (ms)
    monitoringPeriod: number;      // Time window for failure tracking (ms)
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    monitoringPeriod: 120000, // 2 minutes
};

export class CircuitBreaker {
    private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
    private failures: number[] = []; // Timestamps of failures
    private successes: number = 0;
    private lastStateChange: number = Date.now();
    private readonly options: CircuitBreakerOptions;
    private readonly name: string;

    constructor(name: string, options: Partial<CircuitBreakerOptions> = {}) {
        this.name = name;
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Execute function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
        if (this.state === CircuitBreakerState.OPEN) {
            // Check if timeout has elapsed
            if (Date.now() - this.lastStateChange >= this.options.timeout) {
                this.transition(CircuitBreakerState.HALF_OPEN);
            } else {
                logger.warn(`Circuit breaker open: ${this.name}`, { state: this.state });
                if (fallback) {
                    return fallback();
                }
                throw new Error(`Circuit breaker is OPEN for ${this.name}`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();

            if (this.state === CircuitBreakerState.OPEN && fallback) {
                logger.error(`Circuit breaker triggered fallback: ${this.name}`, error);
                return fallback();
            }
            throw error;
        }
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        // Clear old failures
        this.cleanOldFailures();

        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.successes++;
            if (this.successes >= this.options.successThreshold) {
                this.transition(CircuitBreakerState.CLOSED);
                this.successes = 0;
            }
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(): void {
        const now = Date.now();
        this.failures.push(now);
        this.cleanOldFailures();

        if (this.state === CircuitBreakerState.HALF_OPEN) {
            // Immediately open on failure in HALF_OPEN
            this.transition(CircuitBreakerState.OPEN);
            this.successes = 0;
        } else if (this.state === CircuitBreakerState.CLOSED) {
            // Open if threshold exceeded
            if (this.failures.length >= this.options.failureThreshold) {
                this.transition(CircuitBreakerState.OPEN);
            }
        }
    }

    /**
     * Remove failures outside monitoring period
     */
    private cleanOldFailures(): void {
        const cutoff = Date.now() - this.options.monitoringPeriod;
        this.failures = this.failures.filter(timestamp => timestamp > cutoff);
    }

    /**
     * Transition to new state
     */
    private transition(newState: CircuitBreakerState): void {
        const oldState = this.state;
        this.state = newState;
        this.lastStateChange = Date.now();

        logger.info(`Circuit breaker state change: ${this.name}`, {
            from: oldState,
            to: newState,
            failures: this.failures.length
        });
    }

    /**
     * Get current state
     */
    getState(): CircuitBreakerState {
        return this.state;
    }

    /**
     * Get health metrics
     */
    getMetrics() {
        return {
            state: this.state,
            failures: this.failures.length,
            successes: this.successes,
            lastStateChange: new Date(this.lastStateChange).toISOString(),
        };
    }

    /**
     * Manually reset circuit breaker
     */
    reset(): void {
        this.state = CircuitBreakerState.CLOSED;
        this.failures = [];
        this.successes = 0;
        this.lastStateChange = Date.now();
        logger.info(`Circuit breaker manually reset: ${this.name}`);
    }
}

// Singleton instances for common services
export const weatherAPIBreaker = new CircuitBreaker('weather-api');
export const supabaseBreaker = new CircuitBreaker('supabase');
export const jrStatusBreaker = new CircuitBreaker('jr-status-api');
