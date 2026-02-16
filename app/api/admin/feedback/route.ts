import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackList } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET(_req: NextRequest) {
    try {
        // middleware handles auth for /admin/*, but api routes might need it too
        // if they are not under /admin. Here it is /api/admin/* which we should also protect.

        const result = await getFeedbackList(100);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ items: result.data });
    } catch (error) {
        logger.error('Admin Feedback API error', { error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
