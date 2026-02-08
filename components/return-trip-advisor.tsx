import { ArrowRight, Hotel, Home, Coffee } from 'lucide-react';
import { PredictionResult } from '@/lib/types';

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
    } else if (prob >= 40) {
        status = 'warning';
        message = '夜遅くなると運休リスクが高まります。20時までの帰宅を目指してください。';
        icon = <Home className="w-5 h-5 text-yellow-600" />;
    }

    // Only show relevant advice
    if (status === 'safe' && !isEveningSoon) return null; // Don't show "Safe" during morning commute? Maybe show small reassurance.

    return (
        <div className={`mt-4 mb-2 p-4 rounded-xl border ${status === 'critical' ? 'bg-red-50 border-red-200' :
                status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
            }`}>
            <div className="flex items-start gap-3">
                <div className="mt-1 shrink-0 p-2 bg-white rounded-full shadow-sm">
                    {status === 'critical' ? <Hotel className="text-red-500" /> :
                        status === 'warning' ? <Home className="text-yellow-500" /> :
                            <Coffee className="text-green-500" />}
                </div>
                <div>
                    <h3 className={`font-bold text-sm ${status === 'critical' ? 'text-red-800' :
                            status === 'warning' ? 'text-yellow-800' :
                                'text-green-800'
                        }`}>
                        帰宅サバイバル判定
                    </h3>
                    <p className={`text-sm mt-1 leading-relaxed ${status === 'critical' ? 'text-red-700' :
                            status === 'warning' ? 'text-yellow-700' :
                                'text-green-700'
                        }`}>
                        {message}
                    </p>

                    {/* Action Button (Fake for MVP) */}
                    {status === 'critical' && (
                        <button className="mt-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 w-full justify-center transition-colors shadow-sm">
                            <Hotel className="w-4 h-4" />
                            <span>近くのホテルを探す</span>
                            <ArrowRight className="w-3 h-3 ml-1 opactiy-70" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
