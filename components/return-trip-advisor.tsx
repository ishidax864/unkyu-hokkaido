import { ArrowRight, Hotel, Home, Coffee } from 'lucide-react';
import { PredictionResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ReturnTripAdvisorProps {
    prediction: PredictionResult;
}

export function ReturnTripAdvisor({ prediction }: ReturnTripAdvisorProps) {
    const prob = prediction.probability;
    const isEveningSoon = new Date().getHours() >= 15;

    // Logic for Advice
    // If Probability is high (>70%) -> CRITICAL (Hotel or NO GO)
    // If Probability is medium (40-69%) -> WARNING (Go Home Early)
    // If Probability is low (<40%) -> SAFE

    let status: 'safe' | 'warning' | 'critical' = 'safe';
    let message = '通常通り帰宅できそうです。';
    let icon = <Coffee className="w-5 h-5 text-green-600" />;

    if (prob >= 70) {
        status = 'critical';
        message = '帰宅困難になる可能性が高いです。今すぐ帰るか、駅近くのホテル確保を強く推奨します。';
        icon = <Hotel className="w-5 h-5 text-red-600" />;
    } else if (prob >= 30) { // Changed from 40 to 30 to align with Route Comparison visibility
        status = 'warning';
        message = '夜遅くなると運休リスクが高まります。余裕を持った行動を推奨します。';
        icon = <Home className="w-5 h-5 text-yellow-600" />;
    }

    // Only show relevant advice
    if (status === 'safe' && !isEveningSoon) return null; // Don't show "Safe" during morning commute? Maybe show small reassurance.

    return (
    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-1.5 rounded-md",
                        status === 'critical' ? 'bg-red-100 text-red-600' :
                            status === 'warning' ? 'bg-orange-100 text-orange-600' :
                                'bg-green-100 text-green-600'
                    )}>
                        {status === 'critical' ? <Hotel className="w-4 h-4" /> :
                            status === 'warning' ? <Home className="w-4 h-4" /> :
                                <Coffee className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-bold text-gray-700">帰宅サバイバル判定</span>
                </div>
                <div className={cn(
                    "text-xs font-bold px-2 py-1 rounded",
                    status === 'critical' ? 'bg-red-50 text-red-700 border border-red-100' :
                        status === 'warning' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                            'bg-green-50 text-green-700 border border-green-100'
                )}>
                    {status === 'critical' ? '帰宅困難' : status === 'warning' ? '要注意' : '安全圏'}
                </div>
            </div>

            <div className="p-4">
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    {message}
                </p>

                {/* Action Button */}
                {status === 'critical' && (
                    <button
                        onClick={() => {
                            const element = document.getElementById('hotel-suggestions-section');
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        className="w-full bg-[var(--status-suspended)] hover:bg-red-700 text-white text-sm font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
                    >
                        <Hotel className="w-4 h-4" />
                        <span>近くのホテルを探す</span>
                        <ArrowRight className="w-4 h-4 opacity-80" />
                    </button>
                )}
            </div>
        </div>
    );
    );
}
