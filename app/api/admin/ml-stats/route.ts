import { NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/repos/client';
import { getMLTrainingStats } from '@/lib/repos/admin';
import { collectionHealth } from '@/lib/collection-health';

export const dynamic = 'force-dynamic';

// The /api/admin/:path* middleware enforces admin authentication.
export async function GET() {
    const client = getAdminSupabaseClient();
    if (!client) return NextResponse.json({ error: '管理用の接続が設定されていません' }, { status: 503 });
    const [stats, run] = await Promise.all([
        getMLTrainingStats(),
        client.from('rail_collection_runs').select('started_at,finished_at,status')
            .order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!stats.success || run.error) return NextResponse.json({ error: '収集状況を取得できませんでした' }, { status: 503 });
    return NextResponse.json({ ...stats.data, collection: collectionHealth(run.data) }, {
        headers: { 'Cache-Control': 'no-store' },
    });
}
