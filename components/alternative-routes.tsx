import { useMemo } from 'react';
import { Route, PredictionResult } from '@/lib/types';
import { Station, getAlternativeRoutes } from '@/lib/hokkaido-data';
import { HourlyRiskData } from '@/lib/types';
import { generateStrategicAdvice, calculateTrafficRisk, checkAlternativeAvailability } from '@/lib/suggestion-logic';
import {
    Train,
    Car,
    Clock,
    AlertTriangle,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReturnTripAdvisor } from './return-trip-advisor';
import { UnifiedAlternativesCard } from './unified-alternatives';

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

export function AlternativeRoutes({ originalRoute, predictionResult, departureStation, arrivalStation, timeShiftSuggestion, futureRisks, onSelect: _onSelect }: AlternativeRoutesProps) {

    // 特定の代替ルートを検索
    const specificAlternatives = useMemo(() => {
        if (!departureStation || !arrivalStation) return [];
        return getAlternativeRoutes(departureStation.id, arrivalStation.id);
    }, [departureStation, arrivalStation]);

    // 文脈に応じた代替手段のフィルタリング
    const { warningMessage } = useMemo(() => {
        // ロジックを外部関数に委譲
        return checkAlternativeAvailability(
            originalRoute.id,
            predictionResult,
            specificAlternatives.length > 0,
            SAPPORO_AREA_IDS.includes(originalRoute.id)
        );
    }, [originalRoute.id, predictionResult, specificAlternatives.length]);

    // 戦略的なアドバイスの生成
    const advice = useMemo(() => {
        if (!predictionResult) return null;
        // ロジックを外部関数に委譲
        return generateStrategicAdvice(
            predictionResult,
            futureRisks,
            timeShiftSuggestion?.time
        );
    }, [predictionResult, futureRisks, timeShiftSuggestion]);

    // 渋滞リスクとタクシー料金の計算
    const { trafficWarning } = useMemo(() => {
        if (!predictionResult) return { trafficWarning: null };

        // 1. 渋滞リスク計算 (外部関数)
        const { warning } = calculateTrafficRisk(predictionResult);

        return { trafficWarning: warning };
    }, [predictionResult]);

    // 時間表示フォーマッター (例: "+20分" -> "❄️約40分")

    // 時間表示フォーマッター (例: "+20分" -> "❄️約40分")



    return (
        <section aria-labelledby="alternative-routes-title">
            <div className="flex items-center gap-2 mb-4 px-1">
                <Train className="w-5 h-5 text-[var(--primary)]" />
                <h3 id="alternative-routes-title" className="text-lg font-bold text-gray-700">代替ルート・行動提案</h3>
            </div>

            <div className="space-y-4">
                {/* 戦略的アドバイスの表示 */}
                {advice && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                            <div className={cn(
                                "p-1.5 rounded-md",
                                advice.type === 'critical' ? "bg-red-100 text-red-600" :
                                    advice.type === 'warning' ? "bg-orange-100 text-orange-600" :
                                        "bg-green-100 text-green-600"
                            )}>
                                {advice.type === 'critical' ? <AlertTriangle className="w-4 h-4" /> :
                                    advice.type === 'warning' ? <Clock className="w-4 h-4" /> :
                                        <Train className="w-4 h-4" />}
                            </div>
                            <span className="text-sm font-bold text-gray-700">AIアドバイザー</span>
                        </div>

                        <div className="p-4">
                            <h4 className={cn(
                                "font-bold text-base mb-2",
                                advice.type === 'critical' ? "text-red-800" :
                                    advice.type === 'warning' ? "text-orange-800" :
                                        "text-green-800"
                            )}>
                                {advice.title}
                            </h4>
                            <div className="text-sm text-gray-700 leading-relaxed">
                                {advice.message}
                            </div>

                            {/* アクションボタン */}
                            {advice.actionLink && (
                                <a
                                    href={advice.actionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-white bg-[var(--primary)] hover:bg-blue-700 px-4 py-3 rounded-lg transition-colors shadow-sm"
                                >
                                    {advice.actionLabel || '詳細を見る'} <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* 帰宅サバイバル判定 */}
                {predictionResult && (
                    <ReturnTripAdvisor prediction={predictionResult} />
                )}

                {/* 統合代替手段カード（時間シフト・タクシー等） */}
                {predictionResult && (
                    <UnifiedAlternativesCard
                        departureStation={departureStation || null}
                        arrivalStation={arrivalStation || null}
                        jrRisk={predictionResult.probability}
                        estimatedRecoveryHours={predictionResult.estimatedRecoveryHours}
                        windSpeed={predictionResult.comparisonData?.wind}
                        snowfall={predictionResult.comparisonData?.snow}
                        timeShiftSuggestion={timeShiftSuggestion}
                    />
                )}

                {/* 暴風警告 */}
                {warningMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        {warningMessage}
                    </div>
                )}

                {/* 雪渋滞警告 */}
                {trafficWarning && !warningMessage && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800 flex items-start gap-2">
                        <Car className="w-4 h-4 shrink-0 mt-0.5" />
                        {trafficWarning}
                    </div>
                )}
            </div>
        </section>
    );
}
