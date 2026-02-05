'use client';

import { PredictionResult } from '@/lib/types';
import { Route } from '@/lib/types';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, Info, TrendingUp, Clock, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PredictionResultCardProps {
    result: PredictionResult;
    route: Route;
}

export function PredictionResultCard({ result, route }: PredictionResultCardProps) {
    const isHighRisk = result.probability >= 50;
    const isRecoveryMode = result.mode === 'recovery' || result.isCurrentlySuspended;

    // ステータスに応じた設定（信号色）
    const getStatusConfig = () => {
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

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;

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
            <div className="card p-4 border-2 border-[var(--status-suspended)]">
                {/* 運休中バナー */}
                <div className="bg-[var(--status-suspended)] text-white px-4 py-3 -mx-4 -mt-4 mb-4 rounded-t-xl flex items-center gap-3">
                    <AlertOctagon className="w-6 h-6" />
                    <div>
                        <div className="font-bold text-lg">現在運休中</div>
                        <div className="text-sm opacity-90">{result.suspensionReason || '運転を見合わせています'}</div>
                    </div>
                </div>

                {/* ヘッダー */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="route-color-bar h-12"
                            style={{ backgroundColor: route.color || '#666' }}
                        />
                        <div>
                            <h3 className="font-bold text-lg">{route.name}</h3>
                            <p className="text-sm text-[var(--muted)]">{route.company}</p>
                        </div>
                    </div>
                </div>

                {/* ユーザー報告（リアルタイム） */}
                {result.crowdStats && (result.crowdStats.last30minStopped > 0 || result.crowdStats.last30minResumed > 0) && (
                    <div className="mb-4 space-y-2">
                        {result.crowdStats.last30minStopped > 0 && (
                            <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 animate-pulse">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    直近30分で<span className="font-bold text-lg mx-1">{result.crowdStats.last30minStopped}人</span>が「止まっている」と報告しています
                                </span>
                            </div>
                        )}
                        {result.crowdStats.last30minResumed > 0 && (
                            <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-green-100 animate-pulse">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    直近30分で<span className="font-bold text-lg mx-1">{result.crowdStats.last30minResumed}人</span>が「動き出した」と報告しています
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
                        <div className="text-2xl font-bold text-[var(--status-suspended)]">
                            {result.estimatedRecoveryTime || '復旧時刻未定'}
                        </div>
                        <div className="text-sm text-[var(--muted)] mt-1">
                            ※天気予報と過去データに基づく予測です
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
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 text-orange-700 font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        最新情報はJR公式サイトをご確認ください
                    </div>
                </div>
            </div>
        );
    }

    // 通常モード（運休リスク予測）
    return (
        <div className="card p-4">
            {/* ヘッダー */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="route-color-bar h-12"
                        style={{ backgroundColor: route.color || '#666' }}
                    />
                    <div>
                        <h3 className="font-bold text-lg">{route.name}</h3>
                        <p className="text-sm text-[var(--muted)]">{route.company}</p>
                    </div>
                </div>
                <div className={cn('px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-bold', statusConfig.className)}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{result.status}</span>
                </div>
            </div>

            {/* ユーザー報告（リアルタイム） */}
            {result.crowdStats && (result.crowdStats.last30minStopped > 0 || result.crowdStats.last30minResumed > 0) && (
                <div className="mb-4 space-y-2">
                    {result.crowdStats.last30minStopped > 0 && (
                        <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 animate-pulse">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>
                                直近30分で<span className="font-bold text-lg mx-1">{result.crowdStats.last30minStopped}人</span>が「止まっている」と報告しています
                            </span>
                        </div>
                    )}
                    {result.crowdStats.last30minResumed > 0 && (
                        <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-green-100 animate-pulse">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>
                                直近30分で<span className="font-bold text-lg mx-1">{result.crowdStats.last30minResumed}人</span>が「動き出した」と報告しています
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* 確率表示 */}
            <div className="mb-5">
                <div className="flex items-end justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--muted)]">運休リスク</span>
                    <div className="flex items-baseline gap-0.5">
                        <span className={cn("text-4xl font-black", getProbabilityTextColor())}>
                            {result.probability}
                        </span>
                        <span className="text-xl font-bold text-[var(--muted)]">%</span>
                    </div>
                </div>

                {/* プログレスバー */}
                <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={cn('h-full rounded-full transition-all duration-500', getProgressColor())}
                        style={{ width: `${result.probability}%` }}
                    />
                </div>
            </div>

            {/* 理由リスト */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                    <Info className="w-4 h-4" />
                    予測根拠
                </div>
                <ul className="space-y-1.5">
                    {result.reasons.map((reason, index) => (
                        <li
                            key={index}
                            className="flex items-start gap-2 text-sm"
                        >
                            <span className="text-[var(--primary)] mt-0.5">•</span>
                            {reason}
                        </li>
                    ))}
                </ul>
            </div>

            {/* 信頼度・影響度 */}
            <div className="flex items-center gap-4 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    予測信頼度:
                    <span className={cn(
                        'font-bold',
                        result.confidence === 'high' ? 'text-[var(--status-normal)]' :
                            result.confidence === 'medium' ? 'text-[var(--status-warning)]' : 'text-[var(--muted)]'
                    )}>
                        {result.confidence === 'high' ? '高' : result.confidence === 'medium' ? '中' : '低'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    天気影響:
                    <span className={cn(
                        'font-bold',
                        result.weatherImpact === '重大' ? 'text-[var(--status-suspended)]' :
                            result.weatherImpact === '中程度' ? 'text-orange-500' :
                                result.weatherImpact === '軽微' ? 'text-[var(--status-warning)]' : 'text-[var(--muted)]'
                    )}>
                        {result.weatherImpact}
                    </span>
                </div>
            </div>
        </div>
    );
}
