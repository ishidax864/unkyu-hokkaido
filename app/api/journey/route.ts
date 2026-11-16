import { NextRequest, NextResponse } from 'next/server';
import { isClockTime, isForecastDate } from '@/lib/forecast/time';
import { getJourneyForecast, journeyRouteIds } from '@/lib/forecast/journey';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: '検索条件を読み取れませんでした。' }, { status: 400 }); }
    if (!body || typeof body.departureId !== 'string' || typeof body.arrivalId !== 'string' ||
        !isForecastDate(body.date) || !isClockTime(body.time)) {
        return NextResponse.json({ error: '駅と日時を確認してください。予測は今日から7日間に対応しています。' }, { status: 400 });
    }
    if (!journeyRouteIds(body.departureId, body.arrivalId)) return NextResponse.json({
        error: 'この駅の組み合わせは経由路線を確認できません。別の駅を選ぶか、公式情報をご確認ください。',
    }, { status: 422 });
    try {
        const result = await getJourneyForecast({ departureId: body.departureId, arrivalId: body.arrivalId, date: body.date, time: body.time });
        return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ error: '情報を取得できませんでした。少し時間をおいて再度お試しください。' }, { status: 503 });
    }
}
