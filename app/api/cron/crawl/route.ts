import { NextResponse } from 'next/server';
import { runJRCrawler } from '@/lib/crawler';

// Vercel Cron will call this endpoint with a GET request
export async function GET() {
    try {
        const result = await runJRCrawler();
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Crawler failed', details: error }, { status: 500 });
    }
}
