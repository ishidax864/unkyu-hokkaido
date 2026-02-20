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
import { sendGAEvent } from '@next/third-parties/google';

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

function getConsensusSummary(counts: ReportButtonsProps['counts']): { text: string; type: 'stopped' | 'delayed' | 'crowded' | 'normal' | null } | null {
    if (!counts) return null;
    const total = counts.stopped + counts.delayed + counts.crowded + counts.resumed;
    if (total === 0) return null;

    // Find the dominant report type
    const max = Math.max(counts.stopped, counts.delayed, counts.crowded, counts.resumed);
    if (max < 1) return null;

    if (counts.stopped === max && counts.stopped >= 1) {
        return { text: `${counts.stopped}人が「止まっている」と報告`, type: 'stopped' };
    }
    if (counts.delayed === max && counts.delayed >= 1) {
        return { text: `${counts.delayed}人が「遅延している」と報告`, type: 'delayed' };
    }
    if (counts.crowded === max && counts.crowded >= 1) {
        return { text: `${counts.crowded}人が「混雑している」と報告`, type: 'crowded' };
    }
    if (counts.resumed === max && counts.resumed >= 1) {
        return { text: `${counts.resumed}人が「平常運転」と報告`, type: 'normal' };
    }
    return null;
}

export function ReportButtons({ routeId: _routeId, routeName, onReport, counts }: ReportButtonsProps) {
    const [selectedType, setSelectedType] = useState<ReportType | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const consensus = getConsensusSummary(counts);
    const totalReports = counts ? (counts.stopped + counts.delayed + counts.crowded + counts.resumed) : 0;

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
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-gray-800">
                        みんなのリアルタイム報告
                    </span>
                </div>
                {totalReports > 0 && (
                    <span className="text-[10px] font-medium text-gray-400">
                        直近2時間: {totalReports}件
                    </span>
                )}
            </div>

            {/* Consensus Summary — The key feedback to other users */}
            {consensus && (
                <div className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-xs font-bold border",
                    consensus.type === 'stopped' ? 'bg-red-50 text-red-700 border-red-200' :
                        consensus.type === 'delayed' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            consensus.type === 'crowded' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200'
                )}>
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{consensus.text}</span>
                </div>
            )}

            {/* Report Buttons */}
            <div className="rounded-lg p-3 border border-gray-100 bg-gray-50/50">
                <div className="text-[10px] font-medium text-gray-500 mb-2 text-center">
                    あなたの報告が他のユーザーの判断を助けます
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {REPORT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isSelected = selectedType === option.type;

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

                                {/* Count Badge */}
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

            {/* Submitted Feedback */}
            {submitted && (
                <div className="flex items-center justify-center gap-2 text-[var(--status-normal)] py-2 mb-1 animate-in fade-in slide-in-from-top-1">
                    <ThumbsUp className="w-5 h-5" />
                    <span className="font-bold">報告ありがとうございます！</span>
                </div>
            )}

            {/* Comment Input */}
            {selectedType && !submitted && (
                <div className="space-y-3 mt-3">
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
