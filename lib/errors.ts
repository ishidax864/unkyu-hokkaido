/**
 * カスタムエラークラス定義
 * より詳細なエラーハンドリングと構造化されたエラー情報を提供
 */

// =====================
// ベースエラークラス
// =====================

export class UnkyuAIError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}

// =====================
// バリデーションエラー
// =====================

export class ValidationError extends UnkyuAIError {
    constructor(
        public readonly field: string,
        message: string,
        details?: Record<string, unknown>
    ) {
        super(message, 'VALIDATION_ERROR', 400, { field, ...details });
    }
}

// =====================
// 予測エンジンエラー
// =====================

export class PredictionEngineError extends UnkyuAIError {
    constructor(
        message: string,
        public readonly phase: 'data_fetch' | 'calculation' | 'validation',
        details?: Record<string, unknown>
    ) {
        super(message, 'PREDICTION_ENGINE_ERROR', 500, { phase, ...details });
    }
}

// =====================
// データベースエラー
// =====================

export class DatabaseError extends UnkyuAIError {
    constructor(
        message: string,
        public readonly operation: 'read' | 'write' | 'update' | 'delete',
        details?: Record<string, unknown>
    ) {
        super(message, 'DATABASE_ERROR', 500, { operation, ...details });
    }
}

// =====================
// 外部APIエラー
// =====================

export class ExternalAPIError extends UnkyuAIError {
    constructor(
        message: string,
        public readonly service: 'weather' | 'supabase' | 'gemini' | 'jr_status',
        public readonly isRetryable: boolean = true,
        details?: Record<string, unknown>
    ) {
        super(message, 'EXTERNAL_API_ERROR', 502, { service, isRetryable, ...details });
    }
}

// =====================
// レート制限エラー
// =====================

export class RateLimitError extends UnkyuAIError {
    constructor(
        message: string,
        public readonly retryAfter: number, // seconds
        details?: Record<string, unknown>
    ) {
        super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter, ...details });
    }
}

// =====================
// 認証・認可エラー
// =====================

export class AuthenticationError extends UnkyuAIError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 'AUTHENTICATION_ERROR', 401, details);
    }
}

export class AuthorizationError extends UnkyuAIError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 'AUTHORIZATION_ERROR', 403, details);
    }
}

// =====================
// データ未検出エラー
// =====================

export class NotFoundError extends UnkyuAIError {
    constructor(
        public readonly resource: string,
        public readonly identifier: string,
        details?: Record<string, unknown>
    ) {
        super(
            `${resource} not found: ${identifier}`,
            'NOT_FOUND_ERROR',
            404,
            { resource, identifier, ...details }
        );
    }
}

// =====================
// エラーハンドリングユーティリティ
// =====================

/**
 * エラーが再試行可能かどうかを判定
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof ExternalAPIError) {
        return error.isRetryable;
    }
    if (error instanceof DatabaseError) {
        // 一時的な接続エラーなら再試行可能
        return error.message.includes('connection') || error.message.includes('timeout');
    }
    return false;
}

/**
 * エラーからHTTPステータスコードを取得
 */
export function getErrorStatusCode(error: unknown): number {
    if (error instanceof UnkyuAIError) {
        return error.statusCode;
    }
    return 500;
}

/**
 * エラーをログ出力用の形式に変換
 */
export function formatErrorForLogging(error: unknown): Record<string, unknown> {
    if (error instanceof UnkyuAIError) {
        return error.toJSON();
    }
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }
    return {
        message: String(error),
    };
}

/**
 * エラーをユーザー向けメッセージに変換
 */
export function getUserFriendlyMessage(error: unknown): string {
    if (error instanceof ValidationError) {
        return `入力エラー: ${error.message}`;
    }
    if (error instanceof RateLimitError) {
        return `リクエストが多すぎます。${error.retryAfter}秒後に再試行してください。`;
    }
    if (error instanceof ExternalAPIError) {
        return `外部サービスとの通信に失敗しました。しばらくしてから再試行してください。`;
    }
    if (error instanceof NotFoundError) {
        return `指定された${error.resource}が見つかりませんでした。`;
    }
    if (error instanceof UnkyuAIError) {
        return error.message;
    }
    return '予期しないエラーが発生しました。管理者に連絡してください。';
}
