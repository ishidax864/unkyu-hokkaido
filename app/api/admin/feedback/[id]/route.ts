import { NextRequest, NextResponse } from 'next/server';
import { updateFeedbackStatus } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { status } = await req.json();

        if (!['open', 'in_progress', 'closed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const result = await updateFeedbackStatus(id, status);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Admin Update Feedback API error', { error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
