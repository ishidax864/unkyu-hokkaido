'use client';

import { Car, Hotel, Plane, Clock, ArrowRight, Bus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { getAffiliatesByType, getAffiliateById } from '@/lib/affiliates';

type AffiliateContext = 'commute_risk' | 'night_stay' | 'airport_access' | 'normal';

interface SmartAffiliateCardProps {
    prediction: {
        probability: number;
        status: string;
    };
    routeId: string;
    className?: string;
}

export function SmartAffiliateCard({ prediction, routeId, className }: SmartAffiliateCardProps) {
    // Determine context
    const hour = new Date().getHours();
    const isHighRisk = prediction.probability >= 50;

    let context: AffiliateContext = 'normal';

    if (routeId.includes('airport') && isHighRisk) {
        context = 'airport_access';
    } else if (hour >= 20 && isHighRisk) {
        context = 'night_stay'; // Late night + risk = Stay
    } else if (isHighRisk) {
        context = 'commute_risk'; // General high risk = Taxi
    }

    if (context === 'normal') return null; // Don't show if low risk

    return (
        <div className={cn("mt-6", className)}>
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 pl-1 tracking-wider">
                おすすめの代替手段 (PR)
            </div>

            {context === 'commute_risk' && (
                <div className="space-y-2">
                    {getAffiliatesByType('taxi').map(affiliate => (
                        <a
                            key={affiliate.id}
                            href={affiliate.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white border border-blue-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Car className="w-24 h-24 text-blue-600 transform rotate-12 translate-x-4 -translate-y-4" />
                            </div>
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                    <Car className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800 text-sm mb-0.5 group-hover:text-blue-600 transition-colors">
                                        {affiliate.name}でタクシーを呼ぶ
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        {affiliate.description}
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                        </a>
                    ))}
                </div>
            )}

            {context === 'night_stay' && (
                <a
                    href="https://travel.rakuten.co.jp/" // Example: Rakuten Travel
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white border border-indigo-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Hotel className="w-24 h-24 text-indigo-600 transform rotate-12 translate-x-4 -translate-y-4" />
                    </div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
                            <Hotel className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-gray-800 text-sm mb-0.5 group-hover:text-indigo-600 transition-colors">
                                駅近ホテルを確保する
                            </div>
                            <div className="text-[10px] text-gray-500">
                                無理な移動は危険です。朝まで安全に待機しましょう。
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                </a>
            )}

            {context === 'airport_access' && (
                <div className="space-y-2">
                    {getAffiliatesByType('shuttle').map(affiliate => (
                        <a
                            key={affiliate.id}
                            href={affiliate.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white border border-teal-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Plane className="w-24 h-24 text-teal-600 transform rotate-12 translate-x-4 -translate-y-4" />
                            </div>
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="bg-teal-50 p-3 rounded-lg text-teal-600">
                                    <Plane className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800 text-sm mb-0.5 group-hover:text-teal-600 transition-colors">
                                        {affiliate.name}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        {affiliate.description}
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
