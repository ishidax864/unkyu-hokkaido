'use client';

import { Crown, Check, X } from 'lucide-react';
import { usePremium } from '@/contexts/premium-context';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function PremiumPromoBanner() {
    const { isPremium, upgrade } = usePremium();
    const [isVisible, setIsVisible] = useState(true);

    if (isPremium || !isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-2xl relative overflow-hidden border border-white/10">
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 text-white/50 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4">
                    <div className="bg-yellow-500/20 p-3 rounded-full shrink-0">
                        <Crown className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg leading-tight mb-1">
                            運休リスクを<br />毎朝お知らせ
                        </h3>
                        <p className="text-[10px] text-white/70">
                            毎朝調べる手間をゼロに。「運休AI プレミアム」で快適な通勤を。
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={upgrade}
                        className="flex-1 bg-white text-slate-900 font-bold py-2.5 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                    >
                        月額 ¥500 で始める
                    </button>
                </div>
            </div>
        </div>
    );
}
