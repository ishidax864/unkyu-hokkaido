import { PredictionResult, Route } from '@/lib/types';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, Info, Clock, AlertOctagon, ExternalLink, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJRStatusUrl } from '@/lib/hokkaido-data';
import { formatStatusText, splitStatusText } from '@/lib/text-parser'; // 🆕

interface PredictionResultCardProps {
    result: PredictionResult;
    route: Route;
    targetDate: string; // YYYY-MM-DD format
    targetTime: string; // HH:MM format 🆕
}

export function PredictionResultCard({ result, route }: Omit<PredictionResultCardProps, 'targetTime' | 'targetDate'>) {
    const isRecoveryMode = result.mode === 'recovery' || result.isCurrentlySuspended;

    // 当日かどうかを判定
    // const now = new Date();
    // const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // const isToday = targetDate === today;

    // ユーザー要望: 現在時刻検索で公式情報がある場合は、％表示を隠す -> 要望変更: 予測結果も併せて表示したい
    const shouldHideRiskMeter = false; //isCurrentTimeSearch && !!result.officialStatus;

    // Split text into summary and details - 🆕
    const { summary: textSummary, details: textDetails } = splitStatusText(result.officialStatus?.rawText || '');

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
                {/* 📡 現在の運行状況（JR公式） - データがある場合のみ表示 (復旧モードでも表示) */}
                {result.officialStatus && (
                    <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <span>📡</span> 現在の運行状況（JR公式）
                            <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">実データ</span>
                        </div>

                        {/* ステータス表示 */}
                        {/* ステータス表示 - Determine color/icon from text keywords if status is 'normal'/ambiguous but text implies otherwise */}
                        {(() => {
                            const status = result.officialStatus.status;
                            const text = textSummary || '';

                            // Determine override status
                            let displayStatus: 'suspended' | 'delay' | 'normal' | 'unknown' = 'unknown';

                            if (status === 'suspended' || status === 'cancelled') {
                                displayStatus = 'suspended';
                            } else if (text.includes('運休') || text.includes('見合わせ')) {
                                displayStatus = 'suspended';
                            } else if (status === 'delay' || text.includes('遅れ') || text.includes('遅延') || text.includes('減便') || text.includes('本数を減ら')) {
                                displayStatus = 'delay';
                            } else if (status === 'normal') {
                                displayStatus = 'normal';
                            }

                            return (
                                <div className="font-black text-xl flex items-center gap-2">
                                    {displayStatus === 'suspended' ? (
                                        <span className="text-red-600">🔴 運休・見合わせ</span>
                                    ) : displayStatus === 'delay' ? (
                                        <span className="text-yellow-600">🟡 遅延・減便</span>
                                    ) : displayStatus === 'normal' ? (
                                        <span className="text-green-600">🟢 {result.officialStatus.statusText || '現在、遅れに関する情報はありません'}</span>
                                    ) : (
                                        <span className="text-gray-600">⚪ 情報なし</span>
                                    )}
                                </div>
                            );
                        })()}

                        {/* 原文テキスト（Summaryのみ） - 🆕 Detailsは下部へ */}
                        {textSummary && result.officialStatus.status !== 'normal' && (
                            <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap leading-relaxed">
                                {formatStatusText(textSummary)}
                            </div>
                        )}

                        <div className="text-[10px] text-gray-400 text-right mt-1">
                            更新: {new Date(result.officialStatus.updatedAt || '').toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                )}

                {/* 運休中バナー */}
                <div className="bg-[var(--status-suspended)] text-white px-4 py-3 -mx-4 -mt-4 mb-4 rounded-t-xl flex items-center gap-3">
                    <AlertTriangle className="w-7 h-7" />
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
                        <div className="flex items-center gap-2 mb-1">
                            <div className="text-3xl font-black text-[var(--status-suspended)]">
                                {result.estimatedRecoveryTime || '復旧時刻未定'}
                            </div>
                            {result.suspensionScale && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-xs font-bold",
                                    result.suspensionScale === 'all-day' ? "bg-red-100 text-red-700 border border-red-200" :
                                        result.suspensionScale === 'large' ? "bg-orange-100 text-orange-700 border border-orange-200" :
                                            result.suspensionScale === 'medium' ? "bg-yellow-100 text-yellow-700 border border-yellow-200" :
                                                "bg-blue-100 text-blue-700 border border-blue-200"
                                )}>
                                    {result.suspensionScale === 'all-day' ? '終日運休' :
                                        result.suspensionScale === 'large' ? '大規模運休' :
                                            result.suspensionScale === 'medium' ? '半日規模' :
                                                '一時的'}
                                </span>
                            )}
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
                <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                        <Info className="w-4 h-4" />
                        状況
                    </div>

                    {/* 🆕 物理的エビデンス表示 */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">【公式発表】運休・運転見合わせが発生しています</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">【運休中】気象条件のため運転を見合わせています</span>
                        </div>
                        <div className="flex items-center justify-between text-xs border-t border-blue-100 pt-1.5 mt-1.5 font-bold text-blue-800">
                            <span>【復旧予測】{result.recoveryRecommendation || '安全確認・点検（1時間）'}</span>
                        </div>
                        {/* 🆕 ウェザーエビデンス */}
                        <div className="text-[10px] text-gray-400 mt-1">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            現在の観測値: 風速 {(result as any).comparisonData?.wind.toFixed(1)}m/s / 降雪 {(result as any).comparisonData?.snow.toFixed(1)}cm/h
                        </div>
                    </div>

                    {/* 🆕 公式詳細情報 (Details) */}
                    {textDetails && (
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1.5 mt-2">
                            <div className="text-xs font-bold text-gray-500 mb-1">【詳細情報】</div>
                            <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {formatStatusText(textDetails)}
                            </div>
                        </div>
                    )}
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
                    {/* ステータス表示 - Determine color/icon from text keywords if status is 'normal'/ambiguous but text implies otherwise */}
                    {(() => {
                        const status = result.officialStatus.status;
                        const text = result.officialStatus.rawText || '';

                        // Determine override status
                        let displayStatus: 'suspended' | 'delay' | 'normal' | 'unknown' = 'unknown';

                        if (status === 'suspended' || status === 'cancelled') {
                            displayStatus = 'suspended';
                        } else if (text.includes('運休') || text.includes('見合わせ')) {
                            displayStatus = 'suspended';
                        } else if (status === 'delay' || text.includes('遅れ') || text.includes('遅延') || text.includes('減便') || text.includes('本数を減ら')) {
                            displayStatus = 'delay';
                        } else if (status === 'normal') {
                            displayStatus = 'normal';
                        }

                        return (
                            <div className="font-black text-xl flex items-center gap-2">
                                {displayStatus === 'suspended' ? (
                                    <span className="text-red-600">🔴 運休・見合わせ</span>
                                ) : displayStatus === 'delay' ? (
                                    <span className="text-yellow-600">🟡 遅延・減便</span>
                                ) : displayStatus === 'normal' ? (
                                    <span className="text-green-600">🟢 {(result.officialStatus.statusText || '').replace(/。/g, '') || '現在、遅れに関する情報はありません'}</span>
                                ) : (
                                    <span className="text-gray-600">⚪ 情報なし</span>
                                )}
                            </div>
                        );
                    })()}

                    {/* 原文テキスト（Summaryのみ） - 🆕 Detailsは詳細セクションへ */}
                    {textSummary && result.officialStatus.status !== 'normal' && (
                        <div className="mt-2 bg-white p-2 rounded border border-gray-100">
                            {formatStatusText(textSummary)}
                        </div>
                    )}

                    {/* 🆕 AI復旧予測（公式に再開時刻がない場合のみ） */}
                    {(result.officialStatus.status === 'suspended' || result.officialStatus.status === 'cancelled') &&
                        !result.officialStatus.resumptionTime &&
                        result.estimatedRecoveryTime && (
                            <div className="mt-3 bg-indigo-50 border border-indigo-100 p-2 rounded flex items-start gap-2">
                                <div className="mt-0.5 text-indigo-500">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                        AI復旧予測
                                        <span className="text-[9px] bg-white border border-indigo-200 px-1 rounded text-indigo-400 font-normal">参考値</span>
                                    </div>
                                    <div className="text-sm text-indigo-900 font-medium mt-0.5">
                                        {result.estimatedRecoveryTime}
                                        <span className="text-xs font-normal ml-1">に運転再開の見込み</span>
                                    </div>
                                    <div className="text-[10px] text-indigo-600 mt-1 leading-tight">
                                        ※公式発表がないため、気象データから算出した予測値です。
                                    </div>
                                </div>
                            </div>
                        )}

                    <div className="text-[10px] text-gray-400 text-right mt-1">
                        更新: {result.officialStatus.updatedAt ? new Date(result.officialStatus.updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </div>
                </div>
            )}

            {/* 📊 予測セクション (ユーザーの出発時刻に基づく) */}
            {/* 現在時刻検索で公式情報がある場合は、％表示をスキップする */}
            {!shouldHideRiskMeter && (
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <span>📊</span> あなたの出発時刻の予測
                </div>
            )}


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

            {/* 確率表示 (Hero Metric) - shouldHideRiskMeterがtrueなら隠す */}
            {!shouldHideRiskMeter && (
                <div className="mb-6 text-center">
                    <div className="text-xs font-bold text-[var(--muted)] mb-1">運休リスク予測</div>
                    <div className="relative inline-flex items-center justify-center mb-1">
                        <div className={`text-6xl font-black ${getProbabilityTextColor()} tracking-tighter`}>
                            {result.probability}
                            <span className="text-2xl ml-0.5 opacity-60">%</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${getProgressColor()} text-white`}>
                            {result.status}・{result.probability >= 50 ? '注意' : '可能性低'}
                        </div>
                        <div className={`py-1.5 px-4 rounded-full font-bold text-sm ${result.probability >= 70 ? 'bg-red-100 text-red-700 border border-red-200' :
                            result.probability >= 40 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                result.probability >= 20 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                    'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                            {
                                result.probability >= 70 ? '運休の可能性が高い' :
                                    result.probability >= 40 ? '遅延・運休に注意' :
                                        result.probability >= 20 ? '多少の影響あり' :
                                            '運行への影響は少ない見込み'
                            }
                        </div>
                    </div>
                </div>
            )}

            {shouldHideRiskMeter && (
                <div className="mb-6 text-center">
                    <div className="text-xs font-medium text-[var(--muted)] bg-gray-50 rounded px-3 py-2 inline-block">
                        現在時刻のため、上記公式情報を優先表示しています。<br />
                        <span className="text-[10px] opacity-70">天候による今後のリスク推移は下図を参照ください</span>
                    </div>
                </div>
            )}

            {/* 詳細情報 */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                    <Info className="w-4 h-4" />
                    状況・要因
                </div>

                {/* 🆕 公式詳細情報 (Details) - ここに挿入 */}
                {textDetails && (
                    <div className="mb-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <div className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <span>ℹ️</span> 運行情報の詳細
                        </div>
                        <div className="text-xs text-gray-600 leading-relaxed">
                            {formatStatusText(textDetails)}
                        </div>
                    </div>
                )}
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
