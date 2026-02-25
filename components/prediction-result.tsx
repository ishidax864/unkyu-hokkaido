
import { useState } from 'react';
import { PredictionResult, Route } from '@/lib/types';
import { AlertTriangle, CheckCircle, Clock, XCircle, ExternalLink, ChevronDown, ChevronUp, ArrowDown, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJRStatusUrl } from '@/lib/hokkaido-data';
import { formatStatusText, extractSuspendedTrains } from '@/lib/text-parser';

// ────────────────────────────────────────────
// Verdict System — Harmonized with site theme
// White card base + colored left accent border
// Uses site's existing status colors and card style
// ────────────────────────────────────────────

type VerdictLevel = 'GO' | 'CAUTION' | 'HIGH' | 'CRITICAL';

interface VerdictConfig {
    level: VerdictLevel;
    verdict: string;
    evidence: string;
    // Colors that match globals.css design system
    borderAccent: string;     // Left accent border
    headerBg: string;         // Subtle tinted header area
    iconColor: string;        // Icon color
    verdictColor: string;     // Hero text color
    pillBg: string;           // Pill/badge background
    pillText: string;         // Pill text
    pillBorder: string;       // Pill border
    ringStroke: string;       // SVG ring stroke
    ringTrack: string;        // SVG ring track
    ringText: string;         // Ring percentage text
    ctaBg: string;            // Primary CTA
    ctaText: string;          // CTA text
    ctaHover: string;         // CTA hover
    icon: typeof CheckCircle;
}

function buildVerdict(result: PredictionResult): VerdictConfig {
    const prob = result.probability;
    const crowd = result.crowdStats;
    const recoveryTime = result.estimatedRecoveryTime;
    const recoveryLabel = result.isOfficialOverride ? '公式発表' : 'AI予測';
    const recoveryHours = typeof result.estimatedRecoveryHours === 'number'
        ? result.estimatedRecoveryHours
        : undefined;

    const evidenceParts: string[] = [];

    // ── CRITICAL ──
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

        // サブ分岐: 復旧時間に応じたverdict
        let verdict: string;
        if (recoveryTime?.includes('終日')) {
            verdict = '本日は終日運休です';
        } else if (recoveryHours !== undefined && recoveryHours <= 0.5) {
            verdict = 'まもなく復旧します';
        } else if (recoveryHours !== undefined && recoveryHours <= 2) {
            verdict = '運転見合わせ中';
        } else {
            verdict = '現在、運休しています';
        }

        return {
            level: 'CRITICAL',
            verdict,
            evidence: evidenceParts.join(' · '),
            borderAccent: 'border-l-red-500',
            headerBg: 'bg-red-50',
            iconColor: 'text-red-600',
            verdictColor: 'text-red-800',
            pillBg: 'bg-red-50',
            pillText: 'text-red-700',
            pillBorder: 'border-red-200',
            ringStroke: 'stroke-red-500',
            ringTrack: 'stroke-red-100',
            ringText: 'text-red-600',
            ctaBg: 'bg-red-600 hover:bg-red-700',
            ctaText: 'text-white',
            ctaHover: 'hover:bg-red-50',
            icon: XCircle,
        };
    }

    // ── HIGH ──
    if (prob >= 50 || result.isPartialSuspension) {
        if (result.isPartialSuspension)
            evidenceParts.push('一部の列車が停止中');
        if (crowd?.last15minStopped && crowd.last15minStopped >= 1)
            evidenceParts.push(`${crowd.last15minStopped}人が現地で確認`);
        else if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1)
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);
        if (recoveryTime)
            evidenceParts.push(`復旧見込 ${recoveryTime}（${recoveryLabel}）`);

        // サブ分岐: 部分運休 vs 高リスク
        const verdict = result.isPartialSuspension
            ? '一部列車は動いています'
            : '1本早い列車がおすすめ';

        return {
            level: 'HIGH',
            verdict,
            evidence: evidenceParts.join(' · '),
            borderAccent: 'border-l-orange-500',
            headerBg: 'bg-orange-50',
            iconColor: 'text-orange-600',
            verdictColor: 'text-orange-800',
            pillBg: 'bg-orange-50',
            pillText: 'text-orange-700',
            pillBorder: 'border-orange-200',
            ringStroke: 'stroke-orange-500',
            ringTrack: 'stroke-orange-100',
            ringText: 'text-orange-600',
            ctaBg: 'bg-orange-600 hover:bg-orange-700',
            ctaText: 'text-white',
            ctaHover: 'hover:bg-orange-50',
            icon: AlertTriangle,
        };
    }

    // ── POST-RECOVERY ──
    if (result.isPostRecoveryWindow) {
        evidenceParts.push('ダイヤ乱れ継続中');
        if (recoveryTime) evidenceParts.push(`${recoveryTime}に再開（${recoveryLabel}）`);
        if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1)
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);

        // サブ分岐: 復旧からの経過時間
        const verdict = (recoveryHours !== undefined && recoveryHours >= 1)
            ? 'ほぼ通常ダイヤに回復'
            : '運行中ですが遅延に注意';

        return {
            level: 'CAUTION',
            verdict,
            evidence: evidenceParts.join(' · '),
            borderAccent: 'border-l-amber-500',
            headerBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            verdictColor: 'text-amber-800',
            pillBg: 'bg-amber-50',
            pillText: 'text-amber-700',
            pillBorder: 'border-amber-200',
            ringStroke: 'stroke-amber-500',
            ringTrack: 'stroke-amber-100',
            ringText: 'text-amber-600',
            ctaBg: 'bg-amber-600 hover:bg-amber-700',
            ctaText: 'text-white',
            ctaHover: 'hover:bg-amber-50',
            icon: AlertTriangle,
        };
    }

    // ── CAUTION ──
    if (prob >= 20 || result.isPostResumptionChaos || result.status === 'delayed' || result.status === '遅延') {
        if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1)
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);

        // サブ分岐: リスク度合い
        let verdict: string;
        let evidenceDefault: string;
        if (result.isPostResumptionChaos) {
            verdict = 'ダイヤ乱れ中';
            evidenceDefault = '運転再開後のダイヤ乱れが続いています';
        } else if (prob >= 30) {
            verdict = '1本早い列車がおすすめ';
            evidenceDefault = `運休の可能性 ${prob}% — 天候の影響で遅延や一部運休の可能性があります`;
            evidenceParts.push(`運休の可能性 ${prob}%`);
        } else {
            verdict = '遅延の可能性あり';
            evidenceDefault = `運休の可能性 ${prob}% — 余裕を持って出発してください`;
            evidenceParts.push(`運休の可能性 ${prob}%`);
        }

        return {
            level: 'CAUTION',
            verdict,
            evidence: evidenceParts.join(' · ') || evidenceDefault,
            borderAccent: 'border-l-amber-500',
            headerBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            verdictColor: 'text-amber-800',
            pillBg: 'bg-amber-50',
            pillText: 'text-amber-700',
            pillBorder: 'border-amber-200',
            ringStroke: 'stroke-amber-500',
            ringTrack: 'stroke-amber-100',
            ringText: 'text-amber-600',
            ctaBg: 'bg-amber-600 hover:bg-amber-700',
            ctaText: 'text-white',
            ctaHover: 'hover:bg-amber-50',
            icon: AlertTriangle,
        };
    }

    // ── GO ──
    // サブ分岐: 10%以上 vs 10%未満
    const verdict = prob >= 10
        ? '通常通り運行しています'
        : '安心してご利用いただけます';
    const evidence = prob >= 10
        ? '運休リスクは低いですが、天候の変化にご注意ください'
        : '運休の可能性は非常に低く、安心してご利用いただけます';

    return {
        level: 'GO',
        verdict,
        evidence,
        borderAccent: 'border-l-emerald-500',
        headerBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        verdictColor: 'text-emerald-800',
        pillBg: 'bg-emerald-50',
        pillText: 'text-emerald-700',
        pillBorder: 'border-emerald-200',
        ringStroke: 'stroke-emerald-500',
        ringTrack: 'stroke-emerald-100',
        ringText: 'text-emerald-600',
        ctaBg: 'bg-emerald-600 hover:bg-emerald-700',
        ctaText: 'text-white',
        ctaHover: 'hover:bg-emerald-50',
        icon: CheckCircle,
    };
}


// ────────────────────────────────────────────
// Risk Ring — Subtle, site-matching style
// ────────────────────────────────────────────

function RiskRing({ probability, strokeClass, trackClass, textClass, size = 72 }: {
    probability: number; strokeClass: string; trackClass: string; textClass: string; size?: number;
}) {
    const r = (size - 6) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (probability / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className={trackClass} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} strokeLinecap="round"
                    className={strokeClass}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
            </svg>
            <span className={cn("absolute text-base font-black", textClass)}>{probability}%</span>
        </div>
    );
}


// ────────────────────────────────────────────
// The Card — White base, colored accent
// ────────────────────────────────────────────

interface PredictionResultCardProps {
    result: PredictionResult;
    route: Route;
}

export function PredictionResultCard({ result, route }: PredictionResultCardProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const v = buildVerdict(result);
    const Icon = v.icon;

    const hasOfficialInfo = !!result.officialStatus?.rawText?.trim();
    const suspendedTrains = extractSuspendedTrains(result.officialStatus?.rawText || '');
    const showAlternativesCTA = v.level === 'CRITICAL' || v.level === 'HIGH';

    return (
        <article className={cn(
            "card overflow-hidden border-l-4 transition-all",
            v.borderAccent
        )}>
            <div className="p-5 sm:p-6">
                {/* ① Header: Route + Risk Ring */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="h-6 w-1.5 rounded-full" style={{ backgroundColor: route.color || '#666' }} />
                        <div>
                            <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">路線状況</p>
                            <p className="text-[14px] font-bold text-[var(--foreground)]">{route.name}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                        <RiskRing
                            probability={result.probability}
                            strokeClass={v.ringStroke}
                            trackClass={v.ringTrack}
                            textClass={v.ringText}
                        />
                        <span className="text-[11px] font-bold text-[var(--muted)] tracking-wider">運休リスク</span>
                    </div>
                </div>

                {/* ② THE VERDICT */}
                <div className={cn("rounded-xl p-4 mb-4", v.headerBg)}>
                    <div className="flex items-start gap-3">
                        <Icon className={cn("w-6 h-6 shrink-0 mt-0.5", v.iconColor)} />
                        <div>
                            <h2 className={cn("text-[16px] font-black leading-tight tracking-tight mb-1.5", v.verdictColor)}>
                                {v.verdict}
                            </h2>
                            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                                {v.evidence}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ③ Suspended trains */}
                {suspendedTrains.length > 0 && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-3 mb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Shield className="w-3 h-3 text-[var(--muted)]" />
                            <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">公式発表</span>
                        </div>
                        <ul className="space-y-1">
                            {suspendedTrains.map((train, i) => (
                                <li key={i} className="text-[13px] font-bold text-[var(--foreground)] leading-snug flex items-start gap-2">
                                    <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-red-400" />
                                    {train}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ④ Supporting pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {result.estimatedRecoveryTime && (
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", v.pillBg, v.pillText, v.pillBorder)}>
                            <Clock className="w-3 h-3" />
                            {result.isPostRecoveryWindow ? '復旧済み' : '復旧見込'} {result.estimatedRecoveryTime}
                            <span className="text-[11px] font-medium opacity-70">（{result.isOfficialOverride ? '公式発表' : 'AI予測'}）</span>
                        </span>
                    )}
                    {result.crowdStats && result.crowdStats.last15minReportCount > 0 && (
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", v.pillBg, v.pillText, v.pillBorder)}>
                            <Users className="w-3 h-3" />
                            {result.crowdStats.last15minReportCount}人が報告
                        </span>
                    )}
                    {result.isOfficialOverride && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--background-secondary)] text-[var(--muted)] border border-[var(--border)]">
                            <Shield className="w-3 h-3" />
                            JR公式情報
                        </span>
                    )}
                </div>

                {/* ⑤ CTAs */}
                {showAlternativesCTA && (
                    <div className="space-y-2 mb-4">
                        <a
                            href="#alternative-routes-title"
                            className={cn(
                                "flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] shadow-sm",
                                v.ctaBg, v.ctaText
                            )}
                        >
                            🚌 代替ルートを見る <ArrowDown size={14} />
                        </a>
                        {result.estimatedRecoveryTime && !result.estimatedRecoveryTime.includes('終日') && (
                            <button
                                className={cn(
                                    "flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl text-[13px] font-bold border border-[var(--border)] text-[var(--foreground)] transition-all active:scale-[0.98]",
                                    v.ctaHover
                                )}
                            >
                                🕐 復旧まで待つ（{result.estimatedRecoveryTime}頃）
                            </button>
                        )}
                    </div>
                )}

                {/* ⑥ Collapsible Details */}
                <div className="border-t border-[var(--border)] pt-3">
                    <button
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className="w-full flex items-center justify-between py-1.5 text-[12px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                        <span>詳しい分析を見る</span>
                        {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isDetailsOpen && (
                        <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2">
                            {hasOfficialInfo && (
                                <div>
                                    <h4 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">公式発表 (全文)</h4>
                                    <div className="text-[12px] leading-relaxed text-[var(--muted)] bg-[var(--background-secondary)] p-3 rounded-xl whitespace-pre-wrap border border-[var(--border)]">
                                        {formatStatusText(result.officialStatus?.rawText || '')}
                                    </div>
                                </div>
                            )}

                            {result.reasons.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">リスク要因</h4>
                                    <ul className="space-y-1.5">
                                        {result.reasons.map((r, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--muted)]">
                                                <span className="block w-1 h-1 mt-1.5 rounded-full bg-[var(--muted)] opacity-40 shrink-0" />
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.crowdStats && (result.crowdStats.last15minStopped > 0 || result.crowdStats.last15minDelayed > 0 || result.crowdStats.last15minCrowded > 0) && (
                                <div>
                                    <h4 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">ユーザー報告 (直近15分)</h4>
                                    <div className="flex gap-3 text-xs font-bold">
                                        {result.crowdStats.last15minStopped > 0 && <span className="text-red-600">🔴 停止 {result.crowdStats.last15minStopped}件</span>}
                                        {result.crowdStats.last15minDelayed > 0 && <span className="text-amber-600">🟡 遅延 {result.crowdStats.last15minDelayed}件</span>}
                                        {result.crowdStats.last15minCrowded > 0 && <span className="text-orange-600">🟠 混雑 {result.crowdStats.last15minCrowded}件</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ⑦ JR Official Link */}
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-center">
                    <a
                        href={getJRStatusUrl(route.id).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                    >
                        JR公式ページで確認 <ExternalLink size={12} />
                    </a>
                </div>
            </div>
        </article>
    );
}
