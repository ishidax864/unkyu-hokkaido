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
        <div className="bg-gradient-to-br from-white to-blue-50/30 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/40 mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2.5">
                <span className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
                    <Bus className="w-4 h-4" />
                </span>
                この後のアクション
                <span className="text-xs font-medium text-gray-500 ml-auto bg-white/50 px-3 py-1 rounded-full border border-white/40">
                    Taking action from {departureStation.name}
                </span>
            </h3>

            <div className="space-y-6">
                {/* 0. 時間変更提案（早めの移動） */}
                {timeShiftSuggestion && timeShiftSuggestion.difference >= 15 && (
                    <div className="relative group overflow-hidden rounded-xl bg-white border border-green-100 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500/80"></div>
                        <div className="p-5 pl-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-green-600" />
                                    <span className="font-bold text-gray-800 text-lg">早めの移動で回避する</span>
                                </div>
                                <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                                    {timeShiftSuggestion.time} 発
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                この時間の列車なら、運休リスクを <span className="font-bold text-green-600">{timeShiftSuggestion.risk}%</span> まで抑えられます（通常より{timeShiftSuggestion.difference}%安全）。
                            </p>
                        </div>
                    </div>
                )}

                {/* 1. 地下鉄（最強の解決策） */}
                {showGenericSubway && facilities?.subwayLines && (
                    <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-start gap-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600 flex-shrink-0">
                            <Train className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 text-base mb-1">雪に強い地下鉄ルート</h4>
                            <p className="text-sm text-gray-600 leading-relaxed mb-2">
                                地下鉄（{facilities.subwayLines.join('・')}）は天候の影響を受けません。市内移動はこれが確実です。
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. 推奨ルート（バスなど） */}
                {recommendedRoutes
                    .filter(route => showHeavyTransport || route.type === 'subway')
                    .map((route, idx) => (
                        <a
                            key={idx}
                            href={route.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => sendGAEvent('event', 'alternative_click', { type: route.type, name: route.name, route_scope: 'specific' })}
                            className="block group rounded-xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-3 rounded-xl flex-shrink-0 transition-colors",
                                    route.type === 'subway' ? "bg-green-50 text-green-600" :
                                        busRisk === 'low' ? "bg-blue-50 text-blue-600" :
                                            busRisk === 'medium' ? "bg-orange-50 text-orange-600" :
                                                "bg-red-50 text-red-600"
                                )}>
                                    {route.type === 'bus' ? <Bus className="w-6 h-6" /> :
                                        route.type === 'subway' ? <Train className="w-6 h-6" /> :
                                            <Car className="w-6 h-6" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-gray-800 text-base group-hover:text-blue-600 transition-colors">
                                            {route.name}
                                        </span>
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {route.time}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {route.details}
                                    </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors mt-1" />
                            </div>
                        </a>
                    ))}

                {/* 3. タクシー（プレミアムな選択肢） */}
                {facilities?.hasTaxi && (
                    <a
                        href={taxiAffiliate?.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'taxi', provider: taxiAffiliate?.name })}
                        className="block group rounded-xl bg-white border border-orange-100 p-1 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-3 right-3 z-10">
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Recommended</span>
                        </div>
                        <div className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                                <Car className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-gray-800 text-base mb-1">混雑回避・直行（タクシー）</div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    {taxiInfo && (
                                        <>
                                            <span>約{taxiInfo.time}分</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span>¥{taxiInfo.fare.toLocaleString()}〜</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-all">
                                手配する <ExternalLink className="w-3 h-3" />
                            </div>
                        </div>
                    </a>
                )}

                {/* 4. 待機・滞在（Safety Net） */}
                {(showLongStayOptions || showShortStayOptions) && (
                    <div className="pt-6 mt-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-gray-200"></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                安全な場所で待機する
                            </span>
                            <div className="h-px flex-1 bg-gray-200"></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* ホテル */}
                            {showLongStayOptions && facilities?.hasHotel && (
                                <a
                                    href={`https://search.travel.rakuten.co.jp/ds/hotel/search?f_keyword=${encodeURIComponent(departureStation.name + '駅')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'hotel_search', station: departureStation.name })}
                                    className="group rounded-xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3"
                                >
                                    <div className="p-2.5 bg-pink-50 rounded-lg text-pink-500 group-hover:scale-110 transition-transform">
                                        <Hotel className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800 text-sm">ホテルを確保</div>
                                        <div className="text-xs text-gray-500">今夜の宿を探す</div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-pink-400" />
                                </a>
                            )}

                            {/* カフェ */}
                            {(showShortStayOptions || (showLongStayOptions && !facilities?.hasHotel)) && facilities?.hasCafe && (
                                <a
                                    href={`https://www.google.com/maps/search/カフェ+${encodeURIComponent(departureStation.name + '駅')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'cafe_search', station: departureStation.name })}
                                    className="group rounded-xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3"
                                >
                                    <div className="p-2.5 bg-yellow-50 rounded-lg text-yellow-600 group-hover:scale-110 transition-transform">
                                        <Coffee className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800 text-sm">カフェで待機</div>
                                        <div className="text-xs text-gray-500">Wi-Fi / 電源</div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-yellow-500" />
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
