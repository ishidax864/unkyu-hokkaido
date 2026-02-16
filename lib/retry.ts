/**
 * リトライロジックとエラーハンドリングユーティリティ
 * 外部API呼び出しやデータベース操作の信頼性を向上
 */

import { isRetryableError } from './errors';
import { logger } from './logger';

// =====================
// リトライ設定
// =====================

export interface RetryOptions {
    /** 最大リトライ回数 */
    maxRetries?: number;
    /** 初期遅延時間（ミリ秒） */
    initialDelay?: number;
    /** 最大遅延時間（ミリ秒） */
    maxDelay?: number;
    /** バックオフの倍率 */
    backoffMultiplier?: number;
    /** リトライ可能なエラーかどうかの判定関数 */
    shouldRetry?: (error: unknown) => boolean;
    /** リトライ時のコールバック */
    onRetry?: (error: unknown, attempt: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError,
    onRetry: (error, attempt) => {
        logger.warn(`Retry attempt ${attempt}`, { error });
    },
};

// =====================
// 指数バックオフリトライ
// =====================

/**
 * 指数バックオフでリトライを実行
 * @param fn 実行する非同期関数
 * @param options リトライオプション
 * @returns 関数の実行結果
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // 最終試行の場合はエラーをスロー
            if (attempt === opts.maxRetries) {
                break;
            }

            // リトライ可能かチェック
            if (!opts.shouldRetry(error)) {
                throw error;
            }

            // コールバック実行
            opts.onRetry(error, attempt + 1);

            // 指数バックオフで遅延
            const delay = Math.min(
                opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
                opts.maxDelay
            );

            // ジッター追加（±20%のランダム性）
            const jitter = delay * (0.8 + Math.random() * 0.4);

            await sleep(jitter);
        }
    }

    throw lastError;
}

// =====================
// タイムアウト付き実行
// =====================

/**
 * タイムアウト付きで非同期関数を実行
 * @param fn 実行する非同期関数
 * @param timeoutMs タイムアウト時間（ミリ秒）
 * @param timeoutMessage タイムアウト時のエラーメッセージ
 * @returns 関数の実行結果
 */
export async function withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
): Promise<T> {
    return Promise.race([
        fn(),
        sleep(timeoutMs).then(() => {
            throw new Error(timeoutMessage);
        }),
    ]);
}

// =====================
// リトライ＋タイムアウト
// =====================

/**
 * リトライとタイムアウトの両方を適用
 * @param fn 実行する非同期関数
 * @param timeoutMs タイムアウト時間（ミリ秒）
 * @param retryOptions リトライオプション
 * @returns 関数の実行結果
 */
export async function withRetryAndTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    retryOptions: RetryOptions = {}
): Promise<T> {
    return withRetry(() => withTimeout(fn, timeoutMs), retryOptions);
}

// =====================
// サーキットブレーカー
// =====================

export class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private state: 'closed' | 'open' | 'half-open' = 'closed';

    constructor(
        private threshold: number = 5,
        private timeout: number = 60000 // 1分
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'half-open';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failures = 0;
        this.state = 'closed';
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = 'open';
            logger.error(`Circuit breaker opened after ${this.failures} failures`);
        }
    }

    getState(): string {
        return this.state;
    }

    reset(): void {
        this.failures = 0;
        this.state = 'closed';
    }
}

// =====================
// バッチリトライ
// =====================

/**
 * 複数の操作を並列実行し、失敗したもののみリトライ
 * @param operations 実行する操作の配列
 * @param retryOptions リトライオプション
 * @returns 全操作の結果配列
 */
export async function batchWithRetry<T>(
    operations: Array<() => Promise<T>>,
    retryOptions: RetryOptions = {}
): Promise<T[]> {
    const results = await Promise.allSettled(
        operations.map((op) => withRetry(op, retryOptions))
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            logger.error(`Batch operation ${index} failed`, { error: result.reason });
            throw result.reason;
        }
    });
}

// =====================
// ユーティリティ関数
// =====================

/**
 * 指定時間スリープ
 * @param ms スリープ時間（ミリ秒）
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 関数実行時間を計測
 * @param fn 実行する関数
 * @param label ラベル（ログ用）
 * @returns 関数の実行結果
 */
export async function measureTime<T>(
    fn: () => Promise<T>,
    label: string
): Promise<T> {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;
        logger.debug(`${label} completed in ${duration}ms`);
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error(`${label} failed after ${duration}ms`, { error });
        throw error;
    }
}
