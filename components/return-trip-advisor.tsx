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
        <div className={cn(
            "mt-4 mb-2 p-4 card-elevated border-l-4 flex items-start gap-4",
            status === 'critical' ? 'border-l-[var(--status-suspended)] bg-red-50/5' :
                status === 'warning' ? 'border-l-[var(--status-warning)] bg-orange-50/5' :
                    'border-l-[var(--status-normal)] bg-green-50/5'
        )}>
            <div className={cn(
                "mt-1 shrink-0 p-3 rounded-full shadow-sm",
                status === 'critical' ? 'bg-red-50 text-[var(--status-suspended)]' :
                    status === 'warning' ? 'bg-orange-50 text-[var(--status-warning)]' :
                        'bg-green-50 text-[var(--status-normal)]'
            )}>
                {status === 'critical' ? <Hotel className="w-6 h-6" /> :
                    status === 'warning' ? <Home className="w-6 h-6" /> :
                        <Coffee className="w-6 h-6" />}
            </div>
            <div className="flex-1">
                <h3 className={cn(
                    "font-bold text-sm",
                    status === 'critical' ? 'text-red-950' :
                        status === 'warning' ? 'text-orange-950' :
                            'text-green-950'
                )}>
                    帰宅サバイバル判定
                </h3>
                <p className={cn(
                    "text-sm mt-1.5 leading-relaxed",
                    status === 'critical' ? 'text-red-900' :
                        status === 'warning' ? 'text-orange-900' :
                            'text-green-900'
                )}>
                    {message}
                </p>

                {/* Action Button (Fake for MVP) */}
                {status === 'critical' && (
                    <button
                        onClick={() => {
                            const element = document.getElementById('hotel-suggestions-section');
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        className="mt-4 bg-[var(--status-suspended)] hover:bg-red-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 w-full justify-center transition-all shadow-md active:scale-[0.98]"
                    >
                        <Hotel className="w-4 h-4" />
                        <span>近くのホテルを探す</span>
                        <ArrowRight className="w-3 h-3 ml-1 opacity-70" />
                    </button>
                )}
            </div>
        </div>
    );
}
