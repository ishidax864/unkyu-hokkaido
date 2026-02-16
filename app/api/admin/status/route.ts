import { NextResponse } from 'next/server';
import { fetchJRHokkaidoStatus } from '@/lib/jr-status';

// 簡易的な管理者認証（本来はミドルウェアやセッションチェックを行うべき）
// 現状は他のAdmin APIと同様にパブリックアクセス可能な状態だが、
// 管理画面自体のパスが保護されている前提（またはBasic認証等）とする。

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const statusData = await fetchJRHokkaidoStatus();
        return NextResponse.json({
            updatedAt: new Date().toISOString(),
            items: statusData
        });
    } catch (error) {
        console.error('Status fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch status' },
            { status: 500 }
        );
    }
}
