import { NextResponse } from 'next/server';
import { getBoard } from '@/lib/engine/board';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** 全路線の公式状態と気象リスク。共有キャッシュは60秒、古い応答は2分まで再検証中に返す。 */
export async function GET() {
    try {
        const board = await getBoard();
        return NextResponse.json(board, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });
    } catch (error) {
        logger.error('Board unavailable', error);
        return NextResponse.json({ error: '運行情報を取得できませんでした。少し時間をおいて再度お試しください。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
