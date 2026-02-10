import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/b2b-auth';
import { getRoutePrediction } from '@/lib/recovery-prediction'; // 既存の予測ロジック

export async function GET(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');
    const { authorized, error, partner } = await validateApiKey(apiKey);

    if (!authorized) {
        return NextResponse.json({ error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('routeId');

    if (!routeId) {
        return NextResponse.json({ error: 'routeId is required' }, { status: 400 });
    }

    try {
        // 既存の予測ロジックを呼び出す
        // 本来は日付や時刻もクエリから取るべきだが、一旦現在の予測を返す簡易版
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().slice(0, 5);

        const prediction = await getRoutePrediction(routeId, date, time);

        return NextResponse.json({
            partner: partner.name,
            timestamp: new Date().toISOString(),
            prediction
        });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch prediction' }, { status: 500 });
    }
}
