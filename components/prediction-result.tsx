
import { useState } from 'react';
import { PredictionResult, Route } from '@/lib/types';
import { AlertOctagon, AlertTriangle, CheckCircle, Clock, XCircle, ExternalLink, ChevronDown, ChevronUp, ArrowDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJRStatusUrl } from '@/lib/hokkaido-data';
import { formatStatusText, splitStatusText, extractSuspendedTrains } from '@/lib/text-parser';

// ────────────────────────────────────────────
// Verdict System: ONE card, ONE story
// ────────────────────────────────────────────

type VerdictLevel = 'GO' | 'CAUTION' | 'HIGH' | 'CRITICAL';

interface VerdictConfig {
    level: VerdictLevel;
    verdict: string;        // THE hero text — the only thing that matters
    evidence: string;       // Why we say this — one line
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    accentBar: string;
    detailsBg: string;
    detailsBorder: string;
    ctaPrimary: string;
    ctaSecondary: string;
    icon: typeof CheckCircle;
}

function buildVerdict(result: PredictionResult): VerdictConfig {
    const prob = result.probability;
    const crowd = result.crowdStats;
    const recoveryTime = result.estimatedRecoveryTime;
    const recoveryLabel = result.isOfficialOverride ? '公式発表' : 'AI予測';

    // Build evidence fragments
    const evidenceParts: string[] = [];

    // ── CRITICAL: 運休中 or >= 80% ──
    if (result.isCurrentlySuspended && !result.isPartialSuspension || prob >= 80 ||
        result.status === 'suspended' || result.status === 'cancelled' ||
        result.status === '運休' || result.status === '運休中') {

        if (crowd?.last15minStopped && crowd.last15minStopped >= 1) {
            evidenceParts.push(`${crowd.last15minStopped}人のユーザーが確認済み`);
        }
        if (result.suspensionReason) {
            evidenceParts.push(`原因: ${result.suspensionReason}`);
        }
        if (recoveryTime) {
            evidenceParts.push(`復旧見込: ${recoveryTime}（${recoveryLabel}）`);
        } else {
            evidenceParts.push('復旧の目処は立っていません');
        }

        return {
            level: 'CRITICAL',
            verdict: recoveryTime?.includes('終日')
                ? '本日は運休 — 代替手段をお使いください'
                : '運休中 — 代替手段をお使いください',
            evidence: evidenceParts.join(' · '),
            cardBg: 'bg-gradient-to-br from-red-600 to-red-700',
            cardBorder: 'border-red-800/30',
            textPrimary: 'text-white',
            textSecondary: 'text-red-100',
            accentBar: 'bg-red-500',
            detailsBg: 'bg-red-800/20',
            detailsBorder: 'border-red-400/20',
            ctaPrimary: 'bg-white text-red-700 hover:bg-red-50',
            ctaSecondary: 'border-white/40 text-white hover:bg-white/10',
            icon: XCircle,
        };
    }

    // ── HIGH: 50-79% or Partial Suspension ──
    if (prob >= 50 || result.isPartialSuspension) {
        if (result.isPartialSuspension) {
            evidenceParts.push('一部の列車が停止中');
        } else {
            evidenceParts.push(`運休リスク ${prob}%`);
        }
        if (crowd?.last15minStopped && crowd.last15minStopped >= 1) {
            evidenceParts.push(`${crowd.last15minStopped}人が停止を報告`);
        } else if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1) {
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);
        }
        if (recoveryTime) {
            evidenceParts.push(`復旧見込: ${recoveryTime}`);
        }

        return {
            level: 'HIGH',
            verdict: '代替手段で移動してください',
            evidence: evidenceParts.join(' · '),
            cardBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
            cardBorder: 'border-orange-700/30',
            textPrimary: 'text-white',
            textSecondary: 'text-orange-100',
            accentBar: 'bg-orange-400',
            detailsBg: 'bg-orange-800/20',
            detailsBorder: 'border-orange-400/20',
            ctaPrimary: 'bg-white text-orange-700 hover:bg-orange-50',
            ctaSecondary: 'border-white/40 text-white hover:bg-white/10',
            icon: AlertTriangle,
        };
    }

    // ── POST-RECOVERY ──
    if (result.isPostRecoveryWindow) {
        evidenceParts.push('運転再開後のダイヤ乱れ');
        if (recoveryTime) evidenceParts.push(`${recoveryTime}に再開`);
        if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1) {
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);
        }

        return {
            level: 'CAUTION',
            verdict: '遅延に注意してください',
            evidence: evidenceParts.join(' · '),
            cardBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
            cardBorder: 'border-amber-600/30',
            textPrimary: 'text-amber-950',
            textSecondary: 'text-amber-800',
            accentBar: 'bg-amber-300',
            detailsBg: 'bg-amber-700/10',
            detailsBorder: 'border-amber-600/20',
            ctaPrimary: 'bg-amber-950 text-white hover:bg-amber-900',
            ctaSecondary: 'border-amber-800/40 text-amber-900 hover:bg-amber-600/10',
            icon: AlertTriangle,
        };
    }

    // ── CAUTION: 20-49% or delayed ──
    if (prob >= 20 || result.isPostResumptionChaos || result.status === 'delayed' || result.status === '遅延') {
        evidenceParts.push(`運休リスク ${prob}%`);
        if (crowd?.last15minDelayed && crowd.last15minDelayed >= 1) {
            evidenceParts.push(`${crowd.last15minDelayed}人が遅延を報告`);
        }

        return {
            level: 'CAUTION',
            verdict: '遅延に注意してください',
            evidence: evidenceParts.join(' · ') || '10〜30分程度の遅延の可能性があります',
            cardBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
            cardBorder: 'border-amber-600/30',
            textPrimary: 'text-amber-950',
            textSecondary: 'text-amber-800',
            accentBar: 'bg-amber-300',
            detailsBg: 'bg-amber-700/10',
            detailsBorder: 'border-amber-600/20',
            ctaPrimary: 'bg-amber-950 text-white hover:bg-amber-900',
            ctaSecondary: 'border-amber-800/40 text-amber-900 hover:bg-amber-600/10',
            icon: AlertTriangle,
        };
    }

    // ── GO: < 20% ──
    return {
        level: 'GO',
        verdict: '予定通り運行中',
        evidence: `リスク ${prob}% — 通常通りご利用いただけます`,
        cardBg: 'bg-white',
        cardBorder: 'border-emerald-200',
        textPrimary: 'text-gray-900',
        textSecondary: 'text-gray-500',
        accentBar: 'bg-emerald-500',
        detailsBg: 'bg-gray-50',
        detailsBorder: 'border-gray-200',
        ctaPrimary: 'bg-emerald-600 text-white hover:bg-emerald-700',
        ctaSecondary: 'border-gray-300 text-gray-700 hover:bg-gray-50',
        icon: CheckCircle,
    };
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
    const isColoredCard = v.level !== 'GO';

    const { summary: textSummary } = splitStatusText(result.officialStatus?.rawText || '');
    const hasOfficialInfo = !!result.officialStatus;
    const suspendedTrains = extractSuspendedTrains(result.officialStatus?.rawText || '');
    const showAlternativesCTA = v.level === 'CRITICAL' || v.level === 'HIGH';

    return (
        <article className={cn(
            "relative overflow-hidden rounded-2xl shadow-lg border transition-all",
            v.cardBg, v.cardBorder
        )}>
            {/* Top accent bar */}
            <div className={cn("h-1.5 w-full", v.accentBar)} />

            <div className="p-6">
                {/* ① Route Label */}
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="h-6 w-1.5 rounded-full" style={{ backgroundColor: route.color || '#666' }} />
                    <span className={cn("text-sm font-bold tracking-tight", isColoredCard ? v.textSecondary : 'text-gray-500')}>
                        {route.name}
                    </span>
                </div>

                {/* ② THE VERDICT — The only thing that matters */}
                <div className="flex items-start gap-4 mb-4">
                    <Icon className={cn("w-8 h-8 shrink-0 mt-0.5", v.textPrimary, isColoredCard ? 'opacity-90' : '')} />
                    <h2 className={cn("text-2xl sm:text-3xl font-black leading-tight tracking-tight", v.textPrimary)}>
                        {v.verdict}
                    </h2>
                </div>

                {/* ③ Evidence Line — WHY we say this */}
                <p className={cn("text-sm font-medium leading-relaxed mb-5 pl-12", v.textSecondary)}>
                    {v.evidence}
                </p>

                {/* ④ Suspended trains list (if official data has specifics) */}
                {suspendedTrains.length > 0 && (
                    <div className={cn("rounded-lg p-3 mb-5 border", v.detailsBg, v.detailsBorder)}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold",
                                isColoredCard ? "bg-white/20 text-white" : "bg-gray-800 text-white"
                            )}>公式発表</span>
                        </div>
                        <ul className="space-y-1.5">
                            {suspendedTrains.map((train, i) => (
                                <li key={i} className={cn("text-sm font-bold leading-snug flex items-start gap-2", v.textPrimary)}>
                                    <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-current opacity-60" />
                                    {train}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ⑤ Supporting data: probability + recovery */}
                <div className={cn(
                    "flex items-center gap-4 text-xs font-bold mb-5 px-3 py-2.5 rounded-lg border",
                    v.detailsBg, v.detailsBorder
                )}>
                    {/* Probability (demoted to small supporting info) */}
                    <div className={cn("flex items-center gap-1.5", v.textSecondary)}>
                        <span className="opacity-60">📊</span>
                        <span>AI予測 {result.probability}%</span>
                    </div>

                    {/* Recovery time */}
                    {result.estimatedRecoveryTime && (
                        <>
                            <span className={cn("opacity-30", v.textSecondary)}>|</span>
                            <div className={cn("flex items-center gap-1.5", v.textSecondary)}>
                                <Clock className="w-3.5 h-3.5 opacity-60" />
                                <span>
                                    {result.isPostRecoveryWindow ? '復旧済み' : '復旧見込'} {result.estimatedRecoveryTime}
                                    {result.isOfficialOverride && (
                                        <span className="opacity-60 ml-1">(公式)</span>
                                    )}
                                </span>
                            </div>
                        </>
                    )}

                    {/* Crowd count */}
                    {result.crowdStats && result.crowdStats.last15minReportCount > 0 && (
                        <>
                            <span className={cn("opacity-30", v.textSecondary)}>|</span>
                            <div className={cn("flex items-center gap-1.5", v.textSecondary)}>
                                <Users className="w-3.5 h-3.5 opacity-60" />
                                <span>報告 {result.crowdStats.last15minReportCount}件</span>
                            </div>
                        </>
                    )}
                </div>

                {/* ⑥ CTAs — What to do NOW */}
                {showAlternativesCTA && (
                    <div className="space-y-2.5 mb-5">
                        <a
                            href="#alternative-routes-title"
                            className={cn(
                                "flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl text-sm font-black transition-all shadow-sm active:scale-[0.98]",
                                v.ctaPrimary
                            )}
                        >
                            🚌 代替ルートを見る <ArrowDown size={14} />
                        </a>
                        {result.estimatedRecoveryTime && !result.estimatedRecoveryTime.includes('終日') && (
                            <button
                                className={cn(
                                    "flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-sm font-bold border transition-all active:scale-[0.98]",
                                    v.ctaSecondary
                                )}
                            >
                                🕐 復旧まで待つ（{result.estimatedRecoveryTime}頃）
                            </button>
                        )}
                    </div>
                )}

                {/* ⑦ Collapsible Details */}
                <div className={cn("border-t pt-3", isColoredCard ? 'border-white/15' : 'border-gray-100')}>
                    <button
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className={cn(
                            "w-full flex items-center justify-between py-1.5 text-xs font-bold transition-colors",
                            isColoredCard ? 'text-white/60 hover:text-white/90' : 'text-gray-400 hover:text-gray-700'
                        )}
                    >
                        <span>詳しい分析を見る</span>
                        {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isDetailsOpen && (
                        <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2">
                            {/* Official Text Full */}
                            {hasOfficialInfo && (
                                <div>
                                    <h4 className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", v.textSecondary)}>公式発表 (全文)</h4>
                                    <div className={cn("text-xs leading-relaxed p-3 rounded-lg whitespace-pre-wrap border", v.detailsBg, v.detailsBorder, v.textSecondary)}>
                                        {formatStatusText(result.officialStatus?.rawText || '')}
                                    </div>
                                </div>
                            )}

                            {/* Risk Factors */}
                            {result.reasons.length > 0 && (
                                <div>
                                    <h4 className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", v.textSecondary)}>リスク要因</h4>
                                    <ul className="space-y-1.5">
                                        {result.reasons.map((r, i) => (
                                            <li key={i} className={cn("flex items-start gap-2 text-xs", v.textSecondary)}>
                                                <span className="block w-1 h-1 mt-1.5 rounded-full bg-current opacity-40 shrink-0" />
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Crowd Report Detail */}
                            {result.crowdStats && (result.crowdStats.last15minStopped > 0 || result.crowdStats.last15minDelayed > 0 || result.crowdStats.last15minCrowded > 0) && (
                                <div>
                                    <h4 className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", v.textSecondary)}>ユーザー報告 (直近15分)</h4>
                                    <div className={cn("flex gap-3 text-xs font-bold", v.textSecondary)}>
                                        {result.crowdStats.last15minStopped > 0 && <span>🔴 停止: {result.crowdStats.last15minStopped}件</span>}
                                        {result.crowdStats.last15minDelayed > 0 && <span>🟡 遅延: {result.crowdStats.last15minDelayed}件</span>}
                                        {result.crowdStats.last15minCrowded > 0 && <span>🟠 混雑: {result.crowdStats.last15minCrowded}件</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ⑧ JR Official Link */}
                <div className={cn("mt-4 pt-3 border-t flex justify-center", isColoredCard ? 'border-white/15' : 'border-gray-100')}>
                    <a
                        href={getJRStatusUrl(route.id).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95",
                            isColoredCard
                                ? 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                        )}
                    >
                        JR公式ページで確認 <ExternalLink size={12} />
                    </a>
                </div>
            </div>
        </article>
    );
}
