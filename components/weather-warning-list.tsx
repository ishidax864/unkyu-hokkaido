import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { WeatherWarning } from '@/lib/types';

interface WarningGroup {
    area: string;
    warnings: WeatherWarning[];
}

interface WeatherWarningListProps {
    warnings: WarningGroup[];
    isLoading?: boolean;
}

export function WeatherWarningList({ warnings, isLoading }: WeatherWarningListProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="bg-gray-100 p-3 rounded-md mb-4 animate-pulse h-[52px]">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-200 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-2 bg-gray-200 rounded w-1/4" />
                    </div>
                </div>
            </div>
        );
    }

    if (!warnings || warnings.length === 0) return null;

    // 警報の総数
    const totalWarnings = warnings.reduce((acc, curr) => acc + curr.warnings.length, 0);

    // 優先度の高い警報（警報 > 注意報）
    const highPriorityWarnings = warnings.flatMap(group =>
        group.warnings.filter(w => w.type.includes('警報')).map(w => `${group.area}: ${w.type}`)
    );

    return (
        <div className="status-suspended p-3 rounded-md mb-4">
            <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                aria-expanded={isOpen}
                aria-controls="warning-details"
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-black text-base flex items-center gap-2">
                            気象警報・注意報発令中
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                {totalWarnings}件
                            </span>
                        </div>
                        <div className="text-[11px] mt-0.5 font-medium opacity-80 uppercase tracking-tight">
                            {highPriorityWarnings.length > 0 ? (
                                <span>
                                    {highPriorityWarnings.slice(0, 2).join('、')}
                                    {highPriorityWarnings.length > 2 && ' など'}
                                </span>
                            ) : (
                                <span>詳細を確認してください</span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    className="text-[var(--primary)]"
                    aria-label={isOpen ? "詳細を閉じる" : "詳細を開く"}
                    aria-expanded={isOpen}
                >
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
            </div>

            {/* 詳細リスト（折りたたみ） */}
            {isOpen && (
                <div id="warning-details" className="mt-3 pt-3 border-t border-red-200/50 space-y-3">
                    {warnings.map((group, index) => (
                        <div key={index}>
                            <div className="text-xs font-bold mb-1 opacity-80">{group.area}</div>
                            <div className="space-y-1">
                                {group.warnings.map((w, i) => (
                                    <span
                                        key={i}
                                        className={`inline-block mr-2 text-xs px-2 py-1 rounded 
                                            ${w.type.includes('警報') ? 'bg-red-600 text-white' : 'bg-yellow-100 text-yellow-800'}
                                        `}
                                    >
                                        {w.type}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
