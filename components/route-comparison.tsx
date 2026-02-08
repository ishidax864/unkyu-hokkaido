import { AlertTriangle, Bus, Train, CheckCircle } from 'lucide-react';

interface RouteComparisonCardProps {
    jrStatus: 'suspended' | 'delayed' | 'normal' | 'unknown';
    jrProb: number;
    windSpeed: number;
    snowfall: number;
}

export function RouteComparisonCard({ jrStatus, jrProb, windSpeed, snowfall }: RouteComparisonCardProps) {
    // Bus Logic (Simplified for MVP)
    // Buses are tougher against wind (25m/s limit vs JR's 20m/s)
    let busProb = 0;
    let busStatus: 'suspended' | 'warning' | 'normal' = 'normal';

    // Wind Impact on Bus
    if (windSpeed >= 25) {
        busProb = 90;
        busStatus = 'suspended';
    } else if (windSpeed >= 20) {
        busProb = 40; // Warning but likely running
        busStatus = 'warning';
    } else {
        busProb = 10;
    }

    // Snow Impact on Bus (Road closure risk)
    if (snowfall >= 5.0) { // Heavy snow per hour
        busProb = Math.max(busProb, 80);
        busStatus = 'suspended'; // Visibility/Road closure
    }

    // Is Bus a good alternative?
    const isBusRecommended = (jrProb >= 50 && busProb < 50);

    return (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-gray-200 p-1 rounded text-gray-600">
                    🚦 代替ルート判定
                </span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
                {/* JR Card */}
                <div className={`p-3 rounded-lg border-2 ${jrProb >= 50 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Train className={`w-4 h-4 ${jrProb >= 50 ? 'text-red-600' : 'text-green-600'}`} />
                        <span className="text-xs font-bold text-gray-500">JR線</span>
                    </div>
                    <div className={`text-lg font-bold ${jrProb >= 50 ? 'text-red-700' : 'text-green-700'}`}>
                        {jrProb >= 70 ? '運休警戒' : jrProb >= 40 ? '遅延警戒' : '通常運行'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">リスク: {jrProb}%</div>
                </div>

                {/* Bus Card */}
                <div className={`p-3 rounded-lg border-2 relative ${busProb >= 50 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
                    }`}>
                    {isBusRecommended && (
                        <div className="absolute -top-3 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            おすすめ！
                        </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                        <Bus className={`w-4 h-4 ${busProb >= 50 ? 'text-red-600' : 'text-blue-600'}`} />
                        <span className="text-xs font-bold text-gray-500">高速バス</span>
                    </div>
                    <div className={`text-lg font-bold ${busProb >= 50 ? 'text-red-700' : 'text-blue-700'}`}>
                        {busStatus === 'suspended' ? '運休警戒' : busStatus === 'warning' ? '遅延注意' : '運行見込'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">リスク: {busProb}%</div>
                </div>
            </div>

            {isBusRecommended && (
                <div className="mt-3 text-xs bg-blue-100 text-blue-800 p-2 rounded flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>JRは強風で止まりやすいですが、バスは現状運行できる可能性が高いです。代替手段として検討してください。</span>
                </div>
            )}
        </div>
    );
}
