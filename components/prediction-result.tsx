'use client';

import { PredictionResult } from '@/lib/types';
import { Route } from '@/lib/types';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, Info, TrendingUp, Clock, AlertOctagon, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJRStatusUrl } from '@/lib/hokkaido-data';

interface PredictionResultCardProps {
    result: PredictionResult;
    route: Route;
    targetDate: string; // YYYY-MM-DD format
}

export function PredictionResultCard({ result, route, targetDate }: PredictionResultCardProps) {
    const _isHighRisk = result.probability >= 50;
    const isRecoveryMode = result.mode === 'recovery' || result.isCurrentlySuspended;

    // 当日かどうかを判定
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = targetDate === today;

    // ステータスに応じた設定（信号色）
    const _getStatusConfig = () => {
        switch (result.status) {
            case '運休中':
                return { icon: AlertOctagon, className: 'status-suspended' };
            case '運休':
                return { icon: XCircle, className: 'status-suspended' };
            case '運転見合わせ':
                return { icon: AlertTriangle, className: 'status-suspended' };
            case '遅延':
                return { icon: AlertCircle, className: 'status-warning' };
            default:
                return { icon: CheckCircle, className: 'status-normal' };
        }
    };




    // 確率に応じた色
    const getProgressColor = () => {
        if (result.probability >= 70) return 'bg-[var(--status-suspended)]';
        if (result.probability >= 50) return 'bg-orange-500';
        if (result.probability >= 20) return 'bg-[var(--status-warning)]';
        return 'bg-[var(--status-normal)]';
    };

    const getProbabilityTextColor = () => {
        if (result.probability >= 50) return 'text-[var(--status-suspended)]';
        if (result.probability >= 20) return 'text-[var(--status-warning)]';
        return 'text-[var(--status-normal)]';
    };

    // 復旧予測モードの場合は別のUIを表示
    if (isRecoveryMode) {
        return (
            <article className="card p-4 border-2 border-[var(--status-suspended)]">
                {/* 運休中バナー */}
                <div className="bg-[var(--status-suspended)] text-white px-4 py-3 -mx-4 -mt-4 mb-4 rounded-t-xl flex items-center gap-3">
                    <AlertOctagon className="w-7 h-7" />
                    <div>
                        <div className="font-black text-xl leading-tight">現在運休中</div>
                        <div className="text-xs opacity-90">{result.suspensionReason || '運転を見合わせています'}</div>
                    </div>
                </div>

                {/* ヘッダー */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="route-color-bar h-14"
                            style={{ backgroundColor: route.color || '#666' }}
                        />
                        <div>
                            <h3 className="font-black text-xl leading-tight">{route.name}</h3>
                            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">{route.company}</p>
                        </div>
                    </div>
                </div>

                {/* ユーザー報告（リアルタイム） */}
                {result.crowdStats && (result.crowdStats.last15minStopped > 0 || result.crowdStats.last15minResumed > 0) && (
                    <div className="mb-4 space-y-2">
                        {result.crowdStats.last15minStopped > 0 && (
                            <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 animate-pulse">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    直近15分で<span className="font-bold text-lg mx-1">{result.crowdStats.last15minStopped}人</span>が「止まっている」と報告しています
                                </span>
                            </div>
                        )}
                        {result.crowdStats.last15minResumed > 0 && (
                            <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-green-100 animate-pulse">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    直近15分で<span className="font-bold text-lg mx-1">{result.crowdStats.last15minResumed}人</span>が「動き出した」と報告しています
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* 復旧予測 */}
                <div className="mb-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] mb-2">
                        <Clock className="w-4 h-4" />
                        復旧見込み
                    </div>
                    <div className="bg-[var(--background-secondary)] rounded-lg p-4">
                        <div className="text-3xl font-black text-[var(--status-suspended)]">
                            {result.estimatedRecoveryTime || '復旧時刻未定'}
                        </div>
                        <div className="text-[10px] text-[var(--muted)]/70 text-right mt-1">
                            Powered by Open-Meteo
                        </div>
                        <div className="text-[10px] text-[var(--muted)] mt-1 opacity-80">
                            {result.isOfficialOverride
                                ? '※JR北海道公式発表に基づく情報です'
                                : '※天気予報と過去データに基づく予測です'}
                        </div>
                    </div>
                </div>



                {/* 詳細情報 */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                        <Info className="w-4 h-4" />
                        状況
                    </div>
                    <ul className="space-y-1.5">
                        {result.reasons.map((reason, index) => (
                            <li
                                key={index}
                                className="flex items-start gap-2 text-sm"
                            >
                                <span className="text-[var(--status-suspended)] mt-0.5">•</span>
                                {reason}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 公式情報へのリンク促進 */}
                <a
                    href={getJRStatusUrl(route.id).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm hover:bg-orange-100 transition-colors"
                >
                    <div className="flex items-center gap-2 text-orange-700 font-medium justify-center">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            最新情報はJR公式サイトをご確認ください
                        </div>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                    </div>
                </a>
            </article>
        );
    }

    // 通常モード（運休リスク予測）
    return (
        <article className="card p-4">
            {/* ヘッダー */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="route-color-bar h-14"
                        style={{ backgroundColor: route.color || '#666' }}
                    />
                    <div>
                        <h3 className="font-black text-xl leading-tight">{route.name}</h3>
                        <p className="text-xs text-[var(--muted)] uppercase tracking-wider">{route.company}</p>
                    </div>
                </div>
            </div>


            {/* 📡 現在の運行状況（JR公式） - データがある場合のみ表示 */}
            {result.officialStatus && (
                <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <span>📡</span> 現在の運行状況（JR公式）
                        <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-bold">実データ</span>
                    </div>

                    {/* ステータス表示 */}
                    <div className="font-black text-xl flex items-center gap-2">
                        {result.officialStatus.status === 'suspended' || result.officialStatus.status === 'cancelled' ? (
                            <span className="text-red-600">🔴 運休・見合わせ</span>
                        ) : result.officialStatus.status === 'delay' ? (
                            <span className="text-yellow-600">🟡 遅延</span>
                        ) : result.officialStatus.status === 'normal' ? (
                            <span className="text-green-600">🟢 {result.officialStatus.statusText.replace(/。/g, '') || '現在、遅れに関する情報はありません'}</span>
                        ) : (
                            <span className="text-gray-600">⚪ 情報なし</span>
                        )}
                    </div>

                    {/* 原文テキスト（あれば） */}
                    {result.officialStatus.rawText && result.officialStatus.status !== 'normal' && (
                        <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 leading-relaxed">
                            "{result.officialStatus.rawText}"
                        </div>
                    )}

                    <div className="text-[10px] text-gray-400 text-right mt-1">
                        更新: {result.officialStatus.updatedAt ? new Date(result.officialStatus.updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </div>
                </div>
            )}

            {/* 📊 予測セクション (ユーザーの出発時刻に基づく) */}
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <span>📊</span> あなたの出発時刻の予測
            </div>


            {/* ユーザー報告（リアルタイム） */}
            {
                result.crowdStats && (result.crowdStats.last15minStopped > 0 || result.crowdStats.last15minDelayed > 0 || result.crowdStats.last15minCrowded > 0 || result.crowdStats.last15minResumed > 0) && (
                    <div className="mb-4 space-y-2">
                        {result.crowdStats.last15minStopped > 0 && (
                            <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 animate-pulse">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    直近15分で<span className="font-bold text-lg mx-1">{result.crowdStats.last15minStopped}人</span>が「止まっている」と報告しています
                                </span>
                            </div>
                        )}
                        {result.crowdStats.last15minDelayed > 0 && (
                            <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-yellow-100 animate-pulse">
                                <Clock className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    直近15分で<span className="font-bold text-lg mx-1">{result.crowdStats.last15minDelayed}人</span>が「遅延」を報告しています
                                </span>
                            </div>
                        )}
                        {result.crowdStats.last15minCrowded > 0 && (
                            <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-orange-100 animate-pulse">
                                <Users className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    直近15分で<span className="font-bold text-lg mx-1">{result.crowdStats.last15minCrowded}人</span>が「混雑」を報告しています
                                </span>
                            </div>
                        )}
                        {result.crowdStats.last15minResumed > 0 && (
                            <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-green-100 animate-pulse">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    直近15分で<span className="font-bold text-lg mx-1">{result.crowdStats.last15minResumed}人</span>が「動き出した」と報告しています
                                </span>
                            </div>
                        )}
                    </div>
                )
            }

            {/* 確率表示 (Hero Metric) */}
            <div className="mb-6 text-center">
                <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">
                    運休リスク予測
                </div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className={cn("text-6xl md:text-7xl font-black leading-none tracking-tighter", getProbabilityTextColor())}>
                        {result.probability}
                    </span>
                    <span className={cn("text-2xl font-black", getProbabilityTextColor())}>%</span>
                </div>

                {/* 🆕 予測結果の明示的表示 (結論) */}
                <div className={`inline-block py-1.5 px-4 rounded-full font-bold text-sm mb-4 ${result.probability >= 70 ? 'bg-red-100 text-red-700 border border-red-200' :
                    result.probability >= 40 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        result.probability >= 20 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                    {
                        result.probability >= 70 ? '運休の可能性が高い' :
                            result.probability >= 40 ? '遅延・運休に注意' :
                                result.probability >= 20 ? '多少の影響あり' :
                                    `${route.name}は通常運行の見込み`
                    }
                </div>

                {/* プログレスバー */}
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={cn('h-full rounded-full transition-all duration-1000 ease-out', getProgressColor())}
                        style={{ width: `${result.probability}%` }}
                    />
                </div>
            </div>

            {/* 理由リスト */}
            <div className="bg-gray-50/50 rounded-lg p-4 mb-4 border border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5" />
                    予測の根拠
                </div>
                <ul className="space-y-2">
                    {result.reasons.map((reason, index) => (
                        <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-[var(--foreground)] leading-relaxed"
                        >
                            <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", getProgressColor())} />
                            {reason}
                        </li>
                    ))}
                </ul>
            </div>

            {/* 公式情報へのリンク促進 (Normal Mode) */}
            <a
                href={getJRStatusUrl(route.id).url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm hover:bg-gray-100 transition-colors mb-4"
            >
                <div className="flex items-center gap-2 text-gray-600 font-medium justify-center">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                        JR公式発表を確認する
                    </div>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                </div>
            </a>

            {/* 信頼度・影響度・メタデータ */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-200">
                <div className="flex flex-col items-center justify-center p-2 rounded bg-gray-50">
                    <span className="text-[10px] text-[var(--muted)] font-bold uppercase">予測信頼度</span>
                    <div className="flex items-center gap-1 mt-0.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[var(--muted)]" />
                        <span className={cn(
                            'font-bold text-sm',
                            result.confidence === 'high' ? 'text-[var(--status-normal)]' :
                                result.confidence === 'medium' ? 'text-[var(--status-warning)]' : 'text-[var(--muted)]'
                        )}>
                            {result.confidence === 'high' ? '高い' : result.confidence === 'medium' ? '中' : '低い'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded bg-gray-50">
                    <span className="text-[10px] text-[var(--muted)] font-bold uppercase">天気の影響</span>
                    <div className="mt-0.5">
                        <span className={cn(
                            'font-bold text-sm',
                            result.weatherImpact === '重大' ? 'text-[var(--status-suspended)]' :
                                result.weatherImpact === '中程度' ? 'text-orange-500' :
                                    result.weatherImpact === '軽微' ? 'text-[var(--status-warning)]' : 'text-[var(--status-normal)]'
                        )}>
                            {result.weatherImpact}
                        </span>
                    </div>
                </div>
            </div>

        </article>
    );
}
