import { NextRequest, NextResponse } from 'next/server';
import { runJRCrawler } from '@/lib/crawler';
import { logger } from '@/lib/logger';

// Vercel Cron + GitHub Actions will call this endpoint
export async function GET(req: NextRequest) {
    // CRON_SECRET 認証（secure-by-default: 未設定時はアクセス拒否）
    const cronSecret = process.env.CRON_SECRET;
    const vercelCron = req.headers.get('x-vercel-cron'); // Vercel Cron は自動認証

    if (vercelCron) {
        // Vercel Cron からの呼び出しは許可
    } else if (cronSecret) {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    } else {
        // CRON_SECRET 未設定 + Vercel Cron でない → 拒否
        return NextResponse.json({ error: 'Cron authentication not configured' }, { status: 403 });
    }

    try {
        const result = await runJRCrawler();
        return NextResponse.json(result);
    } catch (error) {
        logger.error('Crawler cron failed', { error });
        return NextResponse.json({ error: 'Crawler failed' }, { status: 500 });
    }
}
