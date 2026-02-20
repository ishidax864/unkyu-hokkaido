
import { useState } from 'react';
import { PredictionResult, Route } from '@/lib/types';
import { AlertOctagon, AlertTriangle, CheckCircle, Info, Clock, XCircle, ExternalLink, ChevronDown, ChevronUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJRStatusUrl } from '@/lib/hokkaido-data';
import { formatStatusText, splitStatusText, extractSuspendedTrains } from '@/lib/text-parser';
import { evaluateActionDecision, ActionStatusType } from '@/lib/action-decision';

interface PredictionResultCardProps {
    result: PredictionResult;
    route: Route;
}

export function PredictionResultCard({ result, route }: PredictionResultCardProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // 1. Evaluate Decision & Styles
    const actionStatus = evaluateActionDecision(result);
    const { summary: textSummary } = splitStatusText(result.officialStatus?.rawText || '');
    const hasOfficialInfo = !!result.officialStatus;
    const suspendedTrains = extractSuspendedTrains(result.officialStatus?.rawText || '');
    const hasSpecificImpact = suspendedTrains.length > 0;

    const getStatusStyles = (type: ActionStatusType) => {
        switch (type) {
            case 'CRITICAL':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-100',
                    text: 'text-red-900',
                    accent: 'bg-red-600',
                    icon: 'text-red-600',
                    subtext: 'text-red-700',
                    actionBg: 'bg-red-600 hover:bg-red-700',
                };
            case 'HIGH_RISK':
                return {
                    bg: 'bg-orange-50',
                    border: 'border-orange-100',
                    text: 'text-orange-900',
                    accent: 'bg-orange-500',
                    icon: 'text-orange-600',
                    subtext: 'text-orange-700',
                    actionBg: 'bg-orange-600 hover:bg-orange-700',
                };
            case 'CAUTION':
                return {
                    bg: 'bg-amber-50',
                    border: 'border-amber-100',
                    text: 'text-amber-900',
                    accent: 'bg-amber-400',
                    icon: 'text-amber-600',
                    subtext: 'text-amber-700',
                    actionBg: 'bg-amber-600 hover:bg-amber-700',
                };
            case 'NORMAL':
            default:
                return {
                    bg: 'bg-slate-50',
                    border: 'border-slate-100',
                    text: 'text-slate-900',
                    accent: 'bg-emerald-500',
                    icon: 'text-emerald-500',
                    subtext: 'text-slate-600',
                    actionBg: 'bg-emerald-600 hover:bg-emerald-700',
                };
        }
    };

    const styles = getStatusStyles(actionStatus.type);
    const showRecoveryProminent = (result.isCurrentlySuspended || result.isPartialSuspension || result.isPostRecoveryWindow) && result.estimatedRecoveryTime;
    const showAlternativesCTA = actionStatus.type === 'CRITICAL' || actionStatus.type === 'HIGH_RISK';

    return (
        <article className={cn("relative overflow-hidden rounded-2xl bg-white shadow-sm border", styles.border)}>
            {/* Top Color Accent */}
            <div className={cn("h-1.5 w-full", styles.accent)} />

            <div className="p-6">
                {/* 1. Header: Route & Label */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: route.color || '#666' }} />
                        <h3 className="font-bold text-xl text-gray-900 tracking-tight">{route.name}</h3>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold tracking-wider", styles.bg, styles.subtext, "border", styles.border)}>
                        {actionStatus.type === 'CRITICAL' ? '重大' :
                            actionStatus.type === 'HIGH_RISK' ? '高リスク' :
                                actionStatus.type === 'CAUTION' ? '注意' : '平常'}
                    </span>
                </div>

                {/* 2. Hero: Decision & Metrics */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6 mb-6">
                    <div>
                        <h2 className={cn("text-3xl sm:text-4xl font-black mb-2 leading-tight", styles.text)}>
                            {actionStatus.title}
                        </h2>
                        <p className={cn("text-sm font-medium", styles.subtext)}>
                            {actionStatus.message}
                        </p>
                    </div>

                    {/* Visual Meter */}
                    <div className="flex items-center gap-1 self-end sm:self-center">
                        {result.isCurrentlySuspended && !result.isPartialSuspension ? (
                            <div className="flex flex-col items-end">
                                <AlertOctagon className={cn("w-12 h-12 mb-1", styles.icon)} />
                                <span className={cn("text-xs font-bold", styles.subtext)}>運転見合わせ</span>
                            </div>
                        ) : (
                            <div className="text-right">
                                <div className="flex items-baseline justify-end">
                                    <span className={cn("text-5xl font-black tracking-tighter font-en", styles.text)}>
                                        {result.probability}
                                    </span>
                                    <span className={cn("text-xl font-bold ml-0.5 opacity-60", styles.text)}>%</span>
                                </div>
                                <div className={cn("text-xs font-bold uppercase tracking-widest", styles.icon)}>リスクレベル</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Recovery Timeline (PROMOTED — always visible when available) */}
                {showRecoveryProminent && (
                    <div className="mb-6 rounded-xl bg-blue-50 border border-blue-100 p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-1.5 rounded-full bg-blue-100">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                                    {result.isPostRecoveryWindow ? '復旧済み' : '復旧見込'}
                                </p>
                                <p className="text-xl font-black text-blue-900 leading-tight">
                                    {result.estimatedRecoveryTime}
                                </p>
                            </div>
                            {!result.isPostRecoveryWindow && (
                                <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                    {result.isOfficialOverride ? '公式発表' : 'AI予測'}
                                </span>
                            )}
                        </div>
                        {result.recoveryRecommendation && (
                            <p className="text-xs text-blue-700 leading-relaxed pl-10">
                                {result.recoveryRecommendation}
                            </p>
                        )}
                    </div>
                )}

                {/* 4. Action Card — What to do NOW */}
                <div className={cn("rounded-xl p-5 border-l-4 shadow-sm", styles.bg, styles.border)}>
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn("p-2 rounded-full shrink-0", "bg-white/60")}>
                            {actionStatus.type === 'CRITICAL' ? <XCircle className={cn("w-6 h-6", styles.icon)} /> :
                                actionStatus.type === 'HIGH_RISK' ? <AlertTriangle className={cn("w-6 h-6", styles.icon)} /> :
                                    actionStatus.type === 'CAUTION' ? <Info className={cn("w-6 h-6", styles.icon)} /> :
                                        <CheckCircle className={cn("w-6 h-6", styles.icon)} />}
                        </div>

                        <div className="space-y-3 w-full">
                            {/* Official suspended trains list */}
                            {hasSpecificImpact && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 rounded-sm bg-black/80 text-white text-[10px] font-bold">公式発表 (抜粋)</span>
                                    </div>
                                    <ul className="space-y-2.5">
                                        {suspendedTrains.map((train, i) => (
                                            <li key={i} className={cn("text-base font-bold leading-snug flex items-start gap-2", styles.text)}>
                                                <span className={cn("block w-1.5 h-1.5 mt-2 rounded-full opacity-70 bg-current")} />
                                                {train}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Official summary (non-specific) */}
                            {!hasSpecificImpact && result.isOfficialOverride && (
                                <div className={cn("text-base font-bold leading-relaxed", styles.text)}>
                                    <span className="inline-block px-2 py-0.5 mb-2 rounded-sm bg-black/80 text-white text-[10px] font-bold">公式発表</span>
                                    <div>{formatStatusText(textSummary)}</div>
                                </div>
                            )}

                            {/* Primary reason (weather-based) */}
                            {!hasSpecificImpact && !result.isOfficialOverride && (
                                <div className={cn("text-base font-bold leading-relaxed", styles.text)}>
                                    {result.reasons[0] || '特段のリスク要因は検出されていません'}
                                </div>
                            )}

                            {/* NEXT ACTION — the key deliverable */}
                            <div className={cn("pt-3 border-t border-black/5")}>
                                <p className={cn("text-xs font-bold opacity-60 mb-1 tracking-wider", styles.subtext)}>
                                    {actionStatus.type === 'NORMAL' ? '✅ 判定' : '⚡ あなたの次のアクション'}
                                </p>
                                <p className={cn("text-sm font-bold leading-relaxed", styles.text)}>
                                    {actionStatus.nextAction}
                                </p>
                            </div>

                            {/* CTA: Scroll to alternatives */}
                            {showAlternativesCTA && (
                                <a
                                    href="#alternative-routes-title"
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-sm active:scale-95",
                                        styles.actionBg
                                    )}
                                >
                                    代替ルート・行動提案を見る <ArrowDown size={14} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. Collapsible Details */}
                <div className="border-t border-gray-100 pt-4 mt-6">
                    <button
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <span>詳細情報・要因内訳</span>
                        {isDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isDetailsOpen && (
                        <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2">

                            {/* Official Text Full */}
                            {hasOfficialInfo && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">公式発表 (全文)</h4>
                                    <div className="text-xs leading-relaxed text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                                        {formatStatusText(result.officialStatus?.rawText || '')}
                                    </div>
                                </div>
                            )}

                            {/* Risk Factors List */}
                            {result.reasons.length > 1 && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">リスク要因</h4>
                                    <ul className="space-y-2">
                                        {result.reasons.slice(result.isOfficialOverride ? 0 : 1).map((r, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                                <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-gray-300 shrink-0" />
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Crowd Reports */}
                            {result.crowdStats && (result.crowdStats.last15minStopped > 0 || result.crowdStats.last15minDelayed > 0) && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ユーザー報告 (直近15分)</h4>
                                    <div className="flex gap-3 text-xs font-bold">
                                        {result.crowdStats.last15minStopped > 0 && <span className="text-red-600">停止: {result.crowdStats.last15minStopped}件</span>}
                                        {result.crowdStats.last15minDelayed > 0 && <span className="text-amber-600">遅延: {result.crowdStats.last15minDelayed}件</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer: JR Official Link */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
                    <a
                        href={getJRStatusUrl(route.id).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-sm hover:shadow active:scale-95"
                    >
                        JR公式ページで確認 <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </article>
    );
}
