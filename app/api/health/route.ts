import { NextResponse } from 'next/server';

export async function GET() {
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    };

    return NextResponse.json(healthCheck, {
        status: 200,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    });
}
