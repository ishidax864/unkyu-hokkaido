import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/b2b-auth';
import { getRecentReports } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');
    const { authorized, error, partner } = await validateApiKey(apiKey);

    if (!authorized) {
        return NextResponse.json({ error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('routeId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!routeId) {
        return NextResponse.json({ error: 'routeId is required' }, { status: 400 });
    }

    try {
        const result = await getRecentReports(routeId, limit);

        if (!result.success) {
            throw new Error(result.error);
        }

        return NextResponse.json({
            partner: partner.name,
            timestamp: new Date().toISOString(),
            reports: result.data.map((r: any) => ({
                id: r.id,
                type: r.report_type,
                comment: r.comment,
                isVerified: r.is_verified,
                createdAt: r.created_at
            }))
        });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}
