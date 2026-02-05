// ログユーティリティ
// 本番環境では外部サービス（Sentry等）に送信可能

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
}

// 本番環境かどうか
const isProduction = process.env.NODE_ENV === 'production';

// ログ履歴（開発時のみ保持）
const logHistory: LogEntry[] = [];
const MAX_HISTORY = 100;

function createLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
    };
}

function addToHistory(entry: LogEntry): void {
    if (!isProduction) {
        logHistory.push(entry);
        if (logHistory.length > MAX_HISTORY) {
            logHistory.shift();
        }
    }
}

// 本番では Sentry 等に送信
async function sendToExternalService(entry: LogEntry): Promise<void> {
    if (!isProduction) return;

    const sentryDsn = process.env.SENTRY_DSN;
    if (!sentryDsn) return;

    // Sentry SDK を使用する場合はここで呼び出し
    // 現在は構造化ログとして console に出力
    // 将来的に Sentry.captureException() 等を追加
}

export const logger = {
    debug(message: string, context?: Record<string, unknown>): void {
        if (isProduction) return; // 本番ではdebugログを出力しない

        const entry = createLogEntry('debug', message, context);
        addToHistory(entry);
        console.debug(`[DEBUG] ${message}`, context || '');
    },

    info(message: string, context?: Record<string, unknown>): void {
        const entry = createLogEntry('info', message, context);
        addToHistory(entry);
        console.info(`[INFO] ${message}`, context || '');
    },

    warn(message: string, context?: Record<string, unknown>): void {
        const entry = createLogEntry('warn', message, context);
        addToHistory(entry);
        console.warn(`[WARN] ${message}`, context || '');
        sendToExternalService(entry);
    },

    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
        const errorContext = {
            ...context,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
        };

        const entry = createLogEntry('error', message, errorContext);
        addToHistory(entry);
        console.error(`[ERROR] ${message}`, error, context || '');
        sendToExternalService(entry);
    },

    // 開発時のログ履歴取得
    getHistory(): LogEntry[] {
        return [...logHistory];
    },

    // 履歴クリア
    clearHistory(): void {
        logHistory.length = 0;
    },
};

// API エラーレスポンス生成
export function createErrorResponse(
    message: string,
    status: number = 500,
    details?: Record<string, unknown>
): { error: string; status: number; details?: Record<string, unknown> } {
    logger.error(message, undefined, { status, ...details });
    return {
        error: message,
        status,
        details: isProduction ? undefined : details, // 本番では詳細を隠す
    };
}

// リクエストログ（APIルート用）
export function logRequest(
    method: string,
    path: string,
    params?: Record<string, unknown>
): void {
    logger.info(`API Request: ${method} ${path}`, params);
}

// レスポンスログ（APIルート用）
export function logResponse(
    method: string,
    path: string,
    status: number,
    durationMs: number
): void {
    const level = status >= 400 ? 'warn' : 'info';
    logger[level](`API Response: ${method} ${path} ${status} (${durationMs}ms)`);
}
