/**
 * 予測結果キャッシュ
 * 同一ルート・同一時間帯のリクエストをキャッシュして負荷を削減
 * 
 * キャッシュキー: routeId + 日付 + 10分単位に丸めた時刻
 * TTL: 3分（気象データの更新頻度に合わせる）
 * 最大エントリ数: 200（メモリリーク防止）
 */

import { logger } from '@/lib/logger';

interface CacheEntry<T> {
    data: T;
    createdAt: number;
    hits: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3分
const MAX_ENTRIES = 200;
const CLEANUP_INTERVAL = 60 * 1000; // 1分ごとにクリーンアップ

// キャッシュストア
const cache = new Map<string, CacheEntry<unknown>>();

// メトリクス
let totalHits = 0;
let totalMisses = 0;

/**
 * キャッシュキーを生成
 * 時刻を10分単位に丸めて、近い時間帯のリクエストをまとめる
 */
export function buildCacheKey(routeId: string, date: string, time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const roundedMinutes = Math.floor(minutes / 10) * 10;
    return `pred:${routeId}:${date}:${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
}

/**
 * キャッシュからデータを取得
 */
export function getFromCache<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) {
        totalMisses++;
        return null;
    }

    // TTL チェック
    if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
        cache.delete(key);
        totalMisses++;
        return null;
    }

    entry.hits++;
    totalHits++;
    return entry.data as T;
}

/**
 * キャッシュにデータを保存
 */
export function setCache<T>(key: string, data: T): void {
    // メモリ上限チェック: 古いエントリから削除
    if (cache.size >= MAX_ENTRIES) {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [k, v] of cache.entries()) {
            if (v.createdAt < oldestTime) {
                oldestTime = v.createdAt;
                oldestKey = k;
            }
        }
        if (oldestKey) cache.delete(oldestKey);
    }

    cache.set(key, {
        data,
        createdAt: Date.now(),
        hits: 0,
    });
}

/**
 * キャッシュメトリクスを取得
 */
export function getCacheMetrics() {
    const total = totalHits + totalMisses;
    return {
        entries: cache.size,
        maxEntries: MAX_ENTRIES,
        hits: totalHits,
        misses: totalMisses,
        hitRate: total > 0 ? `${Math.round((totalHits / total) * 100)}%` : 'N/A',
        ttlSeconds: CACHE_TTL_MS / 1000,
    };
}

/**
 * 定期クリーンアップ（期限切れエントリ削除）
 */
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of cache.entries()) {
            if (now - entry.createdAt > CACHE_TTL_MS) {
                cache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.info(`Cache cleanup: removed ${cleaned} expired entries, ${cache.size} remaining`);
        }
    }, CLEANUP_INTERVAL);
}
