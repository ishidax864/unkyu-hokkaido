import { NextRequest, NextResponse } from 'next/server';
import { saveReportToSupabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { routeId, reportType, comment } = body;

        // 1. Basic Validation
        if (!routeId || !reportType) {
            return NextResponse.json({ error: 'routeId and reportType are required' }, { status: 400 });
        }

        const validTypes = ['stopped', 'delayed', 'crowded', 'normal'];
        if (!validTypes.includes(reportType)) {
            return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 });
        }

        // 2. Security: Get real IP and Hash it (Server-side)
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

        // Use a secure hash (SHA-256) for IP protection
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

        // 3. Sanitization
        const sanitizedComment = comment ? comment.slice(0, 500) : undefined;

        // 4. Save to DB
        const result = await saveReportToSupabase({
            route_id: routeId,
            report_type: reportType,
            comment: sanitizedComment,
            ip_hash: ipHash
        });

        if (!result.success) {
            // Check for potential spam (RLS trigger error or Database error)
            if (result.error.includes('Too many reports')) {
                return NextResponse.json({ error: '報告が頻繁すぎます。しばらく待ってから再度お試しください。' }, { status: 429 });
            }
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Report submitted successfully' });
    } catch (error) {
        logger.error('User Reports API error', { error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
