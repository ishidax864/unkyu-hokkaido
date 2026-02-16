'use client';

import { useState } from 'react';
import {
    AlertOctagon,
    Clock,
    Users,
    CheckCircle,
    MessageSquare,
    ThumbsUp,
    Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendGAEvent } from '@next/third-parties/google'; // 🆕

interface ReportButtonsProps {
    routeId: string;
    routeName: string;
    onReport: (type: ReportType, comment?: string) => void;
    counts?: {
        stopped: number;
        delayed: number;
        crowded: number;
        resumed: number;
    };
}

type ReportType = 'stopped' | 'delayed' | 'crowded' | 'normal';

const REPORT_OPTIONS = [
    { type: 'stopped' as const, label: '止まっている', icon: AlertOctagon, className: 'status-suspended' },
    { type: 'delayed' as const, label: '遅延している', icon: Clock, className: 'status-warning' },
    { type: 'crowded' as const, label: '混雑している', icon: Users, className: 'bg-orange-50 text-orange-600 border-orange-200' },
    { type: 'normal' as const, label: '平常運転', icon: CheckCircle, className: 'status-normal' },
];

export function ReportButtons({ routeId, routeName, onReport, counts }: ReportButtonsProps) {
    const [selectedType, setSelectedType] = useState<ReportType | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleTypeSelect = (type: ReportType) => {
        if (selectedType === type) {
            setSelectedType(null);
        } else {
            setSelectedType(type);
        }
    };

    const handleSubmit = async () => {
        if (!selectedType) return;

        setIsSubmitting(true);
        // 🆕 GA4イベント送信
        sendGAEvent('event', 'report_submit', {
            report_type: selectedType,
            route_name: routeName,
            has_comment: (!!comment).toString()
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        onReport(selectedType, comment || undefined);
        setIsSubmitting(false);
        setSubmitted(true);

        setTimeout(() => {
            setSubmitted(false);
            setSelectedType(null);
            setComment('');
        }, 3000);
    };

    return (
        <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-[var(--muted)]" />
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                    {routeName}の状況を報告
                </span>
            </div>

            {/* 報告ボタン群 */}
            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                <div className="text-xs font-bold text-blue-800 mb-2 text-center">
                    今の状況をみんなにシェアしよう！
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {REPORT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isSelected = selectedType === option.type;

                        // バッジ表示用のカウントを取得
                        let count = 0;
                        if (counts) {
                            if (option.type === 'stopped') count = counts.stopped;
                            if (option.type === 'delayed') count = counts.delayed;
                            if (option.type === 'crowded') count = counts.crowded;
                            if (option.type === 'normal') count = counts.resumed;
                        }

                        return (
                            <button
                                key={option.type}
                                onClick={() => handleTypeSelect(option.type)}
                                disabled={isSubmitting || submitted}
                                className={cn(
                                    'relative flex items-center justify-center gap-2 px-3 py-3 rounded-md border transition-all text-sm font-bold shadow-sm',
                                    isSelected
                                        ? option.className
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 hover:shadow-md',
                                    (isSubmitting || submitted) && 'opacity-60 cursor-not-allowed'
                                )}
                            >
                                <Icon className={cn("w-4 h-4", isSelected ? "" : "text-gray-400")} />
                                {option.label}

                                {/* カウントバッジ */}
                                {count > 0 && (
                                    <span className={cn(
                                        "absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold rounded-full border shadow-sm px-1 z-10",
                                        option.type === 'stopped' ? "bg-red-500 text-white border-red-600" :
                                            option.type === 'delayed' ? "bg-yellow-500 text-white border-yellow-600" :
                                                option.type === 'crowded' ? "bg-orange-500 text-white border-orange-600" :
                                                    option.type === 'normal' ? "bg-green-500 text-white border-green-600" :
                                                        "bg-gray-500 text-white"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 報告完了メッセージ */}
            {submitted && (
                <div className="flex items-center justify-center gap-2 text-[var(--status-normal)] py-2 mb-1 animate-in fade-in slide-in-from-top-1">
                    <ThumbsUp className="w-5 h-5" />
                    <span className="font-bold">報告ありがとうございます！</span>
                </div>
            )}

            {/* コメント入力 */}
            {selectedType && !submitted && (
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="状況を詳しく教えてください（任意）"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full input-field px-3 py-2.5 text-sm"
                        maxLength={100}
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                送信中...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                報告を送信
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
