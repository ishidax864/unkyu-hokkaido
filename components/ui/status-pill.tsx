import { CheckCircle2, XOctagon, HelpCircle, Moon, AlertTriangle, AlertOctagon, CircleDot } from 'lucide-react';
import type { OfficialState } from '@/lib/engine/status';
import type { RiskLevel } from '@/lib/forecast/types';

type Tone = 'ok' | 'watch' | 'high' | 'stop' | 'unknown' | 'calm';

const TONE: Record<Tone, string> = {
    ok: 'bg-ok-soft text-ok',
    calm: 'bg-surface-2 text-ink-2',
    watch: 'bg-watch-soft text-watch',
    high: 'bg-high-soft text-high',
    stop: 'bg-stop-soft text-stop',
    unknown: 'bg-unknown-soft text-unknown',
};

export const OFFICIAL_SHORT: Record<OfficialState, string> = {
    'no-info': '平常', disrupted: '運休・遅れ', 'off-hours': '時間外', unknown: '不明',
};
export const RISK_SHORT: Record<RiskLevel, string> = {
    low: '低め', watch: '注意', high: '警戒', severe: '高い', unknown: '不明',
};

const officialTone: Record<OfficialState, Tone> = { 'no-info': 'ok', disrupted: 'stop', 'off-hours': 'unknown', unknown: 'unknown' };
const riskTone: Record<RiskLevel, Tone> = { low: 'calm', watch: 'watch', high: 'high', severe: 'stop', unknown: 'unknown' };

function Icon({ tone, offHours, size }: { tone: Tone; offHours?: boolean; size: number }) {
    const p = { size, 'aria-hidden': true, strokeWidth: 2.4 } as const;
    if (offHours) return <Moon {...p} />;
    switch (tone) {
        case 'ok': return <CheckCircle2 {...p} />;
        case 'calm': return <CircleDot {...p} />;
        case 'watch': return <AlertTriangle {...p} />;
        case 'high': return <AlertOctagon {...p} />;
        case 'stop': return <XOctagon {...p} />;
        default: return <HelpCircle {...p} />;
    }
}

interface PillProps { size?: 'sm' | 'md' | 'lg'; className?: string; label?: string }
const SIZES = { sm: 'gap-1 px-2 py-0.5 text-sm', md: 'gap-1.5 px-2.5 py-1 text-[15px]', lg: 'gap-2 px-3.5 py-1.5 text-lg' };
const ICON = { sm: 14, md: 16, lg: 20 };

export function OfficialPill({ state, size = 'sm', className = '', label }: PillProps & { state: OfficialState }) {
    const tone = officialTone[state];
    return <span className={`inline-flex shrink-0 items-center rounded-full font-bold leading-tight ${SIZES[size]} ${TONE[tone]} ${className}`}>
        <Icon tone={tone} offHours={state === 'off-hours'} size={ICON[size]} />{label ?? OFFICIAL_SHORT[state]}
    </span>;
}

export function RiskPill({ level, size = 'sm', className = '', label }: PillProps & { level: RiskLevel }) {
    const tone = riskTone[level];
    return <span className={`inline-flex shrink-0 items-center rounded-full font-bold leading-tight ${SIZES[size]} ${TONE[tone]} ${className}`}>
        <Icon tone={tone} size={ICON[size]} />{label ?? RISK_SHORT[level]}
    </span>;
}
