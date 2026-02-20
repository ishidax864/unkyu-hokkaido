
import { useState } from 'react';
import { PredictionResult, Route } from '@/lib/types';
import { AlertOctagon, AlertTriangle, ArrowRight, CheckCircle, Info, MapPin, RefreshCw, Clock, XCircle, AlertCircle, ExternalLink, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJRStatusUrl } from '@/lib/hokkaido-data';
import { formatStatusText, splitStatusText } from '@/lib/text-parser';
import { evaluateActionDecision } from '@/lib/action-decision';

interface PredictionResultCardProps {
    result: PredictionResult;
    route: Route;
    targetDate: string; // YYYY-MM-DD format
    targetTime: string; // HH:MM format
}

export function PredictionResultCard({ result, route }: Omit<PredictionResultCardProps, 'targetTime' | 'targetDate'>) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // 1. Evaluate Decision & Styles
    const actionStatus = evaluateActionDecision(result);
    const { summary: textSummary, details: textDetails } = splitStatusText(result.officialStatus?.rawText || '');
    const hasOfficialInfo = !!result.officialStatus;

    const getStatusStyles = (type: 'CRITICAL' | 'CAUTION' | 'NORMAL') => {
        switch (type) {
            case 'CRITICAL':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-100',
                    text: 'text-red-900',
                    accent: 'bg-red-600',
                    icon: 'text-red-600',
                    subtext: 'text-red-700'
                };
            case 'HIGH_RISK':
                return {
                    bg: 'bg-orange-50',
                    border: 'border-orange-100',
                    text: 'text-orange-900',
                    accent: 'bg-orange-500',
                    icon: 'text-orange-600',
                    subtext: 'text-orange-700'
                };
            case 'CAUTION':
                return {
                    bg: 'bg-amber-50',
                    border: 'border-amber-100',
                    text: 'text-amber-900',
                    accent: 'bg-amber-400',
                    icon: 'text-amber-600',
                    subtext: 'text-amber-700'
                };
            case 'NORMAL':
            default:
                return {
                    bg: 'bg-slate-50',
                    border: 'border-slate-100',
                    text: 'text-slate-900',
                    accent: 'bg-emerald-500',
                    icon: 'text-emerald-500',
                    subtext: 'text-slate-600'
                };
        }
    };

    const styles = getStatusStyles(actionStatus.type);

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
                    {/* Status Badge */}
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase", styles.bg, styles.subtext, "border", styles.border)}>
                        {actionStatus.type === 'CRITICAL' ? 'Severe' :
                            actionStatus.type === 'HIGH_RISK' ? 'High Risk' :
                                actionStatus.type === 'CAUTION' ? 'Caution' : 'Normal'}
                    </span>
                </div>

                {/* 2. Hero: Decision & Metrics */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6 mb-8">
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
                                <div className={cn("text-xs font-bold uppercase tracking-widest", styles.icon)}>Risk Level</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Primary Reason (The "Why") */}
                <div className="mb-6">
                    <div className={cn("rounded-xl p-4 flex items-start gap-3", styles.bg)}>
                        {/* Icon based on status */}
                        {actionStatus.type === 'CRITICAL' ? <AlertOctagon className={cn("w-5 h-5 shrink-0 mt-0.5", styles.icon)} /> :
                            actionStatus.type === 'HIGH_RISK' ? <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", styles.icon)} /> :
                                actionStatus.type === 'CAUTION' ? <Info className={cn("w-5 h-5 shrink-0 mt-0.5", styles.icon)} /> :
                                    <CheckCircle className={cn("w-5 h-5 shrink-0 mt-0.5", styles.icon)} />}

                        <div className="space-y-3 w-full">
                            {/* Prioritize Official Text as Reason if available */}
                            <div className={cn("text-sm font-bold leading-relaxed", styles.text)}>
                                {result.isOfficialOverride && textSummary ?
                                    <div className="flex flex-col gap-1">
                                        <span className="inline-flex items-center gap-1.5"><span className="px-2 py-0.5 rounded-sm bg-black/80 text-white text-[10px] font-bold">公式発表</span></span>
                                        <span className="mt-1">{formatStatusText(textSummary)}</span>
                                    </div> :
                                    (result.reasons[0] || '特段のリスク要因は検出されていません')}
                            </div>

                            {/* 🆕 Actionable Advice & Resumption Info */}
                            <div className="pt-3 border-t border-black/10 flex flex-col gap-2">
                                {actionStatus.resumptionEstimate && (
                                    <div className={cn("flex items-center gap-2 font-bold", styles.text)}>
                                        <Clock className="w-4 h-4 shrink-0" />
                                        <span>{actionStatus.resumptionEstimate}</span>
                                    </div>
                                )}
                                <div className={cn("flex items-start gap-2 text-sm leading-relaxed", styles.subtext)}>
                                    <span className="font-bold shrink-0">💡 次のアクション:</span>
                                    <span>{actionStatus.nextAction}</span>
                                </div>
                            </div>

                            {/* Show timestamp if official */}
                            {result.officialStatus && (
                                <p className="text-[10px] text-gray-400">
                                    {new Date(result.officialStatus.updatedAt || '').toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 現在
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Collapsible Details (Unified) */}
                <div className="border-t border-gray-100 pt-4">
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

                            {/* Recovery Info Logic */}
                            {result.isCurrentlySuspended && !result.isPartialSuspension && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">復旧予測</h4>
                                    <div className="bg-blue-50/50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            <span className="font-bold text-blue-900 text-sm">
                                                {result.estimatedRecoveryTime || '目処立たず'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-800">{result.recoveryRecommendation}</p>
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

                {/* Footer: Action */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
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
