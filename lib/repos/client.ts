import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logger';

// 環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// データベース型定義
export interface Database {
    public: {
        Tables: {
            user_reports: {
                Row: UserReportDB;
                Insert: Omit<UserReportDB, 'id' | 'created_at'>;
                Update: Partial<Omit<UserReportDB, 'id' | 'created_at'>>;
            };
            prediction_history: {
                Row: PredictionHistoryDB;
                Insert: Omit<PredictionHistoryDB, 'id' | 'created_at'>;
                Update: Partial<Omit<PredictionHistoryDB, 'id' | 'created_at'>>;
            };
            monitoring_logs: {
                Row: MonitoringLogDB;
                Insert: Omit<MonitoringLogDB, 'id' | 'created_at'>;
                Update: Partial<Omit<MonitoringLogDB, 'id' | 'created_at'>>;
            };
            user_feedback: {
                Row: UserFeedbackDB;
                Insert: Omit<UserFeedbackDB, 'id' | 'created_at'>;
                Update: Partial<Omit<UserFeedbackDB, 'id' | 'created_at'>>;
            };
        };
    };
}

// クライアント保持用
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClient: SupabaseClient<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminSupabaseClient: SupabaseClient<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): SupabaseClient<any> | null {
    if (!supabaseUrl || !supabaseAnonKey) {
        logger.warn('Supabase credentials not configured');
        return null;
    }

    if (!supabaseClient) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseClient = createClient<any>(supabaseUrl, supabaseAnonKey, {
                auth: { persistSession: false },
            });
            logger.debug('Supabase client initialized');
        } catch (error) {
            logger.error('Failed to initialize Supabase client', { error });
            return null;
        }
    }
    return supabaseClient;
}

/**
 * 管理者用クライアント取得（SERVICE_ROLE_KEYを使用）
 * RLSをバイパスするため、サーバーサイドでのみ使用すること
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdminSupabaseClient(): SupabaseClient<any> | null {
    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }

    if (!adminSupabaseClient) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            adminSupabaseClient = createClient<any>(supabaseUrl, supabaseServiceKey, {
                auth: { persistSession: false },
            });
            logger.debug('Supabase ADMIN client initialized');
        } catch (error) {
            logger.error('Failed to initialize Supabase admin client', { error });
            return null;
        }
    }
    return adminSupabaseClient;
}

// Supabaseが利用可能かチェック
export function isSupabaseAvailable(): boolean {
    return !!(supabaseUrl && supabaseAnonKey);
}

// 外部公開用の型定義
export interface UserReportDB {
    id?: string;
    route_id: string;
    report_type: 'stopped' | 'delayed' | 'crowded' | 'normal';
    comment?: string;
    created_at?: string;
    ip_hash?: string;
}

export interface PredictionHistoryDB {
    id?: string;
    route_id: string;
    route_name: string;
    probability: number;
    status: string;
    weather_factors: string[];
    is_official_influenced?: boolean;
    actual_status?: string;
    accuracy_score?: number;
    created_at?: string;
}

export interface UserFeedbackDB {
    id?: string;
    type: 'bug' | 'improvement' | 'other';
    content: string;
    email?: string;
    page_url?: string;
    ua_info?: string;
    ip_hash?: string;
    status?: 'open' | 'in_progress' | 'closed';
    created_at?: string;
}

export interface MonitoringLogDB {
    id?: string;
    route_id: string;
    route_name: string;
    predicted_status: string;
    predicted_probability: number;
    actual_status: string;
    actual_status_text?: string;
    is_match: boolean;
    weather_summary?: string;
    delay_minutes?: number;
    recovery_time?: string;
    created_at?: string;
}

// Result型（エラーハンドリング用）
export type DbResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };
