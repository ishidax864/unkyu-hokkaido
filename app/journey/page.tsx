import type { Metadata } from 'next';
import { JourneyLegacy } from './journey-legacy';

export const metadata: Metadata = { title: '区間の運行・気象リスク' };

export default async function JourneyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const p = await searchParams;
    const one = (v: string | string[] | undefined) => typeof v === 'string' ? v : undefined;
    return <JourneyLegacy initial={{ from: one(p.from), to: one(p.to), date: one(p.date), time: one(p.time) }} />;
}
