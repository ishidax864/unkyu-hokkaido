import { NextRequest, NextResponse } from 'next/server';
import { saveReportToSupabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import {
    isNonEmptyString,
    extractIP
} from '@/lib/validation-helpers';
import { sanitizeString, isValidReportType as validateReportType } from '@/lib/validation';
import { getRouteById } from '@/lib/hokkaido-data';
import { validReportLocation } from '@/lib/forecast/report-location';

export async function POST(req: NextRequest) {
    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ error: '報告内容を読み取れません。' }, { status: 400 }); }
    if (!body || typeof body !== 'object') return NextResponse.json({ error: '報告内容を確認してください。' }, { status: 400 });
    try {
        const { routeId, reportType, comment, trainId, stationId, directionStationId } = body;

        // Validation using helpers
        if (!isNonEmptyString(routeId) || !getRouteById(routeId) || !isNonEmptyString(reportType)) {
            return NextResponse.json({ error: 'routeId and reportType are required' }, { status: 400 });
        }

        if (!validateReportType(reportType) || !['stopped', 'delayed', 'crowded', 'normal'].includes(reportType)) {
            return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 });
        }
        if (!validReportLocation(routeId, stationId, directionStationId)) return NextResponse.json({ error: 'この路線の駅・方面を選択してください。' }, { status: 400 });
        if ((comment != null && typeof comment !== 'string') || (trainId != null && typeof trainId !== 'string')) {
            return NextResponse.json({ error: '報告内容を確認してください。' }, { status: 400 });
        }

        // The DB only stores the 4 active report types (not 'resumed')
        const dbReportType = reportType as 'stopped' | 'delayed' | 'crowded' | 'normal';

        // 2. Security: Get real IP and Hash it (Server-side)
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = extractIP(forwarded);

        // Keyed hashing avoids a recoverable dictionary of plain IP hashes.
        const hashSecret = process.env.REPORT_IP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!hashSecret) return NextResponse.json({ error: '報告の保存先が準備できていません。' }, { status: 503 });
        const ipHash = crypto.createHmac('sha256', hashSecret).update(ip).digest('hex');

        // 3. Sanitization
        const sanitizedComment = comment ? sanitizeString(comment, 500) : undefined;

        // 4. Save to DB
        const result = await saveReportToSupabase({
            route_id: routeId,
            report_type: dbReportType,
            train_id: trainId || undefined,
            station_id: stationId || undefined,
            direction_station_id: directionStationId || undefined,
            comment: sanitizedComment,
            ip_hash: ipHash
        });

        if (!result.success) {
            // Check for potential spam (RLS trigger error or Database error)
            if (result.error.includes('Too many reports')) {
                return NextResponse.json({ error: '報告が頻繁すぎます。しばらく待ってから再度お試しください。' }, { status: 429 });
            }
            return NextResponse.json({ error: '報告を共有できませんでした。時間をおいて再度お試しください。' }, { status: 503 });
        }

        return NextResponse.json({ success: true, message: 'Report submitted successfully' });
    } catch (error) {
        logger.error('User Reports API error', { error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
