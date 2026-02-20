import { NextRequest, NextResponse } from 'next/server';
import { runJRCrawler } from '@/lib/crawler';

// Vercel Cron + GitHub Actions will call this endpoint
export async function GET(req: NextRequest) {
    // 🆕 CRON_SECRET 認証（GitHub Actions / 手動実行時）
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = req.headers.get('authorization');
        const vercelCron = req.headers.get('x-vercel-cron'); // Vercel Cron は自動認証

        if (!vercelCron && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const result = await runJRCrawler();
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Crawler failed', details: error }, { status: 500 });
    }
}
