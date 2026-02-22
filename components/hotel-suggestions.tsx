'use client';

import { Hotel } from '@/lib/hotel-data';
import { ExternalLink, Hotel as HotelIcon, MapPin } from 'lucide-react';

interface HotelSuggestionsProps {
    hotels: Hotel[];
    arrivalStationName: string;
}

export function HotelSuggestions({ hotels, arrivalStationName }: HotelSuggestionsProps) {
    if (hotels.length === 0) return null;

    return (
        <div
            id="hotel-suggestions-section"
            className="mt-6 p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/50 animate-[fadeInUp_0.3s_ease-out]"
        >
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <HotelIcon className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-amber-900 leading-none">帰宅困難時の宿泊提案</h3>
                    <p className="text-[11px] text-amber-700 mt-1 font-bold">
                        {arrivalStationName}周辺の人気ホテルをピックアップ
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {hotels.map((hotel) => (
                    <a
                        key={hotel.id}
                        href={hotel.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col sm:flex-row gap-3 p-4 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all"
                    >
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                                {hotel.name}
                                <span className="text-[9px] px-1 py-0.5 bg-gray-100 text-gray-400 rounded font-medium leading-none">PR</span>
                            </h4>
                            <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                                {hotel.description}
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                    <MapPin className="w-3 h-3" />
                                    <span>{hotel.city}エリア</span>
                                </div>
                                {hotel.priceRange && (
                                    <div className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-700">
                                        目安: {hotel.priceRange}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-center sm:border-l border-amber-100 sm:pl-3">
                            <div className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 group-hover:bg-amber-700 transition-colors whitespace-nowrap">
                                空室確認
                                <ExternalLink className="w-3 h-3" />
                            </div>
                        </div>
                    </a>
                ))}
            </div>

            <p className="mt-4 text-[9px] text-amber-600/70 text-center font-medium">
                ※楽天トラベル提携リンク（広告）です。ご予約により当サイトに収益が発生します。<br />
                運休時は予約が集中するため、早めの確認をお勧めします。
            </p>
        </div>
    );
}
