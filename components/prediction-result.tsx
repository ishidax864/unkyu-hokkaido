
import { useState } from 'react';
import { PredictionResult, Route } from '@/lib/types';
import { AlertTriangle, CheckCircle, Clock, XCircle, ExternalLink, ChevronDown, ChevronUp, ArrowDown, Users, Shield, Train } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJRStatusUrl } from '@/lib/hokkaido-data';
import { formatStatusText, splitStatusText, extractSuspendedTrains } from '@/lib/text-parser';

// ────────────────────────────────────────────
// Verdict System: ONE card, ONE story
// ────────────────────────────────────────────

type VerdictLevel = 'GO' | 'CAUTION' | 'HIGH' | 'CRITICAL';

interface VerdictConfig {
    level: VerdictLevel;
    verdict: string;
    evidence: string;
    // Visual styles
    cardStyle: string;
    iconBg: string;
    textHero: string;
    textSub: string;
    textMuted: string;
    pillStyle: string;
    glassBg: string;
    glassBorder: string;
    ctaPrimary: string;
    ctaSecondary: string;
    ringColor: string;
    dividerColor: string;
    icon: typeof CheckCircle;
}

function buildVerdict(result: PredictionResult): VerdictConfig {
    const prob = result.probability;
    const crowd = result.crowdStats;
    const recoveryTime = result.estimatedRecoveryTime;
    const recoveryLabel = result.isOfficialOverride ? '公式発表' : 'AI予測';

    const evidenceParts: string[] = [];

    // ── CRITICAL: 運休中 ──
    if (result.isCurrentlySuspended && !result.isPartialSuspension || prob >= 80 ||
        result.status === 'suspended' || result.status === 'cancelled' ||
        result.status === '運休' || result.status === '運休中') {

        if (crowd?.last15minStopped && crowd.last15minStopped >= 1)
            evidenceParts.push(`${crowd.last15minStopped}人が現地で確認`);
        if (result.suspensionReason)
            evidenceParts.push(result.suspensionReason);
        if (recoveryTime)
            evidenceParts.push(`復旧見込 ${recoveryTime}（${recoveryLabel}）`);
        else
            evidenceParts.push('復旧未定');

        return {
            level: 'CRITICAL',
            verdict: recoveryTime?.includes('終日')
                ? '本日は終日運休です'
                : '現在、運休しています',
            evidence: evidenceParts.join(' · '),
            cardStyle: 'bg-gradient-to-b from-rose-950 via-red-900 to-red-950',
            iconBg: 'bg-red-500/20 ring-1 ring-red-400/30',
            textHero: 'text-white',
            textSub: 'text-red-200',
            textMuted: 'text-red-300/70',
            pillStyle: 'bg-red-500/20 text-red-200 ring-1 ring-red-400/20',
            glassBg: 'bg-white/[0.06] backdrop-blur-sm',
            glassBorder: 'border-white/[0.08]',
            ctaPrimary: 'bg-white text-red-900 hover:bg-white/90 shadow-lg shadow-black/20',
            ctaSecondary: 'bg-white/10 text-white/90 hover:bg-white/15 ring-1 ring-white/15',
            ringColor: 'stroke-red-400',
            dividerColor: 'border-white/10',
            icon: XCircle,
        };
    }

    // ── HIGH: 50-79% or Partial ──
    if (prob >= 50 || result.isPartialSuspension) {
        if (result.isPartialSuspension)
            evidenceParts.push('一部の列車が停止中');
        if (crowd?.last15minStopped && crowd.last15minStopped >= 1)
            evidenceParts.push(`${crowd.last15minStopped}人が現地で確認`);
        else if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1)
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);
        if (recoveryTime)
            evidenceParts.push(`復旧見込 ${recoveryTime}`);

        return {
            level: 'HIGH',
            verdict: '代替手段での移動を推奨',
            evidence: evidenceParts.join(' · '),
            cardStyle: 'bg-gradient-to-b from-orange-950 via-orange-900 to-amber-950',
            iconBg: 'bg-orange-500/20 ring-1 ring-orange-400/30',
            textHero: 'text-white',
            textSub: 'text-orange-200',
            textMuted: 'text-orange-300/70',
            pillStyle: 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/20',
            glassBg: 'bg-white/[0.06] backdrop-blur-sm',
            glassBorder: 'border-white/[0.08]',
            ctaPrimary: 'bg-white text-orange-900 hover:bg-white/90 shadow-lg shadow-black/20',
            ctaSecondary: 'bg-white/10 text-white/90 hover:bg-white/15 ring-1 ring-white/15',
            ringColor: 'stroke-orange-400',
            dividerColor: 'border-white/10',
            icon: AlertTriangle,
        };
    }

    // ── POST-RECOVERY ──
    if (result.isPostRecoveryWindow) {
        evidenceParts.push('ダイヤ乱れ継続中');
        if (recoveryTime) evidenceParts.push(`${recoveryTime}に再開`);
        if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1)
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);

        return {
            level: 'CAUTION',
            verdict: '運行中ですが遅延に注意',
            evidence: evidenceParts.join(' · '),
            cardStyle: 'bg-gradient-to-b from-amber-950 via-yellow-900 to-amber-950',
            iconBg: 'bg-amber-500/20 ring-1 ring-amber-400/30',
            textHero: 'text-white',
            textSub: 'text-amber-200',
            textMuted: 'text-amber-300/70',
            pillStyle: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/20',
            glassBg: 'bg-white/[0.06] backdrop-blur-sm',
            glassBorder: 'border-white/[0.08]',
            ctaPrimary: 'bg-white text-amber-900 hover:bg-white/90 shadow-lg shadow-black/20',
            ctaSecondary: 'bg-white/10 text-white/90 hover:bg-white/15 ring-1 ring-white/15',
            ringColor: 'stroke-amber-400',
            dividerColor: 'border-white/10',
            icon: AlertTriangle,
        };
    }

    // ── CAUTION: 20-49% ──
    if (prob >= 20 || result.isPostResumptionChaos || result.status === 'delayed' || result.status === '遅延') {
        evidenceParts.push(`運休の可能性 ${prob}%`);
        if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1)
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);

        return {
            level: 'CAUTION',
            verdict: '遅延・運休に注意してください',
            evidence: evidenceParts.join(' · ') || '天候の変化により遅延の可能性があります',
            cardStyle: 'bg-gradient-to-b from-amber-950 via-yellow-900 to-amber-950',
            iconBg: 'bg-amber-500/20 ring-1 ring-amber-400/30',
            textHero: 'text-white',
            textSub: 'text-amber-200',
            textMuted: 'text-amber-300/70',
            pillStyle: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/20',
            glassBg: 'bg-white/[0.06] backdrop-blur-sm',
            glassBorder: 'border-white/[0.08]',
            ctaPrimary: 'bg-white text-amber-900 hover:bg-white/90 shadow-lg shadow-black/20',
            ctaSecondary: 'bg-white/10 text-white/90 hover:bg-white/15 ring-1 ring-white/15',
            ringColor: 'stroke-amber-400',
            dividerColor: 'border-white/10',
            icon: AlertTriangle,
        };
    }

    // ── GO ──
    return {
        level: 'GO',
        verdict: '通常通り運行しています',
        evidence: `運休の可能性は低く、安心してご利用いただけます`,
        cardStyle: 'bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950',
        iconBg: 'bg-emerald-500/20 ring-1 ring-emerald-400/30',
        textHero: 'text-white',
        textSub: 'text-emerald-200',
        textMuted: 'text-emerald-300/70',
        pillStyle: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/20',
        glassBg: 'bg-white/[0.06] backdrop-blur-sm',
        glassBorder: 'border-white/[0.08]',
        ctaPrimary: 'bg-white text-emerald-900 hover:bg-white/90 shadow-lg shadow-black/20',
        ctaSecondary: 'bg-white/10 text-white/90 hover:bg-white/15 ring-1 ring-white/15',
        ringColor: 'stroke-emerald-400',
        dividerColor: 'border-white/10',
        icon: CheckCircle,
    };
}


// ────────────────────────────────────────────
// Risk Ring — SVG circular progress
// ────────────────────────────────────────────

function RiskRing({ probability, strokeClass, size = 56 }: { probability: number; strokeClass: string; size?: number }) {
    const r = (size - 6) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (probability / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-white/10" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={3} strokeLinecap="round"
                    className={strokeClass}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
            </svg>
            <span className="absolute text-xs font-black text-white/90">{probability}%</span>
        </div>
    );
}


// ────────────────────────────────────────────
// The Card
// ────────────────────────────────────────────

interface PredictionResultCardProps {
    result: PredictionResult;
    route: Route;
}

export function PredictionResultCard({ result, route }: PredictionResultCardProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const v = buildVerdict(result);
    const Icon = v.icon;

    const hasOfficialInfo = !!result.officialStatus;
    const suspendedTrains = extractSuspendedTrains(result.officialStatus?.rawText || '');
    const showAlternativesCTA = v.level === 'CRITICAL' || v.level === 'HIGH';

    return (
        <article className={cn(
            "relative overflow-hidden rounded-2xl shadow-2xl shadow-black/30 transition-all",
            v.cardStyle
        )}>
            {/* Subtle noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')] pointer-events-none" />

            <div className="relative p-6 sm:p-7">
                {/* ① Header: Route + Risk Ring */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl", v.iconBg)}>
                            <Train className="w-4 h-4 text-white/80" />
                        </div>
                        <div>
                            <p className={cn("text-[11px] font-bold uppercase tracking-widest", v.textMuted)}>路線状況</p>
                            <p className={cn("text-base font-bold", v.textSub)}>{route.name}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <RiskRing probability={result.probability} strokeClass={v.ringColor} />
                        <span className={cn("text-[9px] font-bold tracking-wider", v.textMuted)}>運休リスク</span>
                    </div>
                </div>

                {/* ② THE VERDICT */}
                <div className="mb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={cn("p-1.5 rounded-lg", v.iconBg)}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <h2 className={cn("text-xl sm:text-2xl font-black leading-tight tracking-tight", v.textHero)}>
                            {v.verdict}
                        </h2>
                    </div>
                    <p className={cn("text-sm font-medium leading-relaxed pl-[42px]", v.textSub)}>
                        {v.evidence}
                    </p>
                </div>

                {/* ③ Suspended trains (glass card) */}
                {suspendedTrains.length > 0 && (
                    <div className={cn("rounded-xl p-4 mb-4 border", v.glassBg, v.glassBorder)}>
                        <div className="flex items-center gap-2 mb-2.5">
                            <Shield className="w-3.5 h-3.5 text-white/50" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">公式発表</span>
                        </div>
                        <ul className="space-y-1.5">
                            {suspendedTrains.map((train, i) => (
                                <li key={i} className="text-sm font-bold text-white/90 leading-snug flex items-start gap-2.5">
                                    <span className="block w-1 h-1 mt-2 rounded-full bg-white/40" />
                                    {train}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ④ Supporting metrics (glass pill row) */}
                <div className={cn("flex flex-wrap gap-2 mb-5")}>
                    {result.estimatedRecoveryTime && (
                        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold", v.pillStyle)}>
                            <Clock className="w-3 h-3 opacity-70" />
                            {result.isPostRecoveryWindow ? '復旧済み' : '復旧見込'} {result.estimatedRecoveryTime}
                        </div>
                    )}
                    {result.crowdStats && result.crowdStats.last15minReportCount > 0 && (
                        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold", v.pillStyle)}>
                            <Users className="w-3 h-3 opacity-70" />
                            {result.crowdStats.last15minReportCount}人が報告
                        </div>
                    )}
                    {result.isOfficialOverride && (
                        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold", v.pillStyle)}>
                            <Shield className="w-3 h-3 opacity-70" />
                            JR公式情報
                        </div>
                    )}
                </div>

                {/* ⑤ CTAs */}
                {showAlternativesCTA && (
                    <div className="space-y-2.5 mb-5">
                        <a
                            href="#alternative-routes-title"
                            className={cn(
                                "flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl text-sm font-black transition-all active:scale-[0.98]",
                                v.ctaPrimary
                            )}
                        >
                            🚌 代替ルートを見る <ArrowDown size={14} />
                        </a>
                        {result.estimatedRecoveryTime && !result.estimatedRecoveryTime.includes('終日') && (
                            <button
                                className={cn(
                                    "flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]",
                                    v.ctaSecondary
                                )}
                            >
                                🕐 復旧まで待つ（{result.estimatedRecoveryTime}頃）
                            </button>
                        )}
                    </div>
                )}

                {/* ⑥ Collapsible Details */}
                <div className={cn("border-t pt-3", v.dividerColor)}>
                    <button
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className={cn(
                            "w-full flex items-center justify-between py-1.5 text-xs font-bold transition-colors",
                            v.textMuted, "hover:text-white/70"
                        )}
                    >
                        <span>詳しい分析を見る</span>
                        {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isDetailsOpen && (
                        <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2">
                            {hasOfficialInfo && (
                                <div>
                                    <h4 className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", v.textMuted)}>公式発表 (全文)</h4>
                                    <div className={cn("text-xs leading-relaxed p-3 rounded-lg whitespace-pre-wrap border", v.glassBg, v.glassBorder, v.textSub)}>
                                        {formatStatusText(result.officialStatus?.rawText || '')}
                                    </div>
                                </div>
                            )}

                            {result.reasons.length > 0 && (
                                <div>
                                    <h4 className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", v.textMuted)}>リスク要因</h4>
                                    <ul className="space-y-1.5">
                                        {result.reasons.map((r, i) => (
                                            <li key={i} className={cn("flex items-start gap-2 text-xs", v.textSub)}>
                                                <span className="block w-1 h-1 mt-1.5 rounded-full bg-current opacity-40 shrink-0" />
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.crowdStats && (result.crowdStats.last15minStopped > 0 || result.crowdStats.last15minDelayed > 0 || result.crowdStats.last15minCrowded > 0) && (
                                <div>
                                    <h4 className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", v.textMuted)}>ユーザー報告 (直近15分)</h4>
                                    <div className={cn("flex gap-3 text-xs font-bold", v.textSub)}>
                                        {result.crowdStats.last15minStopped > 0 && <span>🔴 停止 {result.crowdStats.last15minStopped}件</span>}
                                        {result.crowdStats.last15minDelayed > 0 && <span>🟡 遅延 {result.crowdStats.last15minDelayed}件</span>}
                                        {result.crowdStats.last15minCrowded > 0 && <span>🟠 混雑 {result.crowdStats.last15minCrowded}件</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ⑦ JR Official Link */}
                <div className={cn("mt-4 pt-3 border-t flex justify-center", v.dividerColor)}>
                    <a
                        href={getJRStatusUrl(route.id).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-white/60 hover:text-white/90 bg-white/[0.06] hover:bg-white/10 ring-1 ring-white/10 transition-all active:scale-95"
                    >
                        JR公式ページで確認 <ExternalLink size={12} />
                    </a>
                </div>
            </div>
        </article>
    );
}
