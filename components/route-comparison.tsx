import { Bus, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/ui-utils';

interface BusAlternativeCardProps {
    jrProb: number;
    windSpeed: number;
    snowfall: number;
}

/**
 * 代替ルート（バス）の運行状況を表示するカード
 * JR線は既に上部の「現在の運行状況」で表示済みなので、ここではバスのみ表示
 */
export function RouteComparisonCard({ jrProb, windSpeed, snowfall }: BusAlternativeCardProps) {
    // バスのリスク計算（風速25m/s以上で運休、20m/s以上で遅延）
    let busProb = 0;
    let busStatus: 'suspended' | 'warning' | 'normal' = 'normal';

    if (windSpeed >= 25) {
        busProb = 90;
        busStatus = 'suspended';
    } else if (windSpeed >= 20) {
        busProb = 40;
        busStatus = 'warning';
    } else {
        busProb = 10;
    }

    // 大雪時（5cm/h以上）は道路封鎖リスク
    if (snowfall >= 5.0) {
        busProb = Math.max(busProb, 80);
        busStatus = 'suspended';
    }

    const isBusRecommended = jrProb >= 50 && busProb < 50;

    return (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/20 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 flex-wrap">
                <span className="bg-gray-200 px-2 py-1 rounded text-gray-600">
                    🚌 代替手段（高速バス）
                </span>
                {isBusRecommended && (
                    <Badge variant="info" size="sm" pulse>
                        おすすめ！
                    </Badge>
                )}
            </h3>

            <div className={cn(
                "p-4 rounded-lg border-2",
                busProb >= 50 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
            )}>
                <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Bus className={cn(
                            "w-5 h-5",
                            busProb >= 50 ? 'text-red-600' : 'text-blue-600'
                        )} />
                        <span className={cn(
                            "text-base sm:text-lg font-bold",
                            busProb >= 50 ? 'text-red-700' : 'text-blue-700'
                        )}>
                            {busStatus === 'suspended' ? '運休見込み' : busStatus === 'warning' ? '遅延見込み' : '運行見込み'}
                        </span>
                    </div>
                    <Badge
                        variant={busProb >= 50 ? 'danger' : busProb >= 40 ? 'warning' : 'info'}
                        size="sm"
                    >
                        リスク: {busProb}%
                    </Badge>
                </div>
            </div>

            {isBusRecommended && (
                <div className="mt-3 text-xs bg-blue-100 text-blue-800 p-2 rounded flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>バスは現状運行できる見込みです。代替手段として検討してください。</span>
                </div>
            )}

            {busStatus === 'suspended' && (
                <div className="mt-3 text-xs bg-red-100 text-red-800 p-2 rounded flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>バスも運休リスクが高いです。移動自体の延期を検討してください。</span>
                </div>
            )}
        </div>
    );
}
