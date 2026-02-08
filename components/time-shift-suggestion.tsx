import { Clock } from 'lucide-react';

interface TimeShiftSuggestionProps {
    time: string;
    risk: number;
    difference: number;
    isEarlier: boolean;
    onSelect: () => void;
}

/**
 * 時間シフト提案コンポーネント
 * ユーザーに最適な出発時間を提案する
 */
export function TimeShiftSuggestion({
    time,
    risk,
    difference,
    isEarlier,
    onSelect
}: TimeShiftSuggestionProps) {
    const label = isEarlier ? '早い時間の列車に変更' : '時間を遅らせる';
    const diffText = `通常より${Math.abs(difference)}%低い`;

    return (
        <div
            className="mb-4 cursor-pointer hover:bg-green-100 transition-colors p-3 bg-green-50 border border-green-200 rounded-md text-green-900 shadow-sm"
            onClick={onSelect}
        >
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
                <Clock className="w-4 h-4 text-green-700" />
                <span>{label}</span>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-green-300">
                    {time}発
                </span>
            </div>
            <div className="text-xs flex items-center gap-1.5 opacity-90">
                <span className="font-semibold">運休リスク {risk}%</span>
                <span className="text-green-700">({diffText})</span>
            </div>
        </div>
    );
}
