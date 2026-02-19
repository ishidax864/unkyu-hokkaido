
import { useState } from 'react';
import { PredictionResult, Route } from '@/lib/types';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, Info, Clock, AlertOctagon, ExternalLink, Users, ChevronDown, ChevronUp } from 'lucide-react';
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
    const isRecoveryMode = result.mode === 'recovery' || result.isCurrentlySuspended;

    // Split text into summary and details
    const { summary: textSummary, details: textDetails } = splitStatusText(result.officialStatus?.rawText || '');
    const hasDetails = !!textSummary || !!textDetails;

    // 復旧予測モードの場合は別のUIを表示
    if (isRecoveryMode) {
        return (
            <article className="card p-4 border-2 border-[var(--status-suspended)]">
                {/* 📡 現在の運行状況（JR公式） */}
                {result.officialStatus && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span>📡</span> JR公式発表
                                <span className="text-[10px] text-gray-400">
                                    {new Date(result.officialStatus.updatedAt || '').toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}更新
                                </span>
                            </div>
                        </div>

                        {/* ステータス表示 - シンプル化 */}
                        {(() => {
                            const status = result.officialStatus.status;
                            const text = textSummary || '';

                            let displayStatus: 'suspended' | 'delay' | 'normal' | 'unknown' = 'unknown';

                            if (status === 'suspended' || status === 'cancelled' || text.includes('運休') || text.includes('見合わせ')) {
                                displayStatus = 'suspended';
                            } else if (status === 'delay' || text.includes('遅れ') || text.includes('遅延')) {
                                displayStatus = 'delay';
                            } else if (status === 'normal') {
                                displayStatus = 'normal';
                            }

                            return (
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2">
                                    <div className="font-black text-xl flex items-center gap-2">
                                        {displayStatus === 'suspended' ? (
                                            <span className="text-red-600 flex items-center gap-2"><AlertOctagon className="w-6 h-6" /> 運休・見合わせ中</span>
                                        ) : displayStatus === 'delay' ? (
                                            <span className="text-yellow-600 flex items-center gap-2"><AlertCircle className="w-6 h-6" /> 遅延・ダイヤ乱れ</span>
                                        ) : displayStatus === 'normal' ? (
                                            <span className="text-green-600 flex items-center gap-2"><CheckCircle className="w-6 h-6" /> 平常運転</span>
                                        ) : (
                                            <span className="text-gray-600">⚪ 情報なし</span>
                                        )}
                                    </div>
                                    {/* 原文サマリー（短縮版） */}
                                    {textSummary && (
                                        <div className="mt-2 text-sm text-gray-700 leading-snug">
                                            {formatStatusText(textSummary)}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* 詳細アコーディオン */}
                        {hasDetails && (
                            <button
                                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                                className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 py-1 hover:bg-gray-50 rounded transition-colors"
                            >
                                {isDetailsOpen ? '詳細を隠す' : '詳細を表示'}
                                {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        )}

                        {isDetailsOpen && textDetails && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-1">
                                {formatStatusText(textDetails)}
                            </div>
                        )}
                    </div>
                )}

                {/* ヘッダー */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="route-color-bar h-10 w-1.5 rounded-full" style={{ backgroundColor: route.color || '#666' }} />
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{route.name}</h3>
                        </div>
                    </div>
                </div>

                {/* 🆕 Action Status Display (Even in Recovery Mode) */}
                {(() => {
                    const status = evaluateActionDecision(result);
                    const IconComponent = () => {
                        if (status.iconType === 'x-circle') return <XCircle size={48} />;
                        if (status.iconType === 'alert-triangle') return <AlertTriangle size={48} />;
                        return <CheckCircle size={48} />;
                    };

                    return (
                        <div className={`rounded-2xl p-6 mb-8 text-center shadow-lg transform transition-all hover:scale-[1.02] ${status.bgColor}`}>
                            <div className="flex justify-center mb-4 opacity-90">
                                <IconComponent />
                            </div>
                            <h2 className="text-3xl font-black mb-2 tracking-tight">{status.title}</h2>
                            <p className="font-bold opacity-90 text-sm mb-4">{status.message}</p>

                            {/* Compact Risk Rate for Reference */}
                            <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold ${status.subColor} bg-opacity-30`}>
                                運休リスク: {result.probability}%
                            </div>
                        </div>
                    );
                })()}

                {/* 復旧予測 (Main Feature for Recovery Mode) */}
                <div className="mb-4">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-5 text-center shadow-sm">
                        <div className="text-xs font-bold text-[var(--muted)] mb-1 uppercase tracking-wider">AI復旧予測</div>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Clock className="w-6 h-6 text-[var(--status-suspended)]" />
                            <div className="text-3xl font-black text-[var(--status-suspended)]">
                                {result.estimatedRecoveryTime || '未定'}
                            </div>
                        </div>

                        {result.suspensionScale && (
                            <span className={cn(
                                "inline-block px-3 py-1 rounded-full text-xs font-bold mb-2",
                                result.suspensionScale === 'all-day' ? "bg-red-100 text-red-700" :
                                    result.suspensionScale === 'large' ? "bg-orange-100 text-orange-700" :
                                        result.suspensionScale === 'medium' ? "bg-yellow-100 text-yellow-700" :
                                            "bg-blue-100 text-blue-700"
                            )}>
                                {result.suspensionScale === 'all-day' ? '終日運休の恐れ' :
                                    result.suspensionScale === 'large' ? '大規模な運休' :
                                        result.suspensionScale === 'medium' ? '半日程度の運休' :
                                            '一時的な見合わせ'}
                            </span>
                        )}

                        <div className="text-xs text-left bg-white/50 p-3 rounded mt-2 border border-black/5">
                            <div className="font-bold text-[var(--status-suspended)] mb-1">復旧シナリオ</div>
                            {result.recoveryRecommendation || '気象回復後の安全確認完了を待って再開'}
                        </div>
                    </div>
                </div>

                {/* 公式情報へのリンク */}
                <a
                    href={getJRStatusUrl(route.id).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white border border-gray-200 rounded-lg p-3 text-sm text-center hover:bg-gray-50 transition-colors text-blue-600 font-bold"
                >
                    JR公式ページで確認 <ExternalLink className="inline w-3 h-3 ml-1" />
                </a>
            </article>
        );
    }

    // 通常モード（運休リスク予測）
    return (
        <article className="card p-5">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="route-color-bar h-10 w-1.5 rounded-full" style={{ backgroundColor: route.color || '#666' }} />
                    <h3 className="font-bold text-lg leading-tight">{route.name}</h3>
                </div>
                {/* 現在の公式ステータス (Mini Badge) */}
                {result.officialStatus && result.officialStatus.status !== 'normal' && (
                    <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full font-bold border border-yellow-200 truncate max-w-[120px]">
                        公式: {result.officialStatus.statusText}
                    </span>
                )}
            </div>

            {/* 🆕 Action Status Display (Hero Section) */}
            {(() => {
                const status = evaluateActionDecision(result);

                // Helper to render icon based on type string
                const IconComponent = () => {
                    if (status.iconType === 'x-circle') return <XCircle size={48} />;
                    if (status.iconType === 'alert-triangle') return <AlertTriangle size={48} />;
                    return <CheckCircle size={48} />;
                };

                return (
                    <div className={`rounded-2xl p-6 mb-8 text-center shadow-lg transform transition-all hover:scale-[1.02] ${status.bgColor}`}>
                        <div className="flex justify-center mb-4 opacity-90">
                            <IconComponent />
                        </div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight">{status.title}</h2>
                        <p className="font-bold opacity-90 text-sm mb-4">{status.message}</p>

                        {/* Compact Risk Rate for Reference */}
                        <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold ${status.subColor} bg-opacity-30`}>
                            運休リスク: {result.probability}%
                        </div>
                    </div>
                );
            })()}

            {/* ユーザー報告（リアルタイム） - Compact */}
            {result.crowdStats && (result.crowdStats.last15minStopped > 0 || result.crowdStats.last15minDelayed > 0 || result.crowdStats.last15minResumed > 0) && (
                <div className="mb-6 mx-2 bg-white/80 backdrop-blur-sm border border-red-100 rounded-lg p-3 shadow-sm animate-pulse">
                    <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider mb-1">
                        <Users size={14} />
                        <span className="flex-1">ユーザーからのリアルタイム報告</span>
                        <span className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded text-red-600">現在</span>
                    </div>
                    <div className="flex items-center gap-3 pl-1">
                        {result.crowdStats.last15minStopped > 0 && (
                            <div className="flex items-center gap-1 text-red-700 font-bold text-sm">
                                <AlertOctagon size={14} />
                                <span>停止: {result.crowdStats.last15minStopped}件</span>
                            </div>
                        )}
                        {result.crowdStats.last15minDelayed > 0 && (
                            <div className="flex items-center gap-1 text-yellow-700 font-bold text-sm">
                                <Clock size={14} />
                                <span>遅延: {result.crowdStats.last15minDelayed}件</span>
                            </div>
                        )}
                        {result.crowdStats.last15minResumed > 0 && (
                            <div className="flex items-center gap-1 text-green-700 font-bold text-sm">
                                <CheckCircle size={14} />
                                <span>再開: {result.crowdStats.last15minResumed}件</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* リスク要因リスト (Simplified) */}
            <div className="mb-6">
                <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">主な要因</div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {result.reasons.length > 0 ? (
                        result.reasons.slice(0, 3).map((reason, index) => (
                            <div key={index} className="flex items-start gap-2.5">
                                <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${index === 0 ? 'bg-[var(--status-suspended)]' : 'bg-gray-300'}`} />
                                <span className={`text-sm ${index === 0 ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{reason}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-gray-500 text-center py-2">特になし</div>
                    )}
                </div>
            </div>

            {/* 詳細ボタン */}
            <button
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
                {isDetailsOpen ? '閉じる' : '詳細データ・公式情報'}
                {isDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* 折りたたみ詳細エリア */}
            {isDetailsOpen && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 space-y-4">
                    {/* 公式情報の詳細 */}
                    {result.officialStatus && (
                        <div>
                            <div className="text-xs font-bold text-gray-400 mb-1">JR北海道 公式発表</div>
                            <div className="text-xs bg-blue-50/50 p-2 rounded text-gray-700 leading-relaxed border border-blue-100">
                                {formatStatusText(result.officialStatus.rawText || '情報なし')}
                                <div className="text-[10px] text-right text-gray-400 mt-1">
                                    {new Date(result.officialStatus.updatedAt || '').toLocaleTimeString()} 更新
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 残りのリスク要因 */}
                    {result.reasons.length > 3 && (
                        <div>
                            <div className="text-xs font-bold text-gray-400 mb-1">その他の要因</div>
                            <ul className="space-y-1 pl-2">
                                {result.reasons.slice(3).map((r, i) => (
                                    <li key={i} className="text-xs text-gray-500">• {r}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}
