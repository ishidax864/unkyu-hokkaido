'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
    const router = useRouter();
    const [pending, start] = useTransition();
    return <button type="button" onClick={() => start(() => router.refresh())} disabled={pending}
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink-2 hover:bg-surface-2 disabled:opacity-60">
        <RefreshCw size={16} className={pending ? 'animate-spin' : ''} aria-hidden />{pending ? '更新中' : '最新にする'}</button>;
}
