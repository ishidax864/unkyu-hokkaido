'use client';

import { useMemo } from 'react';
import { Train, Bus, Car, Hotel, Coffee, MapPin } from 'lucide-react';
import { getAvailableAlternatives, AlternativeOption } from '@/lib/alternative-options';
import { Station } from '@/lib/hokkaido-data';

interface AlternativeOptionsCardProps {
    departureStation: Station | null;
    arrivalStation: Station | null;
    estimatedRecoveryHours?: number;
    jrRisk: number;
}

function getOptionIcon(type: AlternativeOption['type']) {
    switch (type) {
        case 'subway': return <Train className="w-5 h-5" />;
        case 'bus': return <Bus className="w-5 h-5" />;
        case 'taxi': return <Car className="w-5 h-5" />;
        case 'rental': return <Car className="w-5 h-5" />;
        case 'hotel': return <Hotel className="w-5 h-5" />;
        case 'cafe': return <Coffee className="w-5 h-5" />;
        default: return <MapPin className="w-5 h-5" />;
    }
}

function getOptionColor(type: AlternativeOption['type']) {
    switch (type) {
        case 'subway': return 'bg-green-50 border-green-200 text-green-700';
        case 'bus': return 'bg-blue-50 border-blue-200 text-blue-700';
        case 'taxi': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
        case 'rental': return 'bg-purple-50 border-purple-200 text-purple-700';
        case 'hotel': return 'bg-pink-50 border-pink-200 text-pink-700';
        case 'cafe': return 'bg-orange-50 border-orange-200 text-orange-700';
        default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
}

export function AlternativeOptionsCard({
    departureStation,
    arrivalStation,
    estimatedRecoveryHours,
    jrRisk
}: AlternativeOptionsCardProps) {
    const options = useMemo(() => {
        if (!departureStation || !arrivalStation) return [];
        return getAvailableAlternatives(
            departureStation.id,
            arrivalStation.id,
            estimatedRecoveryHours
        );
    }, [departureStation, arrivalStation, estimatedRecoveryHours]);

    // リスクが低い場合は表示しない
    if (jrRisk < 30 || options.length === 0) {
        return null;
    }

    // 移動手段と滞在施設を分離
    const transportOptions = options.filter(o => ['subway', 'bus', 'taxi', 'rental'].includes(o.type));
    const stayOptions = options.filter(o => ['hotel', 'cafe'].includes(o.type));

    return (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm mb-4">
            {/* 移動手段 */}
            {transportOptions.length > 0 && (
                <>
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="bg-blue-100 p-1 rounded text-blue-600">🚌</span>
                        {departureStation?.name}からの代替手段
                    </h3>

                    <div className="grid gap-2">
                        {transportOptions.map((option, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-lg border-2 ${getOptionColor(option.type)}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getOptionIcon(option.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm">{option.icon} {option.name}</div>
                                        <div className="text-xs opacity-80 mt-0.5">{option.description}</div>
                                        <div className="flex items-center gap-3 mt-1 text-xs">
                                            {option.time && (
                                                <span className="bg-white/50 px-2 py-0.5 rounded">
                                                    🕐 {option.time}
                                                </span>
                                            )}
                                            {option.cost && (
                                                <span className="bg-white/50 px-2 py-0.5 rounded">
                                                    💴 {option.cost}
                                                </span>
                                            )}
                                        </div>
                                        {option.note && (
                                            <div className="text-xs opacity-70 mt-1 italic">
                                                ※ {option.note}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* 滞在施設（長期化する場合のみ） */}
            {stayOptions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
                        <span className="bg-orange-100 p-1 rounded text-orange-600">⏳</span>
                        待機・宿泊施設
                    </h4>
                    <div className="grid gap-2">
                        {stayOptions.map((option, idx) => (
                            <div
                                key={idx}
                                className={`p-2 rounded-lg border ${getOptionColor(option.type)}`}
                            >
                                <div className="flex items-center gap-2">
                                    {getOptionIcon(option.type)}
                                    <div>
                                        <div className="font-bold text-sm">{option.icon} {option.name}</div>
                                        <div className="text-xs opacity-80">{option.description}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
