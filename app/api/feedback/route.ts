import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, content, email, pageUrl } = body;

        // Basic validation
        if (!type || !content) {
            return NextResponse.json({ error: 'Type and content are required' }, { status: 400 });
        }

        if (!['bug', 'improvement', 'other'].includes(type)) {
            return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
        }

        // Sanitize content (basic)
        const sanitizedContent = content.slice(0, 2000); // Limit length

        // Get IP and UA info for anti-spam and debugging
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
        const ipHash = crypto.createHash('md5').update(ip).digest('hex');
        const ua = req.headers.get('user-agent') || 'unknown';

        const result = await saveFeedback({
            type,
            content: sanitizedContent,
            email: email ? email.slice(0, 255) : undefined,
            page_url: pageUrl ? pageUrl.slice(0, 500) : undefined,
            ua_info: ua,
            ip_hash: ipHash
        });

        if (!result.success) {
            logger.error('Feedback save failed', { error: result.error });
            return NextResponse.json(
                { error: 'フィードバックの送信に失敗しました。', details: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Feedback received' });
    } catch (error) {
        logger.error('Feedback API error', { error });
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。時間を置いて再度お試しください。' },
            { status: 500 }
        );
    }
}
