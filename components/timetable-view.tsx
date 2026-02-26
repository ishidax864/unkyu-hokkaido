'use client';

import { useState, useMemo } from 'react';
import { Train, Clock, ChevronDown, ChevronUp, Lock, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { JRStatus } from '@/lib/types';
import timetableData from '@/data/timetable-sapporo-chitose.json';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface TimetableEntry {
    id: string;
    name: string;
    type: 'special_rapid' | 'rapid' | 'semi_rapid';
    dep: string;
    arr: string;
    duration: number;
}

interface TimetableViewProps {
    routeStatus: JRStatus;          // 路線全体のステータス
    rawStatusText?: string;         // 生テキスト（一部運休の列車番号パース用）
    isPremium?: boolean;            // 有料ユーザーか
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function getTypeLabel(type: string): { label: string; color: string; bg: string } {
    switch (type) {
        case 'special_rapid':
            return { label: '特快', color: 'text-purple-700', bg: 'bg-purple-100' };
        case 'semi_rapid':
            return { label: '区快', color: 'text-blue-600', bg: 'bg-blue-50' };
        default:
            return { label: '快速', color: 'text-emerald-700', bg: 'bg-emerald-50' };
    }
}

function getStatusBadge(
    routeStatus: JRStatus,
    _rawText?: string,
    _trainId?: string
): { label: string; icon: string; color: string; bg: string } {
    switch (routeStatus) {
        case 'suspended':
        case 'cancelled':
            return { label: '運休', icon: '❌', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
        case 'delay':
            return { label: '遅延', icon: '⚠️', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
        case 'partial':
            return { label: '一部運休', icon: '⚡', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' };
        default:
            return { label: '通常', icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    }
}

function getCurrentTimeMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

const FREE_VISIBLE_COUNT = 5;

export function TimetableView({ routeStatus, rawStatusText, isPremium = false }: TimetableViewProps) {
    const { t: _t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    const trains = timetableData.weekday as TimetableEntry[];
    const currentMinutes = getCurrentTimeMinutes();

    // Find the index of the closest upcoming train
    const nextTrainIndex = useMemo(() => {
        return trains.findIndex(train => timeToMinutes(train.dep) >= currentMinutes);
    }, [trains, currentMinutes]);

    // Show trains centered around current time, or start from beginning if expanded
    const displayTrains = useMemo(() => {
        if (isExpanded && isPremium) {
            return trains;
        }

        // Show a window of trains around current time
        const startIdx = Math.max(0, nextTrainIndex - 1);
        const count = isPremium ? 20 : FREE_VISIBLE_COUNT;
        return trains.slice(startIdx, startIdx + count);
    }, [trains, nextTrainIndex, isExpanded, isPremium]);

    const hasMoreTrains = isPremium && !isExpanded && displayTrains.length < trains.length;
    const statusBadge = getStatusBadge(routeStatus, rawStatusText);

    return (
        <section className="card p-4 mt-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Train className="w-4 h-4 text-[var(--primary)]" />
                    <h3 className="text-base font-black">時刻表</h3>
                    <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--background-secondary)] px-1.5 py-0.5 rounded">
                        札幌 → 新千歳空港
                    </span>
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg} ${statusBadge.color}`}>
                    <span>{statusBadge.icon}</span>
                    <span>{statusBadge.label}</span>
                </div>
            </div>

            {/* Train List */}
            <div className="space-y-0 relative">
                {displayTrains.map((train, index) => {
                    const isNextTrain = trains.indexOf(train) === nextTrainIndex;
                    const isPast = timeToMinutes(train.dep) < currentMinutes;
                    const typeInfo = getTypeLabel(train.type);
                    const trainStatus = getStatusBadge(routeStatus, rawStatusText, train.id);

                    return (
                        <div
                            key={train.id}
                            className={`
                                flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all
                                ${isNextTrain ? 'bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/20' : ''}
                                ${isPast ? 'opacity-40' : ''}
                                ${!isPremium && index >= FREE_VISIBLE_COUNT ? 'blur-[6px] select-none pointer-events-none' : ''}
                            `}
                        >
                            {/* Time */}
                            <div className="flex flex-col items-center w-12 shrink-0">
                                <span className={`text-[15px] font-black tabular-nums ${isNextTrain ? 'text-[var(--primary)]' : ''}`}>
                                    {train.dep}
                                </span>
                                <span className="text-[9px] text-[var(--muted)]">
                                    → {train.arr}
                                </span>
                            </div>

                            {/* Train type badge */}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${typeInfo.bg} ${typeInfo.color} shrink-0`}>
                                {typeInfo.label}
                            </span>

                            {/* Train name */}
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-[var(--foreground)] truncate block">
                                    {train.name}
                                </span>
                                <span className="text-[10px] text-[var(--muted)]">
                                    {train.duration}分
                                </span>
                            </div>

                            {/* Status badge */}
                            {routeStatus !== 'normal' && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${trainStatus.bg} ${trainStatus.color}`}>
                                    {trainStatus.icon} {trainStatus.label}
                                </span>
                            )}

                            {/* Next train indicator */}
                            {isNextTrain && (
                                <span className="text-[9px] font-black text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                                    NEXT
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Premium Gate */}
            {!isPremium && (
                <div className="relative mt-2">
                    {/* Gradient overlay */}
                    <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-[var(--card)] to-transparent pointer-events-none z-10" />

                    {/* CTA */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-center text-white shadow-lg">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-black">PRO で全時刻表を表示</span>
                        </div>
                        <p className="text-[11px] opacity-80 mb-3">
                            全{trains.length}便の時刻表 + リアルタイム運休マーク
                        </p>
                        <button
                            className="bg-white text-blue-700 font-black text-sm px-6 py-2.5 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
                            onClick={() => {
                                // TODO: Stripe checkout
                            }}
                        >
                            <Lock className="w-3.5 h-3.5" />
                            PRO にアップグレード
                        </button>
                    </div>
                </div>
            )}

            {/* Expand/Collapse for premium users */}
            {hasMoreTrains && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full mt-2 py-2 text-xs font-bold text-[var(--primary)] flex items-center justify-center gap-1 hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            折りたたむ
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            全{trains.length}便を表示
                        </>
                    )}
                </button>
            )}

            {/* Footer note */}
            <div className="mt-2 text-[9px] text-[var(--muted)] text-center opacity-60">
                <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                2026年2月時点のダイヤ · 次回改正: 2026/3/14
            </div>
        </section>
    );
}
