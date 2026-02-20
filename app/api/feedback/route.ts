import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import {
    validateFeedbackType,
    isNonEmptyString,
    validateAndSanitizeEmail,
    extractIP
} from '@/lib/validation-helpers';
import { sanitizeString } from '@/lib/validation';
import { ValidationError } from '@/lib/errors';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, content, email, pageUrl } = body;

        // Validation using helpers
        if (!isNonEmptyString(type) || !isNonEmptyString(content)) {
            return NextResponse.json({ error: 'Type and content are required' }, { status: 400 });
        }

        if (!validateFeedbackType(type)) {
            return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
        }

        // Sanitize content
        const sanitizedContent = sanitizeString(content, 2000);

        // Get IP and UA info for anti-spam and debugging
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = extractIP(forwarded);
        // Use SHA-256 for better security (consistent with reports API)
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
        const ua = req.headers.get('user-agent') || 'unknown';

        // Validate email if provided
        let sanitizedEmail: string | undefined;
        if (email) {
            try {
                sanitizedEmail = validateAndSanitizeEmail(email);
            } catch (error) {
                if (error instanceof ValidationError) {
                    return NextResponse.json({ error: error.message }, { status: 400 });
                }
                throw error;
            }
        }

        const result = await saveFeedback({
            type,
            content: sanitizedContent,
            email: sanitizedEmail,
            page_url: pageUrl ? sanitizeString(pageUrl, 500) : undefined,
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
