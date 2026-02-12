'use client';

import { useMemo } from 'react';
import { Bus, Car, Train, Coffee, Hotel, ExternalLink, Clock } from 'lucide-react';
import { Station, getAlternativeRoutes, AlternativeRouteOption, estimateTaxiFare } from '@/lib/hokkaido-data';
import { getStationFacilities } from '@/lib/alternative-options';
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
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-blue-100 p-1 rounded text-blue-600">🚌</span>
                代替手段・手配
                <span className="text-xs font-normal text-gray-500">（{departureStation.name}発）</span>
            </h3>

            <div className="space-y-3">
                {/* 0. 時間変更提案（早い列車に変更） */}
                {timeShiftSuggestion && timeShiftSuggestion.difference >= 15 && (
                    <div className="card p-4 border-l-4 border-l-[var(--status-normal)] relative overflow-hidden">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-[var(--status-normal)]" />
                                <span className="font-bold text-sm text-[var(--foreground)]">
                                    🚃 {timeShiftSuggestion.isEarlier ? '早い時間' : '遅い時間'}の列車に変更
                                </span>
                            </div>
                            <span className="text-xs bg-green-50 text-[var(--status-normal)] px-2 py-0.5 rounded-full font-bold border border-green-100">
                                {timeShiftSuggestion.time}発
                            </span>
                        </div>
                        <div className="mt-2 text-xs text-[var(--muted)] relative z-10">
                            運休リスク <span className="text-[var(--status-normal)] font-black">{timeShiftSuggestion.risk}%</span>（通常より{timeShiftSuggestion.difference}%低い）
                        </div>
                    </div>
                )}

                {/* 1. 推奨ルート・バス（アフィリエイト含む） */}
                <div className="space-y-3">
                    {recommendedRoutes
                        .filter(route => showHeavyTransport || route.type === 'subway') // 短時間ならバス・レンタカーを除外（地下鉄は残す）
                        .map((route, idx) => (
                            <a
                                key={idx}
                                href={route.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => sendGAEvent('event', 'alternative_click', { type: route.type, name: route.name, route_scope: 'specific' })}
                                className={cn(
                                    "block p-4 card border-l-4 transition-all hover:bg-gray-50 active:scale-[0.98]",
                                    route.type === 'subway' ? "border-l-[var(--status-normal)]" :
                                        busRisk === 'low' ? "border-l-[var(--accent)]" :
                                            busRisk === 'medium' ? "border-l-[var(--status-warning)]" :
                                                "border-l-[var(--status-suspended)]"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "p-2 rounded-full",
                                        route.type === 'subway' ? "bg-green-50 text-[var(--status-normal)]" :
                                            busRisk === 'low' ? "bg-blue-50 text-[var(--accent)]" :
                                                busRisk === 'medium' ? "bg-orange-50 text-[var(--status-warning)]" :
                                                    "bg-red-50 text-[var(--status-suspended)]"
                                    )}>
                                        {route.type === 'bus' ? (
                                            <Bus className="w-4 h-4" />
                                        ) : route.type === 'subway' ? (
                                            <Train className="w-4 h-4" />
                                        ) : (
                                            <Car className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-sm text-[var(--foreground)]">{route.name}</span>
                                            <span className="text-xs font-black text-[var(--foreground)]">{route.time}</span>
                                        </div>
                                        <div className="text-xs text-[var(--muted)] mt-1 leading-relaxed">{route.details}</div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-300 ml-1" />
                                </div>
                            </a>
                        ))}

                    {/* PR: 高速バス・路線バス予約（推奨ルートがある場合 かつ 長期遅延時のみ表示） */}
                    {showHeavyTransport && recommendedRoutes.length > 0 && busAffiliate && (
                        <a
                            href={busAffiliate.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'bus', provider: busAffiliate.name })}
                            className="block p-4 card border-l-4 border-l-blue-400 hover:bg-blue-50/30 transition-all active:scale-[0.98] relative"
                        >
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                <span className="text-[9px] font-black text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">{PR_LABEL}</span>
                                <ExternalLink className="w-3 h-3 text-blue-300" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-full text-blue-500">
                                    <Bus className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[var(--foreground)]">高速・路線バス予約</div>
                                    <div className="text-[10px] text-blue-500 font-medium">{busAffiliate.name}</div>
                                </div>
                            </div>
                        </a>
                    )}
                </div>

                {/* 2. タクシー・レンタカー（アフィリエイト統合） */}
                <div className="grid grid-cols-2 gap-3">
                    {/* タクシー（常時表示、ただし短期・長期どちらも有用） */}
                    {facilities?.hasTaxi && (
                        <a
                            href={taxiAffiliate?.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'taxi', provider: taxiAffiliate?.name })}
                            className="block p-4 card border-l-4 border-l-[var(--status-warning)] hover:bg-gray-50 transition-all active:scale-[0.98] relative"
                        >
                            <div className="absolute top-2 right-2">
                                <span className="text-[9px] font-black text-orange-400 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 uppercase tracking-tighter">{PR_LABEL}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <Car className="w-4 h-4 text-[var(--status-warning)]" />
                                <span className="font-bold text-sm text-[var(--foreground)]">タクシー</span>
                            </div>
                            {taxiInfo && (
                                <div className="text-[11px] text-[var(--muted)] leading-tight space-y-1">
                                    <div className="flex items-center justify-between"><span>概算</span><span className="font-bold text-[var(--foreground)]">¥{taxiInfo.fare.toLocaleString()}〜</span></div>
                                    <div className="flex items-center justify-between"><span>目安</span><span className="font-bold text-[var(--foreground)]">約{taxiInfo.time}分</span></div>
                                </div>
                            )}
                            <div className="mt-3 text-[10px] text-[var(--status-warning)] font-bold border-t border-orange-50 pt-2 flex items-center justify-between">
                                今すぐ手配 <ExternalLink className="w-3 h-3" />
                            </div>
                        </a>
                    )}

                    {/* レンタカー（長期遅延時のみ） */}
                    {showHeavyTransport && facilities?.hasRentalCar && (
                        <a
                            href={rentalAffiliate?.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'rental', provider: rentalAffiliate?.name })}
                            className="block p-4 card border-l-4 border-l-purple-400 hover:bg-gray-50 transition-all active:scale-[0.98] relative"
                        >
                            <div className="absolute top-2 right-2">
                                <span className="text-[9px] font-black text-purple-400 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 uppercase tracking-tighter">{PR_LABEL}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <Car className="w-4 h-4 text-purple-600" />
                                <span className="font-bold text-sm text-[var(--foreground)]">レンタカー</span>
                            </div>
                            <div className="text-[11px] text-[var(--muted)] leading-tight">
                                駅周辺に店舗あり
                            </div>
                            <div className="mt-3 text-[10px] text-purple-600 font-bold border-t border-purple-50 pt-2 flex items-center justify-between">
                                空き状況 <ExternalLink className="w-3 h-3" />
                            </div>
                        </a>
                    )}
                </div>

                {/* 3. 地下鉄（常時表示） */}
                {facilities?.hasSubway && facilities.subwayLines && (
                    <div className="p-4 card border-l-4 border-l-[var(--status-normal)] bg-green-50/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 rounded-full text-[var(--status-normal)]">
                                <Train className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-[var(--foreground)]">地下鉄（{facilities.subwayLines.join('・')}）</div>
                                <div className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed">
                                    雪・風の影響なし。市内移動は最も確実
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. 滞在・待機施設（状況に応じて切り替え） */}
                {(showLongStayOptions || showShortStayOptions) && (
                    <div className="pt-4 border-t border-gray-100">
                        <div className="text-[10px] font-black text-[var(--muted)] mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {showLongStayOptions ? '長期見合わせ時の滞在・宿泊' : '運転再開までの待機場所'}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {/* ホテル（長期時のみ） */}
                            {showLongStayOptions && facilities?.hasHotel && (
                                <a
                                    href={`https://search.travel.rakuten.co.jp/ds/hotel/search?f_keyword=${encodeURIComponent(departureStation.name + '駅')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'hotel_search', station: departureStation.name })}
                                    className="block p-3 card border-l-4 border-l-pink-400 flex items-center gap-3 hover:bg-pink-50/50 transition-all active:scale-[0.98]"
                                >
                                    <div className="p-1.5 bg-pink-50 rounded-full text-pink-500">
                                        <Hotel className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-[var(--foreground)]">ホテルを探す</div>
                                        <div className="text-[10px] text-[var(--muted)]">周辺の宿泊施設を検索</div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-pink-300" />
                                </a>
                            )}

                            {/* カフェ（短期時のみ、または長期時でホテルがない場合） */}
                            {(showShortStayOptions || (showLongStayOptions && !facilities?.hasHotel)) && facilities?.hasCafe && (
                                <a
                                    href={`https://www.google.com/maps/search/カフェ+${encodeURIComponent(departureStation.name + '駅')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => sendGAEvent('event', 'affiliate_click', { type: 'cafe_search', station: departureStation.name })}
                                    className="block p-3 card border-l-4 border-l-orange-400 flex items-center gap-3 hover:bg-orange-50/50 transition-all active:scale-[0.98]"
                                >
                                    <div className="p-1.5 bg-orange-50 rounded-full text-orange-500">
                                        <Coffee className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-[var(--foreground)]">カフェを探す</div>
                                        <div className="text-[10px] text-[var(--muted)]">電源・Wi-Fi利用可の場所</div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-orange-300" />
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
