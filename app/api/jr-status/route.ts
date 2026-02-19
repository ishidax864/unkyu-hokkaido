import { NextResponse } from 'next/server';
import { fetchJRHokkaidoStatus } from '@/lib/jr-status';
import { JRStatusResponse } from '@/lib/types';
import { logger } from '@/lib/logger';

// キャッシュ (型付け強化)
interface CacheEntry {
    data: JRStatusResponse;
    timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// Cache cleanup to prevent memory leaks
function clearExpiredCache(): void {
    if (cache && Date.now() - cache.timestamp >= CACHE_TTL) {
        cache = null;
    }
}

export async function GET() {
    // Clean up expired cache
    clearExpiredCache();

    // Return cached data if valid
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        return NextResponse.json(cache.data);
    }

    try {
        const items = await fetchJRHokkaidoStatus();
        const hasAlerts = items.some(i => i.status !== 'normal');

        const response: JRStatusResponse = {
            items: items.map(item => ({
                routeId: item.routeId,
                routeName: item.routeName,
                status: item.status,
                description: item.statusText,
                updatedAt: item.updatedAt,
                source: 'official',
                rawText: item.rawText
            })),
            fetchedAt: new Date().toISOString(),
            source: 'official',
            hasAlerts
        };

        // Update cache with proper structure
        cache = {
            data: response,
            timestamp: Date.now()
        };

        return NextResponse.json(response);
    } catch (error) {
        logger.error('JR Status API error', { error });

        const errorResponse: JRStatusResponse = {
            items: [],
            fetchedAt: new Date().toISOString(),
            source: 'error',
            hasAlerts: false
        };

        return NextResponse.json(errorResponse, { status: 500 });
    }
}
