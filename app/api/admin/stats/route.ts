import { NextRequest, NextResponse } from 'next/server';
import { getGlobalStats } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET(_req: NextRequest) {
    try {
        const result = await getGlobalStats();

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result.data);
    } catch (error) {
        logger.error('Admin Stats API error', { error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
