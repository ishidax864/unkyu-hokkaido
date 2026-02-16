import { useState, useMemo } from 'react';
import { Route, PredictionResult } from '@/lib/types';
// import { TAXI_AFFILIATES, RENTAL_CAR_AFFILIATES, BUS_AFFILIATES, CAFE_AFFILIATES } from '@/lib/user-reports';
import { Station, estimateTaxiFare, getAlternativeRoutes, AlternativeRouteOption } from '@/lib/hokkaido-data';
import { HourlyRiskData, OperationStatus } from '@/lib/types';
import { generateStrategicAdvice, calculateTrafficRisk, checkAlternativeAvailability } from '@/lib/suggestion-logic';
import {
    Train,
    Bus,
    Car,
    Clock,
    ChevronRight,
    AlertTriangle,
    Coffee,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReturnTripAdvisor } from './return-trip-advisor';
import { TimeShiftSuggestion } from './time-shift-suggestion';
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

export function AlternativeRoutes({ originalRoute, predictionResult, departureStation, arrivalStation, timeShiftSuggestion, futureRisks, onSelect }: AlternativeRoutesProps) {
    const [selectedAlt, setSelectedAlt] = useState<string | null>(null);

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
    const { taxiFareEstimate, trafficWarning } = useMemo(() => {
        if (!predictionResult) return { taxiFareEstimate: null, trafficWarning: null };

        // 1. 渋滞リスク計算 (外部関数)
        const { warning } = calculateTrafficRisk(predictionResult);

        // 2. タクシー料金見積もり
        let fare = null;
        if (departureStation && arrivalStation) {
            fare = estimateTaxiFare(departureStation.id, arrivalStation.id);
        }

        return { taxiFareEstimate: fare, trafficWarning: warning };
    }, [predictionResult, departureStation, arrivalStation]);

    // 時間表示フォーマッター (例: "+20分" -> "❄️約40分")

    // 時間表示フォーマッター (例: "+20分" -> "❄️約40分")


    const handleSelect = (selection: AlternativeSelection, id: string) => {
        setSelectedAlt(id);
        onSelect(selection);
    };

    return (
        <section className="card p-4" aria-labelledby="alternative-routes-title">
            <div className="flex items-center gap-2 mb-4">
                <Train className="w-4 h-4 text-[var(--primary)]" />
                <h3 id="alternative-routes-title" className="text-sm font-bold">代替ルート・行動提案</h3>
            </div>

            {/* 戦略的アドバイスの表示 - 統合カードの上に移動 */}
            {advice && (
                <div className={cn(
                    "mb-4 p-4 card-elevated border-l-4 text-sm flex items-start gap-3",
                    advice.type === 'critical' ? "border-l-[var(--status-suspended)]" :
                        advice.type === 'warning' ? "border-l-[var(--status-warning)]" :
                            "border-l-[var(--primary)]"
                )}>
                    <div className={cn(
                        "mt-1 p-2 rounded-full",
                        advice.type === 'critical' ? "bg-red-50 text-[var(--status-suspended)]" :
                            advice.type === 'warning' ? "bg-orange-50 text-[var(--status-warning)]" :
                                "bg-green-50 text-[var(--primary)]"
                    )}>
                        {advice.type === 'critical' ? <AlertTriangle className="w-4 h-4" /> :
                            advice.type === 'warning' ? <Clock className="w-4 h-4" /> :
                                <Train className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                        <div className={cn(
                            "font-bold mb-1",
                            advice.type === 'critical' ? "text-red-950" :
                                advice.type === 'warning' ? "text-orange-950" :
                                    "text-green-950"
                        )}>
                            {advice.title}
                        </div>
                        <div className="text-xs md:text-sm text-gray-700 leading-relaxed">
                            {advice.message}
                        </div>

                        {/* 🆕 アクションボタン */}
                        {(advice as any).actionLink && (
                            <a
                                href={(advice as any).actionLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] bg-green-50/50 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
                            >
                                {(advice as any).actionLabel || '詳細を見る'} <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* 統合代替手段カード */}
            {predictionResult && (
                <div className="mb-6 space-y-4">
                    <ReturnTripAdvisor prediction={predictionResult} />

                    <UnifiedAlternativesCard
                        departureStation={departureStation || null}
                        arrivalStation={arrivalStation || null}
                        jrRisk={predictionResult.probability}
                        estimatedRecoveryHours={predictionResult.estimatedRecoveryHours}
                        windSpeed={predictionResult.comparisonData?.wind}
                        snowfall={predictionResult.comparisonData?.snow}
                        timeShiftSuggestion={timeShiftSuggestion}
                    />
                </div>
            )}


            {/* ※時間シフト提案はUnifiedAlternativesCard内に統合済み */}

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
                {/* ※重複していた推奨ルート・地下鉄・バスは UnifiedAlternativesCard に統合済み */}

                {/* 移動手段の予約・手配はUnifiedAlternativesCard内に統合済み */}
            </div>
        </section>
    );
}
