'use client';

import { useMemo } from 'react';
import { Bus, Car, Train, Coffee, Hotel, ExternalLink, Clock } from 'lucide-react';
import { Station, getAlternativeRoutes, AlternativeRouteOption, estimateTaxiFare } from '@/lib/hokkaido-data';
import { getStationFacilities } from '@/lib/alternative-options';
import { getRecoveryMessage, shouldShowGenericSubway } from '@/lib/suggestion-logic';
import { cn } from '@/lib/utils';
import { sendGAEvent } from '@next/third-parties/google'; // 🆕

import { TAXI_AFFILIATES, RENTAL_CAR_AFFILIATES, BUS_AFFILIATES, PR_LABEL } from '@/lib/user-reports';

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
        const fare = estimateTaxiFare(departureStation.id, arrivalStation.id);
        if (!fare) return null;

        // Distance estimation
        const distanceKm = fare / 400;
        const timeMin = Math.round(distanceKm * 2.5);
        return { fare, time: timeMin };
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

    const taxiAffiliate = TAXI_AFFILIATES[0];
    const busAffiliate = BUS_AFFILIATES[0];
    const rentalAffiliate = RENTAL_CAR_AFFILIATES[0];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            {/* Header: Utility & Clarity */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="bg-white p-1 rounded-md border border-gray-200">
                        <Bus className="w-3 h-3 text-gray-600" />
                    </span>
                    代替手段・アクション
                </h3>
                <span className="text-xs font-mono text-gray-400">FROM: {departureStation.name}</span>
            </div>

            <div className="p-5 space-y-6">
                {/* 0. Primary Recommendation (The "Best" Option) */}
                {/* Logic: TimeShift > Subway > Standard Routes */}
                {(timeShiftSuggestion?.difference ?? 0) >= 15 ? (
                    <div className="bg-white border border-emerald-100 rounded-lg p-4 shadow-sm ring-1 ring-emerald-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                            RECOMMENDED
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-800 text-base mb-1">
                                    {timeShiftSuggestion?.time} 発の列車に変更
                                </h4>
                                <p className="text-sm text-gray-600 mb-1">
                                    運休リスク: <span className="font-bold text-emerald-600">{timeShiftSuggestion?.risk}%</span>（通常より{timeShiftSuggestion?.difference}% 低い）
                                </p>
                                <p className="text-xs text-gray-400">現在時刻より早い時間への変更が最も確実です。</p>
                            </div>
                        </div>
                    </div>
                ) : showGenericSubway && facilities?.subwayLines ? (
                    <div className="bg-white border border-emerald-100 rounded-lg p-4 shadow-sm ring-1 ring-emerald-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                            RECOMMENDED
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                                <Train className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-800 text-base mb-1">
                                    地下鉄ルート（{facilities.subwayLines.join('・')}）
                                </h4>
                                <p className="text-sm text-gray-600 mb-1">
                                    天候の影響を受けず、定時運行中。
                                </p>
                                <p className="text-xs text-gray-400">市内移動の最も確実な手段です。</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* 1. Other Options List (Table Style) */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
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
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-gray-400 group-hover:text-gray-600">
                                            {route.type === 'bus' ? <Bus className="w-5 h-5" /> :
                                                route.type === 'subway' ? <Train className="w-5 h-5" /> :
                                                    <Car className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-700 text-sm">{route.name}</div>
                                            <div className="text-xs text-gray-500">{route.time}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn(
                                            "text-xs font-bold px-2 py-0.5 rounded",
                                            route.type === 'subway' ? "bg-emerald-100 text-emerald-700" :
                                                busRisk === 'low' ? "bg-blue-100 text-blue-700" :
                                                    busRisk === 'medium' ? "bg-orange-100 text-orange-700" :
                                                        "bg-red-100 text-red-700"
                                        )}>
                                            {route.type === 'subway' ? '通常運行' :
                                                busRisk === 'low' ? '通常運行' :
                                                    busRisk === 'medium' ? '遅延注意' : '運休リスク'}
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-300 ml-4 group-hover:text-blue-500" />
                                </a>
                            ))}

                        {/* Taxi Row */}
                        {facilities?.hasTaxi && (
                            <a
                                href={taxiAffiliate?.webUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'taxi', provider: taxiAffiliate?.name })}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-gray-400 group-hover:text-gray-600">
                                        <Car className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-700 text-sm">タクシー手配</div>
                                        <div className="text-xs text-gray-500">{taxiInfo ? `約${taxiInfo.time}分` : '直行・混雑回避'}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono text-gray-600">
                                        {taxiInfo ? `¥${taxiInfo.fare.toLocaleString()}~` : 'ESTIMATE'}
                                    </div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-300 ml-4 group-hover:text-blue-500" />
                            </a>
                        )}

                        {/* Hotel / Cafe (Wait options) */}
                        {(showLongStayOptions || showShortStayOptions) && (
                            <div className="p-4 bg-gray-50/50 flex flex-col gap-2">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">待機・滞在</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Hotel */}
                                    {showLongStayOptions && facilities?.hasHotel && (
                                        <a
                                            href={`https://search.travel.rakuten.co.jp/ds/hotel/search?f_keyword=${encodeURIComponent(departureStation.name + '駅')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-2 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700 hover:border-pink-300 hover:text-pink-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Hotel className="w-4 h-4" /> ホテル検索
                                        </a>
                                    )}
                                    {/* Cafe */}
                                    {(showShortStayOptions || (showLongStayOptions && !facilities?.hasHotel)) && facilities?.hasCafe && (
                                        <a
                                            href={`https://www.google.com/maps/search/カフェ+${encodeURIComponent(departureStation.name + '駅')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-2 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Coffee className="w-4 h-4" /> カフェ検索
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
