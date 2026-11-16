'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { JourneyForecast } from '@/lib/forecast/types';

export function useJourneyForecast() {
    const [result, setResult] = useState<JourneyForecast | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const controller = useRef<AbortController | null>(null);
    const latest = useRef<JourneyForecast['request'] | null>(null);
    const search = useCallback(async (request: JourneyForecast['request']) => {
        latest.current = request;
        controller.current?.abort();
        const current = new AbortController();
        controller.current = current;
        const timeout = setTimeout(() => current.abort('timeout'), 20_000);
        setLoading(true); setError(null); setResult(null);
        try {
            const response = await fetch('/api/journey', { method: 'POST',
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: current.signal });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '情報を取得できませんでした。');
            if (controller.current === current) setResult(data);
        } catch (cause) {
            if (controller.current !== current) return;
            setError(current.signal.aborted ? '取得に時間がかかっています。再度お試しください。' : cause instanceof Error ? cause.message : '情報を取得できませんでした。');
        } finally {
            clearTimeout(timeout);
            if (controller.current === current) setLoading(false);
        }
    }, []);
    useEffect(() => () => { const active = controller.current; controller.current = null; active?.abort(); }, []);
    return { result, loading, error, search, refresh: () => latest.current && search(latest.current) };
}
