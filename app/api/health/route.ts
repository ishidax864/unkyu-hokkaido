import { NextResponse } from 'next/server';
import { getBoard } from '@/lib/engine/board';

export const dynamic = 'force-dynamic';

/** 稼働確認: JRの運行情報と気象予報を取得できているか */
export async function GET() {
    try {
        const board = await getBoard();
        const jrOk = board.sources.jr.errors.length === 0 && !!board.sources.jr.publishedAt;
        const weatherOk = board.sources.weather.failedPoints === 0;
        return NextResponse.json({
            status: jrOk && weatherOk ? 'ok' : 'degraded', generatedAt: board.generatedAt,
            jr: { ok: jrOk, publishedAt: board.sources.jr.publishedAt, errors: board.sources.jr.errors },
            weather: { ok: weatherOk, fetchedAt: board.sources.weather.fetchedAt, failedPoints: board.sources.weather.failedPoints, error: board.sources.weather.error },
        }, { status: jrOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ status: 'error' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
