import { NextRequest, NextResponse } from 'next/server';
import { getReportsList } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        const result = await getReportsList(100);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ items: result.data });
    } catch (error) {
        logger.error('Admin Reports API error', { error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
