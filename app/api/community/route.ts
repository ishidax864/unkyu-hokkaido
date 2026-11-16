import { NextRequest, NextResponse } from 'next/server';
import { getRouteById } from '@/lib/hokkaido-data';
import { getAdminSupabaseClient } from '@/lib/repos/client';
import { summarizeReports } from '@/lib/forecast/community';
import { validReportLocation } from '@/lib/forecast/report-location';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
    const routeId = request.nextUrl.searchParams.get('routeId') || '';
    const stationId = request.nextUrl.searchParams.get('stationId') || '';
    const directionStationId = request.nextUrl.searchParams.get('directionStationId') || '';
    if (!getRouteById(routeId)) return NextResponse.json({ error: '路線を選択してください。' }, { status: 400 });
    if (!validReportLocation(routeId, stationId, directionStationId)) return NextResponse.json({ error: '駅・方面を確認してください。' }, { status: 400 });
    const client = getAdminSupabaseClient();
    if (!client) return NextResponse.json({ error: '現地報告を取得できません。' }, { status: 503 });
    const now = new Date();
    try {
        let query = client.from('user_reports')
            .select('route_id,report_type,created_at,ip_hash,comment,station_id,direction_station_id')
            .eq('route_id', routeId).gte('created_at', new Date(now.getTime() - 15 * 60_000).toISOString())
            .lte('created_at', now.toISOString()).order('created_at', { ascending: false }).limit(200)
            .abortSignal(AbortSignal.timeout(4000));
        if (stationId) query = query.eq('station_id', stationId);
        if (directionStationId) query = query.eq('direction_station_id', directionStationId);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: '現地報告を取得できません。' }, { status: 503 });
        // Raw IP hashes remain on the server.
        return NextResponse.json(summarizeReports(data || [], now, {stationId, directionStationId}), { headers: { 'Cache-Control': 'no-store' } });
    } catch { return NextResponse.json({ error: '現地報告を取得できません。' }, { status: 503 }); }
}
