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
                <span className="text-sm font-medium">
                    {routeName}の状況を報告
                </span>
            </div>

            {/* 報告ボタン群 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {REPORT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedType === option.type;

                    // バッジ表示用のカウントを取得
                    let count = 0;
                    if (counts) {
                        if (option.type === 'stopped') count = counts.stopped;
                        if (option.type === 'normal') count = counts.resumed;
                    }

                    return (
                        <button
                            key={option.type}
                            onClick={() => handleTypeSelect(option.type)}
                            disabled={isSubmitting || submitted}
                            className={cn(
                                'relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border transition-colors text-sm font-medium',
                                isSelected
                                    ? option.className
                                    : 'bg-white border-[var(--border)] text-[var(--muted)] hover:bg-[var(--background-secondary)]',
                                (isSubmitting || submitted) && 'opacity-60 cursor-not-allowed'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {option.label}

                            {/* カウントバッジ */}
                            {count > 0 && (
                                <span className={cn(
                                    "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full border shadow-sm px-1",
                                    option.type === 'stopped' ? "bg-red-500 text-white border-red-600" :
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
                        className="w-full input-field px-3 py-2 text-sm"
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
