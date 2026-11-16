import { NextRequest, NextResponse } from 'next/server';
import { readCollectionHealth } from '@/lib/collection-monitor';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const secret = process.env.MONITOR_SECRET;
    const cron = process.env.CRON_SECRET;
    const bearer = req.headers.get('authorization');
    const authenticated = (secret && (bearer === `Bearer ${secret}` || req.nextUrl.searchParams.get('key') === secret)) ||
        (cron && bearer === `Bearer ${cron}`);
    if (!authenticated) return NextResponse.json({error:'Unauthorized'},{status:401});
    const collection = await readCollectionHealth();
    const success = ['healthy','running'].includes(collection.state);
    return NextResponse.json({success,collection},{status:success?200:503,headers:{'Cache-Control':'no-store'}});
}
