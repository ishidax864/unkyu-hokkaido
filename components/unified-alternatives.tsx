'use client';

import { useMemo } from 'react';
import { Bus, Car, Train, Coffee, Hotel, ExternalLink, Clock } from 'lucide-react';
import { Station, getAlternativeRoutes, AlternativeRouteOption, estimateTaxiFare } from '@/lib/hokkaido-data';
import { getStationFacilities } from '@/lib/alternative-options';
import { cn } from '@/lib/utils';

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

        // 距離から所要時間を概算（平均24km/h）
        const distanceKm = fare / 400; // 概算
        const timeMin = Math.round(distanceKm * 2.5);
        return { fare, time: timeMin };
    }, [departureStation, arrivalStation]);

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

    const recoveryHours = typeof estimatedRecoveryHours === 'number' ? estimatedRecoveryHours : 0;
    const showStayOptions = recoveryHours >= 2 || estimatedRecoveryHours === '終日運休';

    const taxiAffiliate = TAXI_AFFILIATES[0];
    const busAffiliate = BUS_AFFILIATES[0];
    const rentalAffiliate = RENTAL_CAR_AFFILIATES[0];

    return (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-blue-100 p-1 rounded text-blue-600">🚌</span>
                代替手段・手配
                <span className="text-xs font-normal text-gray-500">（{departureStation.name}発）</span>
            </h3>

            <div className="space-y-3">
                {/* 0. 時間変更提案（早い列車に変更） */}
                {timeShiftSuggestion && timeShiftSuggestion.difference >= 15 && (
                    <div className="p-3 rounded-lg bg-green-50 border-2 border-green-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-green-600" />
                                <span className="font-bold text-sm text-green-700">
                                    🚃 {timeShiftSuggestion.isEarlier ? '早い時間' : '遅い時間'}の列車に変更
                                </span>
                            </div>
                            <span className="text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                {timeShiftSuggestion.time}発
                            </span>
                        </div>
                        <div className="mt-1 text-xs text-green-600">
                            運休リスク {timeShiftSuggestion.risk}%（通常より{timeShiftSuggestion.difference}%低い）
                        </div>
                    </div>
                )}

                {/* 1. 推奨ルート・バス（アフィリエイト含む） */}
                <div className="space-y-2">
                    {recommendedRoutes.map((route, idx) => (
                        <a
                            key={idx}
                            href={route.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                "block p-3 rounded-lg border-2 transition-colors",
                                busRisk === 'low' ? "bg-blue-50 border-blue-200 hover:bg-blue-100" :
                                    busRisk === 'medium' ? "bg-yellow-50 border-yellow-200 hover:bg-yellow-100" :
                                        "bg-red-50 border-red-200 hover:bg-red-100"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                {route.type === 'bus' ? (
                                    <Bus className="w-5 h-5 text-blue-600 mt-0.5" />
                                ) : route.type === 'subway' ? (
                                    <Train className="w-5 h-5 text-green-600 mt-0.5" />
                                ) : (
                                    <Car className="w-5 h-5 text-gray-600 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm">{route.name}</span>
                                        <span className="text-xs text-gray-500">{route.time}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5">{route.details}</div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                            </div>
                        </a>
                    ))}

                    {/* PR: 高速バス・路線バス予約（推奨ルートがある場合のみ表示） */}
                    {recommendedRoutes.length > 0 && busAffiliate && (
                        <a
                            href={busAffiliate.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-lg bg-blue-50 border-2 border-blue-100 hover:bg-blue-100 transition-colors relative"
                        >
                            <div className="absolute top-1 right-1 text-[9px] font-bold text-blue-400">{PR_LABEL}</div>
                            <div className="flex items-center gap-3">
                                <Bus className="w-5 h-5 text-blue-500" />
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-blue-700">高速・路線バス予約</div>
                                    <div className="text-[10px] text-blue-500">{busAffiliate.name}</div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-blue-300" />
                            </div>
                        </a>
                    )}
                </div>

                {/* 2. タクシー・レンタカー（アフィリエイト統合） */}
                <div className="grid grid-cols-2 gap-2">
                    {/* タクシー */}
                    {facilities?.hasTaxi && (
                        <a
                            href={taxiAffiliate?.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors relative"
                        >
                            <div className="absolute top-1 right-1 text-[9px] font-bold text-yellow-500">{PR_LABEL}</div>
                            <div className="flex items-center gap-2 mb-1">
                                <Car className="w-4 h-4 text-yellow-600" />
                                <span className="font-bold text-sm text-yellow-700">🚕 タクシー</span>
                            </div>
                            {taxiInfo && (
                                <div className="text-[11px] text-yellow-700 leading-tight">
                                    <div>概算: ¥{taxiInfo.fare.toLocaleString()}〜</div>
                                    <div>約{taxiInfo.time}分</div>
                                </div>
                            )}
                            <div className="mt-2 text-[10px] text-yellow-600 font-bold underline flex items-center gap-0.5">
                                今すぐ手配 <ExternalLink className="w-3 h-3" />
                            </div>
                        </a>
                    )}

                    {/* レンタカー */}
                    {facilities?.hasRentalCar && (
                        <a
                            href={rentalAffiliate?.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors relative"
                        >
                            <div className="absolute top-1 right-1 text-[9px] font-bold text-purple-500">{PR_LABEL}</div>
                            <div className="flex items-center gap-2 mb-1">
                                <Car className="w-4 h-4 text-purple-600" />
                                <span className="font-bold text-sm text-purple-700">🚗 レンタカー</span>
                            </div>
                            <div className="text-[11px] text-purple-700 leading-tight">
                                駅周辺に店舗あり
                            </div>
                            <div className="mt-2 text-[10px] text-purple-600 font-bold underline flex items-center gap-0.5">
                                空き状況を確認 <ExternalLink className="w-3 h-3" />
                            </div>
                        </a>
                    )}
                </div>

                {/* 3. 地下鉄（札幌のみ） */}
                {facilities?.hasSubway && facilities.subwayLines && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                        <div className="flex items-center gap-2">
                            <Train className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-sm text-green-700">🚇 地下鉄（{facilities.subwayLines.join('・')}）</span>
                        </div>
                        <div className="mt-1 text-xs text-green-600">
                            雪・風の影響なし。市内移動は最も確実
                        </div>
                    </div>
                )}

                {/* 4. 長期化時の滞在施設 */}
                {showStayOptions && (
                    <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            復旧まで{estimatedRecoveryHours}時間以上の見込み
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {facilities?.hasHotel && (
                                <div className="p-2 rounded-lg bg-pink-50 border border-pink-100 flex items-center gap-2">
                                    <Hotel className="w-4 h-4 text-pink-500" />
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-pink-700">🏨 ホテル</div>
                                        <div className="text-[10px] text-pink-500">周辺に宿泊施設あり</div>
                                    </div>
                                </div>
                            )}
                            {facilities?.hasCafe && (
                                <div className="p-2 rounded-lg bg-orange-50 border border-orange-100 flex items-center gap-2">
                                    <Coffee className="w-4 h-4 text-orange-500" />
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-orange-700">☕ カフェ</div>
                                        <div className="text-[10px] text-orange-500">電源・Wi-Fi利用可</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
