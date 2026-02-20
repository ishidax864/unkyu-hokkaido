import { NextRequest, NextResponse } from 'next/server';
import { saveReportToSupabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import {
    isNonEmptyString,
    extractIP
} from '@/lib/validation-helpers';
import { sanitizeString, isValidReportType as validateReportType } from '@/lib/validation';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { routeId, reportType, comment } = body;

        // Validation using helpers
        if (!isNonEmptyString(routeId) || !isNonEmptyString(reportType)) {
            return NextResponse.json({ error: 'routeId and reportType are required' }, { status: 400 });
        }

        if (!validateReportType(reportType)) {
            return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 });
        }

        // The DB only stores the 4 active report types (not 'resumed')
        const dbReportType = reportType as 'stopped' | 'delayed' | 'crowded' | 'normal';

        // 2. Security: Get real IP and Hash it (Server-side)
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = extractIP(forwarded);

        // Use SHA-256 for secure hashing
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

        // 3. Sanitization
        const sanitizedComment = comment ? sanitizeString(comment, 500) : undefined;

        // 4. Save to DB
        const result = await saveReportToSupabase({
            route_id: routeId,
            report_type: dbReportType,
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
