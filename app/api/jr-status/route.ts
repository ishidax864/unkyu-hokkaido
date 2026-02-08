import { NextResponse } from 'next/server';
import { fetchJRHokkaidoStatus } from '@/lib/jr-status';
import { JRStatusResponse } from '@/lib/types';

// キャッシュ
let cachedStatus: JRStatusResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3 * 60 * 1000;

export async function GET() {
    if (cachedStatus && Date.now() - cacheTimestamp < CACHE_TTL) {
        return NextResponse.json(cachedStatus);
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
                rawText: item.rawText // 🆕
            })),
            fetchedAt: new Date().toISOString(),
            source: 'official',
            hasAlerts
        };

        cachedStatus = response;
        cacheTimestamp = Date.now();

        return NextResponse.json(response);
    } catch (error) {
        console.error('API /api/jr-status error:', error);
        return NextResponse.json({
            items: [],
            fetchedAt: new Date().toISOString(),
            source: 'error',
            hasAlerts: false
        }, { status: 500 });
    }
}
