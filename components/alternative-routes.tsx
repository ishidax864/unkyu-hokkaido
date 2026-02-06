import { useState, useMemo } from 'react';
import { Route, PredictionResult } from '@/lib/types';
import { TAXI_AFFILIATES, RENTAL_CAR_AFFILIATES, BUS_AFFILIATES } from '@/lib/user-reports';
import { Station, estimateTaxiFare, getAlternativeRoutes, AlternativeRouteOption } from '@/lib/hokkaido-data';
import { HourlyRiskData, OperationStatus } from '@/lib/types';
import {
    Train,
    Bus,
    Car,
    Clock,
    ChevronRight,
    AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlternativeRoutesProps {
    originalRoute: Route;
    predictionResult?: PredictionResult;
    departureStation?: Station;
    arrivalStation?: Station;
    timeShiftSuggestion?: {
        time: string;
        risk: number;
        difference: number;
        isEarlier: boolean;
    } | null;
    futureRisks?: HourlyRiskData[];
    onSelect: (alternative: AlternativeSelection) => void;
}

interface AlternativeSelection {
    type: 'train' | 'subway' | 'bus' | 'taxi' | 'bicycle' | 'walk' | 'wait' | 'other';
    routeId?: string;
    provider?: string;
    id?: string;
    name?: string;
    time?: string;
    note?: string;
}

// 札幌圏の路線ID
const SAPPORO_AREA_IDS = ['jr-hokkaido.hakodate-main', 'jr-hokkaido.chitose', 'jr-hokkaido.gakuentoshi'];

const ALTERNATIVE_TRAINS = [
    { type: 'train' as const, routeId: 'jr-hokkaido.chitose', name: '千歳線（迂回）', time: '+15分', color: '#059669' },
    { type: 'train' as const, routeId: 'jr-hokkaido.hakodate-main', name: '函館本線（迂回）', time: '+20分', color: '#2563eb' },
];

const ALTERNATIVE_SUBWAY = [
    { type: 'subway' as const, id: 'sapporo-namboku', name: '地下鉄南北線', time: '+10分', color: '#22c55e' },
    { type: 'subway' as const, id: 'sapporo-tozai', name: '地下鉄東西線', time: '+12分', color: '#f97316' },
    { type: 'subway' as const, id: 'sapporo-toho', name: '地下鉄東豊線', time: '+15分', color: '#3b82f6' },
];

const ALTERNATIVE_BUSES = [
    { type: 'bus' as const, id: 'chuo-bus', name: '北海道中央バス', time: '+25分', color: '#ef4444' },
    { type: 'bus' as const, id: 'jotetsu-bus', name: 'じょうてつバス', time: '+30分', color: '#8b5cf6' },
];

export function AlternativeRoutes({ originalRoute, predictionResult, departureStation, arrivalStation, timeShiftSuggestion, futureRisks, onSelect }: AlternativeRoutesProps) {
    const [selectedAlt, setSelectedAlt] = useState<string | null>(null);

    // 特定の代替ルートを検索
    const specificAlternatives = useMemo(() => {
        if (!departureStation || !arrivalStation) return [];
        return getAlternativeRoutes(departureStation.id, arrivalStation.id);
    }, [departureStation, arrivalStation]);

    // 文脈に応じた代替手段のフィルタリング
    const { availableSubways, availableBuses, warningMessage } = useMemo(() => {
        // 特定ルートがある場合は、ジェネリックな提案は控えめにする（あるいは非表示）
        // ここでは混ぜないようにする
        if (specificAlternatives.length > 0) {
            const reasons = predictionResult?.reasons.join('') || '';
            const isHeavySnow = reasons.includes('猛烈な雪') || reasons.includes('積雪40cm');
            const isStorm = reasons.includes('暴風') || reasons.includes('風速30m/s');
            return {
                availableSubways: [],
                availableBuses: [], // ジェネリックなバスは表示しない
                warningMessage: isHeavySnow
                    ? '猛烈な雪のため、バスやタクシーも大幅な遅延・運休の可能性があります'
                    : isStorm
                        ? '暴風のため、徒歩移動は危険です'
                        : null
            };
        }

        const isSapporoArea = SAPPORO_AREA_IDS.includes(originalRoute.id);
        const reasons = predictionResult?.reasons.join('') || '';

        // 深刻な気象条件判定
        const isHeavySnow = reasons.includes('猛烈な雪') || reasons.includes('積雪40cm');
        const isStorm = reasons.includes('暴風') || reasons.includes('風速30m/s');
        const isDeer = reasons.includes('シカ');

        // バスの運行リスク
        const highBusRisk = isHeavySnow || isStorm; // 暴風雪時はバスも止まる可能性大

        return {
            availableSubways: isSapporoArea ? ALTERNATIVE_SUBWAY : [],
            availableBuses: isHeavySnow ? [] : ALTERNATIVE_BUSES, // 猛烈な雪ならバスも除外
            warningMessage: isHeavySnow
                ? '猛烈な雪のため、バスやタクシーも大幅な遅延・運休の可能性があります'
                : isStorm
                    ? '暴風のため、徒歩移動は危険です'
                    : null
        };
    }, [originalRoute.id, predictionResult, specificAlternatives.length]);

    // 戦略的なアドバイスの生成
    const advice = useMemo(() => {
        if (!predictionResult) return null;

        const { probability, status, estimatedRecoveryHours, reasons } = predictionResult;
        const reasonsText = reasons.join('');
        const isSuspended = status === '運休' || status === '運休中' || status === '運転見合わせ';

        // 🆕 未来のリスク評価 (今後3時間)
        const futureHighRisk = futureRisks && futureRisks
            .filter(r => !r.isTarget && r.time > (timeShiftSuggestion?.time || '00:00')) // 現在時刻以降
            .slice(0, 3) // 向こう3時間
            .some(r => r.risk >= 50);

        // 1. 運休中の場合
        if (isSuspended) {
            // もし復旧見込みが短くても、その後も高リスクが続くなら「待機」は危険
            if (futureHighRisk && estimatedRecoveryHours && estimatedRecoveryHours <= 2) {
                return {
                    type: 'critical',
                    title: '復旧しても再運休のリスク大',
                    message: `一時的に運転再開する可能性がありますが、その後も悪天候（高リスク）が続く予報です。再運休に巻き込まれる前に、地下鉄やバスでの移動を強く推奨します。`
                };
            }

            if (estimatedRecoveryHours && estimatedRecoveryHours >= 4) {
                return {
                    type: 'critical',
                    title: '長期戦の様相です',
                    message: `復旧まで${estimatedRecoveryHours}時間以上かかる見込みです。待たずに地下鉄やバスなど、動いている移動手段への切り替えを強く推奨します。`
                };
            } else if (estimatedRecoveryHours && estimatedRecoveryHours <= 2) {
                return {
                    type: 'warning',
                    title: '一時的な見合わせの可能性があります',
                    message: `復旧まで${estimatedRecoveryHours}時間以内の見込みです。カフェ等で待機するか、急ぎでなければ再開を待つのが得策かもしれません。`
                };
            } else {
                return {
                    type: 'alert',
                    title: '移動手段の変更を検討してください',
                    message: '運転再開の目処が立っていません。代替ルートの利用をおすすめします。'
                };
            }
        }

        // 2. 運行中だがリスクが高い場合 (50%以上)
        if (probability >= 70) {
            // 今後もずっと高リスクなら「移動延期」も視野に
            const persistentRisk = futureRisks && futureRisks.slice(0, 3).every(r => r.risk >= 70);

            const longSuspensionRisk = estimatedRecoveryHours && estimatedRecoveryHours >= 4;
            return {
                type: 'critical',
                title: '運休リスクが非常に高いです',
                message: (longSuspensionRisk || persistentRisk)
                    ? `まもなく運転見合わせになる可能性があります。悪天候が長時間続く予報のため、今のうちに移動手段を変更するか、移動自体の延期を検討してください。`
                    : 'まもなく運転見合わせになる可能性があります。今のうちに地下鉄などの代替手段で移動するか、移動自体の延期を検討してください。'
            };
        } else if (probability >= 50) {
            // 遅延・部分運休リスク
            const shortSuspensionLikely = estimatedRecoveryHours && estimatedRecoveryHours <= 2;
            return {
                type: 'warning',
                title: '遅延や急な運休に注意',
                message: shortSuspensionLikely
                    ? `天候が悪化しています。万が一運休しても短時間（${estimatedRecoveryHours}時間程度）で復旧する可能性がありますが、念のため早めの行動を推奨します。`
                    : '天候が悪化しています。「1本早い列車に乗る」など、早めの行動を心がけてください。余裕があれば地下鉄利用が確実です。'
            };
        } else if (probability >= 30) {
            return {
                type: 'info',
                title: '遅延の可能性があります',
                message: '多少の遅れが発生するかもしれません。時間に余裕を持って行動してください。'
            };
        }

        return null;
    }, [predictionResult, futureRisks]);

    // 渋滞リスクとタクシー料金の計算
    const { trafficDelayMultiplier, taxiFareEstimate, trafficWarning } = useMemo(() => {
        if (!predictionResult) return { trafficDelayMultiplier: 1, taxiFareEstimate: null, trafficWarning: null };

        // 1. 渋滞リスク計算
        const { reasons } = predictionResult;
        const reasonsText = reasons.join('');
        let multiplier = 1;

        if (reasonsText.includes('猛烈な雪') || reasonsText.includes('40cm')) {
            multiplier = 2.0; // 猛吹雪は倍かかる
        } else if (reasons.some(r => r.includes('雪') && !r.includes('小雪'))) {
            multiplier = 1.5; // 普通の雪でも1.5倍
        } else if (reasonsText.includes('路面凍結')) {
            multiplier = 1.3;
        }

        const trafficWarning = multiplier > 1.0 ? `雪道のため、バス・タクシーも通常より時間 (${multiplier}倍程度) がかかる恐れがあります` : null;

        // 2. タクシー料金見積もり
        let fare = null;
        if (departureStation && arrivalStation) {
            fare = estimateTaxiFare(departureStation.id, arrivalStation.id);
        }

        return { trafficDelayMultiplier: multiplier, taxiFareEstimate: fare, trafficWarning };
    }, [predictionResult, departureStation, arrivalStation]);

    // 時間表示フォーマッター (例: "+20分" -> "❄️約40分")
    const formatTime = (originalTimeStr: string, multiplier: number) => {
        if (multiplier <= 1.0) return originalTimeStr;

        // "+25分" のような文字列から数字を抽出
        const match = originalTimeStr.match(/(\d+)分/);
        if (!match) {
            // "約70-80分" のようなパターンにも対応
            const rangeMatch = originalTimeStr.match(/(\d+)-(\d+)分/);
            if (rangeMatch) {
                const min = parseInt(rangeMatch[1], 10);
                const max = parseInt(rangeMatch[2], 10);
                return `❄️雪渋滞予: 約${Math.round(min * multiplier)}-${Math.round(max * multiplier)}分`;
            }
            return originalTimeStr;
        }

        const minutes = parseInt(match[1], 10);
        const delayedMinutes = Math.round(minutes * multiplier);

        return `❄️雪渋滞予: 約${delayedMinutes}分`;
    };

    const handleSelect = (selection: AlternativeSelection, id: string) => {
        setSelectedAlt(id);
        onSelect(selection);
    };

    return (
        <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
                <Train className="w-4 h-4 text-[var(--primary)]" />
                <span className="text-sm font-bold">代替ルート・行動提案</span>
            </div>

            {/* 戦略的アドバイスの表示 */}
            {advice && (
                <div className={cn(
                    "mb-4 p-3 rounded-md border text-sm",
                    advice.type === 'critical' ? "bg-red-50 border-red-200 text-red-800" :
                        advice.type === 'warning' ? "bg-orange-50 border-orange-200 text-orange-800" :
                            "bg-blue-50 border-blue-200 text-blue-800"
                )}>
                    <div className="font-bold mb-1 flex items-center gap-2">
                        {advice.type === 'critical' ? <AlertTriangle className="w-4 h-4" /> :
                            advice.type === 'warning' ? <Clock className="w-4 h-4" /> :
                                <Train className="w-4 h-4" />}
                        {advice.title}
                    </div>
                    <div className="text-xs md:text-sm opacity-90 leading-relaxed">
                        {advice.message}
                    </div>
                </div>
            )}

            {/* 時間シフト提案（スマートサジェスト） */}
            {timeShiftSuggestion && (
                <div className="mb-4 cursor-pointer hover:bg-green-100 transition-colors p-3 bg-green-50 border border-green-200 rounded-md text-green-900 shadow-sm"
                    onClick={() => onSelect({ type: 'other', id: 'time-shift', name: '時間をずらす', time: timeShiftSuggestion.time, note: 'リスク低減' })}>
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                        <Clock className="w-4 h-4 text-green-700" />
                        <span>{timeShiftSuggestion.isEarlier ? '一本早い列車に乗る' : '時間を遅らせる'}</span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-green-300">
                            {timeShiftSuggestion.time}発
                        </span>
                    </div>
                    <div className="text-xs flex items-center gap-1.5 opacity-90">
                        <span className="font-semibold">運休リスク {timeShiftSuggestion.risk}%</span>
                        <span className="text-green-700">
                            (通常より{Math.abs(timeShiftSuggestion.difference)}%低い)
                        </span>
                    </div>
                </div>
            )}

            {warningMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    {warningMessage}
                </div>
            )}

            {/* 雪渋滞警告 */}
            {trafficWarning && !warningMessage && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800 flex items-start gap-2">
                    <Car className="w-4 h-4 shrink-0 mt-0.5" />
                    {trafficWarning}
                </div>
            )}

            <div className="space-y-3">
                {/* 1. 特定の推奨ルート（マッチする場合） */}
                {specificAlternatives.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border)]">
                        <div className="section-label flex items-center gap-1 mb-2">
                            <Train className="w-3 h-3 text-green-600" />
                            <span className="text-green-700">推奨代替ルート</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {specificAlternatives.map((alt, idx) => (
                                <a
                                    key={idx}
                                    href={alt.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleSelect({ type: alt.type as any, name: alt.name }, `specific-${idx}`)}
                                    className={cn(
                                        'flex flex-col gap-1 p-3 rounded-md border text-left transition-colors',
                                        'bg-[#fafaf9] border-[var(--border)] hover:bg-[#f5f5f4]'
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-[var(--foreground)]">{alt.name}</span>
                                        <span className={cn("text-xs font-bold", trafficDelayMultiplier > 1 ? "text-red-500" : "text-[var(--muted)]")}>
                                            {formatTime(alt.time, trafficDelayMultiplier)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-[var(--muted)] leading-relaxed">
                                        {alt.details}
                                    </div>
                                    {alt.note && (
                                        <div className="mt-1 text-[10px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded inline-block self-start">
                                            {alt.note}
                                        </div>
                                    )}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. ジェネリックな代替路線（特定ルートがない場合のみ表示） */}
                {/* JR北海道の代替路線（運休時は表示しない方が親切だが、部分運休もあるため残す） */}
                {/* ※札幌圏以外では「該当なし」にすべきロジックは今回省略 */}

                {/* 札幌市営地下鉄（エリア限定） */}
                {availableSubways.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border)]">
                        <div className="section-label flex items-center gap-1">
                            <Train className="w-3 h-3" />
                            札幌市営地下鉄
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {availableSubways.map((subway) => (
                                <button
                                    key={subway.id}
                                    onClick={() => handleSelect({ type: 'subway', routeId: subway.id }, subway.id)}
                                    className={cn(
                                        'flex items-center gap-3 p-2.5 rounded-md border transition-colors text-left',
                                        selectedAlt === subway.id
                                            ? 'bg-[#e8f5ed] border-[var(--primary)]'
                                            : 'bg-white border-[var(--border)] hover:bg-[var(--background-secondary)]'
                                    )}
                                >
                                    <div
                                        className="w-1 h-6 rounded-full"
                                        style={{ backgroundColor: subway.color }}
                                    />
                                    <span className="font-medium text-sm flex-1">{subway.name}</span>
                                    {/* 地下鉄は地下なので雪の影響を受けにくいが、駅までのアクセスは考慮必要かも。ここでは遅延なしとする */}
                                    <span className="text-xs text-[var(--muted)]">{subway.time}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* バス */}
                {availableBuses.length > 0 ? (
                    <div className="pt-2 border-t border-[var(--border)]">
                        <div className="section-label flex items-center gap-1">
                            <Bus className="w-3 h-3" />
                            路線バス（エリア情報）
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            {availableBuses.map((bus) => (
                                <button
                                    key={bus.id}
                                    onClick={() => handleSelect({ type: 'bus', provider: bus.id }, bus.id)}
                                    className={cn(
                                        'flex items-center gap-2 p-2.5 rounded-md border transition-colors',
                                        selectedAlt === bus.id
                                            ? 'bg-[#e8f5ed] border-[var(--primary)]'
                                            : 'bg-white border-[var(--border)] hover:bg-[var(--background-secondary)]'
                                    )}
                                >
                                    <Bus className="w-4 h-4 text-[var(--muted)]" />
                                    <div className="text-left">
                                        <span className="font-medium text-xs">{bus.name}</span>
                                        <div className={cn("text-xs", trafficDelayMultiplier > 1 ? "text-red-500 font-bold" : "text-[var(--muted)]")}>
                                            {formatTime(bus.time, trafficDelayMultiplier)}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {/* バス予約（アフィリエイト） */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {BUS_AFFILIATES.filter(b => b.enabled).map((bus) => (
                                <a
                                    key={bus.id}
                                    href={bus.webUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleSelect({ type: 'bus', provider: bus.id }, `bus-${bus.id}`)}
                                    className="relative flex items-center justify-center gap-2 p-2.5 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                                >
                                    <span className="absolute top-0.5 right-1 text-[9px] text-gray-400">PR</span>
                                    <Bus className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-blue-700 text-sm">{bus.name}で予約</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* バスがない場合（特定ルートもなく、ジェネリックもない場合のみメッセージ） */
                    (availableBuses.length === 0 && specificAlternatives.length === 0) && (
                        <div className="pt-2 border-t border-[var(--border)] text-xs text-[var(--muted)] italic">
                            ※悪天候のためバス等の運行も乱れている可能性があります
                        </div>
                    )
                )}

                {/* タクシー */}
                <div className="pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="section-label flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            タクシー・シェア
                        </div>
                        {taxiFareEstimate && (
                            <span className="text-xs font-bold text-[var(--muted)]">
                                概算: ¥{taxiFareEstimate.toLocaleString()}〜
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TAXI_AFFILIATES.filter(t => t.enabled).map((taxi) => (
                            <a
                                key={taxi.id}
                                href={taxi.affiliateTag === 'a8' ? taxi.webUrl : `${taxi.webUrl}?ref=${taxi.affiliateTag}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleSelect({ type: 'taxi', provider: taxi.id }, `taxi-${taxi.id}`)}
                                className="relative flex items-center justify-center gap-2 p-3 rounded-md border border-[var(--status-warning)] bg-[#fff8e6] hover:bg-[#fff3d6] transition-colors"
                            >
                                <span className="absolute top-0.5 right-1 text-[9px] text-gray-400">PR</span>
                                <Car className="w-4 h-4 text-[#b8860b]" />
                                <span className="font-medium text-[#b8860b] text-sm">{taxi.name}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* レンタカー */}
                <div className="pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="section-label flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            レンタカー
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {RENTAL_CAR_AFFILIATES.filter(r => r.enabled).map((rental) => (
                            <a
                                key={rental.id}
                                href={rental.webUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleSelect({ type: 'other', provider: rental.id }, `rental-${rental.id}`)}
                                className="relative flex items-center justify-center gap-2 p-3 rounded-md border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
                            >
                                <span className="absolute top-0.5 right-1 text-[9px] text-gray-400">PR</span>
                                <Car className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-green-700 text-sm">{rental.name}を探す</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* その他の選択肢 */}
                <div className="pt-2 border-t border-[var(--border)]">
                    <button
                        onClick={() => handleSelect({ type: 'wait' }, 'wait')}
                        className={cn(
                            'w-full flex items-center justify-center gap-2 p-3 rounded-md border transition-colors',
                            selectedAlt === 'wait'
                                ? 'bg-[#e8f5ed] border-[var(--primary)]'
                                : 'bg-white border-[var(--border)] hover:bg-[var(--background-secondary)]'
                        )}
                    >
                        <Clock className="w-5 h-5 text-[var(--muted)]" />
                        <span className="text-sm font-medium">
                            {predictionResult?.estimatedRecoveryTime ? `${predictionResult.estimatedRecoveryTime}頃まで待つ` : '復旧待ち'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
