'use client';

import { useMemo } from 'react';
import { Bus, Car, Train, Coffee, Hotel, ExternalLink, Clock } from 'lucide-react';
import { Station, getAlternativeRoutes, estimateTaxiFare } from '@/lib/hokkaido-data';
import { getStationFacilities } from '@/lib/alternative-options';
import { cn } from '@/lib/ui-utils';
import { sendGAEvent } from '@next/third-parties/google';
import { getAffiliatesByType } from '@/lib/affiliates';
import { RibbonBadge, Badge, CompactBadge } from '@/components/ui/badge';
import { ResponsiveGrid } from '@/components/ui/responsive-grid';

interface TimeShiftData {
    time: string;
    risk: number;
    difference: number;
    isEarlier: boolean;
}

interface UnifiedAlternativesProps {
    departureStation: Station | null;
    arrivalStation: Station | null;
    jrRisk: number;
    estimatedRecoveryHours?: number | string;
    windSpeed?: number;
    snowfall?: number;
    timeShiftSuggestion?: TimeShiftData | null;
}

/**
 * 統合された代替手段カード
 * - 時間変更提案（早い列車に変更）
 * - 推奨ルート（バス路線、アフィリエイト含む）
 * - 駅周辺の施設（タクシー、レンタカー等 + PRリンク）
 * - 長期化時の滞在施設
 */
export function UnifiedAlternativesCard({
    departureStation,
    arrivalStation,
    jrRisk,
    estimatedRecoveryHours,
    windSpeed = 0,
    snowfall = 0,
    timeShiftSuggestion
}: UnifiedAlternativesProps) {

    // 特定区間の推奨ルート（バス路線など）
    const recommendedRoutes = useMemo(() => {
        if (!departureStation || !arrivalStation) return [];
        return getAlternativeRoutes(departureStation.id, arrivalStation.id);
    }, [departureStation, arrivalStation]);

    // 駅の施設情報
    const facilities = useMemo(() => {
        if (!departureStation) return null;
        return getStationFacilities(departureStation.id);
    }, [departureStation]);

    // タクシー情報
    const taxiInfo = useMemo(() => {
        if (!departureStation || !arrivalStation) return null;
        const result = estimateTaxiFare(departureStation, arrivalStation);
        if (!result) return null;

        // User feedback: Taxi is too expensive for long distances (e.g. Asahikawa -> Sapporo)
        // Mark as "high cost" if fare exceeds ~25,000 JPY
        const isHighCost = result.estimatedFare > 25000;
        return {
            estimatedFare: result.estimatedFare,
            distance: result.distance,
            duration: result.duration,
            isHighCost
        };
    }, [departureStation, arrivalStation]);

    // 到着駅の施設情報 (地下鉄判定用)
    const arrivalFacilities = useMemo(() => {
        if (!arrivalStation) return null;
        return getStationFacilities(arrivalStation.id);
    }, [arrivalStation]);

    // 地下鉄を推奨すべきか？ (出発・到着ともに地下鉄エリア、かつSpecific推奨に含まれていない)
    const showGenericSubway = useMemo(() => {
        if (!facilities?.hasSubway || !facilities.subwayLines) return false;

        // 推奨ルートに既にSubwayが含まれているなら重複表示しない
        const hasSpecificSubway = recommendedRoutes.some(r => r.type === 'subway');
        if (hasSpecificSubway) return false;

        // 到着駅も地下鉄エリアか？ (例: 札幌 -> 琴似)
        if (arrivalFacilities?.hasSubway) return true;

        // 特例: 札幌駅発で、到着地が特定の近距離エリアなら表示する？ 
        // いったん「到着地も地下鉄あり」に限定することで「地下鉄がないエリアで出る」を防ぐ
        return false;
    }, [facilities, arrivalFacilities, recommendedRoutes]);

    // バスの運行リスク計算
    const busRisk = useMemo(() => {
        if (windSpeed >= 25 || snowfall >= 5.0) return 'high';
        if (windSpeed >= 20 || snowfall >= 3.0) return 'medium';
        return 'low';
    }, [windSpeed, snowfall]);

    // リスクが低い場合は表示しない
    if (jrRisk < 30 || !departureStation) {
        return null;
    }

    const numericHours = typeof estimatedRecoveryHours === 'number' ? estimatedRecoveryHours : 0;
    const isSevere = numericHours >= 2 || estimatedRecoveryHours === '終日運休' || estimatedRecoveryHours === '目処立たず';
    const isModerate = numericHours >= 0.5 && numericHours < 2;

    // 表示するセクションの制御
    const showLongStayOptions = isSevere; // ホテル
    const showShortStayOptions = isModerate; // カフェ
    const showHeavyTransport = isSevere; // 高速バス・レンタカー

    const taxiAffiliates = getAffiliatesByType('taxi').slice(0, 2); // Show up to 2 (Didi and GO)
    // const busAffiliate = getAffiliatesByType('bus')[0]; // Unused
    // const rentalAffiliate = getAffiliatesByType('rental')[0]; // Unused

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* 0. Primary Recommendation (The "Best" Option) */}
            {/* Logic: TimeShift > Subway > Standard Routes */}
            {(timeShiftSuggestion?.difference ?? 0) >= 15 ? (
                <div className="bg-white border border-emerald-100 rounded-lg p-4 sm:p-5 shadow-sm ring-1 ring-emerald-500/20 relative overflow-hidden">
                    <RibbonBadge variant="success">おすすめ</RibbonBadge>
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
                            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-emerald-800 text-sm sm:text-base mb-1">
                                {timeShiftSuggestion?.time} 発の列車に変更
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">
                                運休リスク: <span className="font-bold text-emerald-600">{timeShiftSuggestion?.risk}%</span>（通常より{timeShiftSuggestion?.difference}% 低い）
                            </p>
                            <p className="text-xs text-gray-500">リスクが低い時間帯への変更が確実です。</p>
                        </div>
                    </div>
                </div>
            ) : showGenericSubway && facilities?.hasSubway && facilities?.subwayLines ? (
                <div className="bg-white border border-emerald-100 rounded-lg p-4 sm:p-5 shadow-sm ring-1 ring-emerald-500/20 relative overflow-hidden">
                    <RibbonBadge variant="success">おすすめ</RibbonBadge>
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
                            <Train className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-emerald-800 text-sm sm:text-base mb-1">
                                地下鉄ルート（{facilities.subwayLines.join('・')}）
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">
                                天候の影響を受けず、定時運行中。
                            </p>
                            <p className="text-xs text-gray-500">市内移動の最も確実な手段です。</p>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* 1. Other Options List (Table Style) */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                    その他の選択肢
                </div>
                <div className="divide-y divide-gray-100">
                    {/* Bus & Car Routes */}
                    {recommendedRoutes
                        .filter(route => showHeavyTransport || route.type === 'subway')
                        // Exclude subway if it was shown as Primary Recommendation
                        .filter(route => !(showGenericSubway && route.type === 'subway' && (!timeShiftSuggestion || timeShiftSuggestion.difference < 15)))
                        .map((route, idx) => (
                            <a
                                key={idx}
                                href={route.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => sendGAEvent('event', 'alternative_click', { type: route.type, name: route.name, route_scope: 'specific' })}
                                className="flex items-center justify-between p-4 min-h-[56px] hover:bg-gray-50 active:bg-gray-100 transition-colors group"
                            >
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className="text-gray-400 group-hover:text-gray-600 shrink-0">
                                        {route.type === 'bus' ? <Bus className="w-5 h-5" /> :
                                            route.type === 'subway' ? <Train className="w-5 h-5" /> :
                                                <Car className="w-5 h-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-gray-700 text-sm truncate">{route.name}</div>
                                        <div className="text-xs text-gray-500">{route.time}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                    <Badge
                                        variant={
                                            route.type === 'subway' ? 'success' :
                                                busRisk === 'low' ? 'info' :
                                                    busRisk === 'medium' ? 'warning' : 'danger'
                                        }
                                        size="sm"
                                    >
                                        {route.type === 'subway' ? '通常運行' :
                                            busRisk === 'low' ? '通常運行' :
                                                busRisk === 'medium' ? '遅延注意' : '運休リスク'}
                                    </Badge>
                                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                                </div>
                            </a>
                        ))}

                    {/* Taxi Rows */}
                    {facilities?.hasTaxi && taxiAffiliates.map((affiliate) => {
                        // If taxi is very expensive, maybe don't highlight it as much or show warning
                        // But for now, we just show the estimate.
                        // If high cost, add a badge.
                        return (
                            <a
                                key={affiliate.id}
                                href={affiliate.webUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'taxi', provider: affiliate.name })}
                                className="flex items-center justify-between p-4 min-h-[56px] hover:bg-gray-50 active:bg-gray-100 transition-colors group"
                            >
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className="text-gray-400 group-hover:text-gray-600 shrink-0">
                                        <Car className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-gray-700 text-sm flex items-center gap-2 flex-wrap">
                                            <span className="truncate">タクシー手配 ({affiliate.name})</span>
                                            {taxiInfo?.isHighCost && (
                                                <CompactBadge className="bg-red-100 text-red-600 border border-red-200">
                                                    高額注意
                                                </CompactBadge>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">{affiliate.description}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                    <div className="text-right">
                                        <div className={cn(
                                            "text-xs sm:text-sm font-mono",
                                            taxiInfo?.isHighCost ? "text-red-600 font-bold" : "text-gray-600"
                                        )}>
                                            {taxiInfo ? `¥${taxiInfo.estimatedFare.toLocaleString()}~` : '見積もり中'}
                                        </div>
                                        {taxiInfo?.isHighCost && (
                                            <div className="text-xs text-gray-500">長距離</div>
                                        )}
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                                </div>
                            </a>
                        );
                    })}

                    {/* Hotel / Cafe (Wait options) */}
                    {(showLongStayOptions || showShortStayOptions) && (
                        <div className="p-4 bg-gray-50/50 flex flex-col gap-3">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">待機・滞在</div>
                            <ResponsiveGrid cols={{ mobile: 1, tablet: 2 }} gap="sm">
                                {/* Hotel */}
                                {showLongStayOptions && facilities?.hasHotel && (
                                    <a
                                        href={`https://search.travel.rakuten.co.jp/ds/hotel/search?f_keyword=${encodeURIComponent(departureStation.name + '駅')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-3 min-h-[44px] bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-pink-300 hover:text-pink-600 active:bg-pink-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Hotel className="w-4 h-4" /> {departureStation.name}周辺のホテル
                                    </a>
                                )}
                                {/* Cafe */}
                                {(showShortStayOptions || (showLongStayOptions && !facilities?.hasHotel)) && facilities?.hasCafe && (
                                    <a
                                        href={`https://www.google.com/maps/search/カフェ+${encodeURIComponent(departureStation.name + '駅')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-3 min-h-[44px] bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-orange-300 hover:text-orange-600 active:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Coffee className="w-4 h-4" /> カフェ検索
                                    </a>
                                )}
                            </ResponsiveGrid>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
