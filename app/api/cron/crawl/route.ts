import { NextRequest, NextResponse } from 'next/server';
import { readCollectionHealth } from '@/lib/collection-monitor';

// Legacy scheduler compatibility: Supabase owns collection. Old calls now
// monitor it instead of writing a second batch of observations.
export async function GET(req: NextRequest) {
    // CRON_SECRET 認証（secure-by-default: 未設定時はアクセス拒否）
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return NextResponse.json({ error: 'Cron authentication not configured' }, { status: 403 });
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collection = await readCollectionHealth();
    const success = ['healthy','running'].includes(collection.state);
    return NextResponse.json({ success, mode:'supabase-collector', collection }, {
        status: success ? 200 : 503, headers: {'Cache-Control':'no-store'},
    });
}
