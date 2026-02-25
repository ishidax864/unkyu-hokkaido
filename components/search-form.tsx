import React, { useState } from 'react';
import { sendGAEvent } from '@next/third-parties/google';
import { ArrowRight, ArrowUpDown, Calendar, Clock, Zap } from 'lucide-react';
import { Station, HOKKAIDO_STATIONS } from '@/lib/hokkaido-data';
import { StationSelector } from './station-selector';

interface SearchFormProps {
    onSearch: (
        departureId: string,
        arrivalId: string,
        date: string,
        time: string
    ) => void;
    isLoading?: boolean;
    // Controlled props
    departureStation: Station | null;
    setDepartureStation: (station: Station | null) => void;
    arrivalStation: Station | null;
    setArrivalStation: (station: Station | null) => void;
    date: string;
    setDate: (date: string) => void;
    time: string;
    setTime: (time: string) => void;

}

// 人気ルートプリセット（コンポーネント外に定義して毎レンダーの再生成を回避）
const QUICK_ROUTES = [
    { dep: 'sapporo', arr: 'shin-chitose-airport', label: '札幌 → 空港', emoji: '✈️' },
    { dep: 'sapporo', arr: 'otaru', label: '札幌 → 小樽', emoji: '🏔️' },
    { dep: 'sapporo', arr: 'asahikawa', label: '札幌 → 旭川', emoji: '🚄' },
    { dep: 'sapporo', arr: 'obihiro', label: '札幌 → 帯広', emoji: '🌾' },
    { dep: 'sapporo', arr: 'hakodate', label: '札幌 → 函館', emoji: '🏯' },
    { dep: 'sapporo', arr: 'kutchan', label: '札幌 → 倶知安', emoji: '⛷️' },
] as const;

export function SearchForm({
    onSearch,
    isLoading,
    departureStation,
    setDepartureStation,
    arrivalStation,
    setArrivalStation,
    date,
    setDate,
    time,
    setTime,

}: SearchFormProps) {
    const [isDepartureOpen, setIsDepartureOpen] = useState(false);
    const [isArrivalOpen, setIsArrivalOpen] = useState(false);
    const [depQuery, setDepQuery] = useState('');
    const [arrQuery, setArrQuery] = useState('');
    const [showError, setShowError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (departureStation && arrivalStation) {
            sendGAEvent('event', 'search_prediction', {
                departure: departureStation.name,
                arrival: arrivalStation.name,
                date: date,
                time: time
            });
            onSearch(departureStation.id, arrivalStation.id, date, time);
        }
    };

    const setCurrentDateTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const timeStr = now.toTimeString().slice(0, 5);

        setDate(dateStr);
        setTime(timeStr);


        sendGAEvent('event', 'search_current_location', {
            is_valid_search: (!!departureStation && !!arrivalStation).toString()
        });

        if (departureStation) setDepQuery(departureStation.name);
        if (arrivalStation) setArrQuery(arrivalStation.name);

        if (departureStation && arrivalStation) {
            sendGAEvent('event', 'search_prediction', {
                departure: departureStation.name,
                arrival: arrivalStation.name,
                date: dateStr,
                time: timeStr,
                timeType: 'departure',
                trigger: 'current_btn'
            });
            onSearch(departureStation.id, arrivalStation.id, dateStr, timeStr);
            setShowError(false);
        } else {
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        }
    };

    // バリデーション：日付が範囲内か
    const isDateValid = (dateStr: string) => {
        if (!dateStr) return false;
        const selected = new Date(dateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const min = new Date(now);
        const max = new Date(now);
        max.setDate(max.getDate() + 7);

        return selected >= min && selected <= max;
    };

    const handleQuickRoute = (dep: string, arr: string) => {
        const depSt = HOKKAIDO_STATIONS.find(s => s.id === dep);
        const arrSt = HOKKAIDO_STATIONS.find(s => s.id === arr);
        if (depSt && arrSt) {
            setDepartureStation(depSt);
            setArrivalStation(arrSt);
            setDepQuery(depSt.name);
            setArrQuery(arrSt.name);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* 🆕 クイックルート選択 */}
            <div>
                <div className="text-[11px] font-bold text-[var(--muted)] mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    よく使うルート
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {QUICK_ROUTES.map(({ dep, arr, label, emoji }) => (
                        <button
                            key={`${dep}-${arr}`}
                            type="button"
                            onClick={() => handleQuickRoute(dep, arr)}
                            className={`text-[11px] py-2 px-1 rounded-lg border transition-all text-center leading-tight ${departureStation?.id === dep && arrivalStation?.id === arr
                                ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-bold'
                                : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--background-secondary)] text-[var(--muted)]'
                                }`}
                        >
                            <span className="block text-sm mb-0.5">{emoji}</span>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 出発・到着駅選択 */}
            <div className="flex flex-col md:flex-row md:items-end gap-0 md:gap-2 relative">
                <StationSelector
                    label="出発駅"
                    selectedStation={departureStation}
                    isOpen={isDepartureOpen}
                    setIsOpen={setIsDepartureOpen}
                    setStation={setDepartureStation}
                    otherStation={arrivalStation}
                    query={depQuery}
                    setQuery={setDepQuery}
                    onInteract={() => setIsArrivalOpen(false)}
                />

                {/* Swap ボタン + 矢印 */}
                <div className="flex items-center justify-center py-1 z-10 md:my-0 md:pb-3">
                    <button
                        type="button"
                        onClick={() => {
                            setDepartureStation(arrivalStation);
                            setArrivalStation(departureStation);
                            setDepQuery(arrivalStation?.name || '');
                            setArrQuery(departureStation?.name || '');
                        }}
                        disabled={!departureStation && !arrivalStation}
                        className="group flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--border)] bg-white hover:bg-[var(--primary-light)] hover:border-[var(--primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                        aria-label="出発駅と到着駅を入れ替える"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />
                        <span className="text-[11px] font-medium text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors">入替</span>
                    </button>
                </div>

                <StationSelector
                    label="到着駅"
                    selectedStation={arrivalStation}
                    isOpen={isArrivalOpen}
                    setIsOpen={setIsArrivalOpen}
                    setStation={setArrivalStation}
                    otherStation={departureStation}
                    query={arrQuery}
                    setQuery={setArrQuery}
                    onInteract={() => setIsDepartureOpen(false)}
                />
            </div>

            {/* 日付・時刻選択 */}
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="section-label flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            日付
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            onKeyDown={(e) => e.preventDefault()} // 🆕 手入力不可（年を数万年にする等のイタズラ防止）
                            min={new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date())}
                            max={(() => {
                                const d = new Date();
                                d.setDate(d.getDate() + 7);
                                return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
                            })()}
                            className={`w-full input-field p-3 text-base font-bold ${!isDateValid(date) ? 'border-red-500 bg-red-50' : ''}`}
                        />
                        {!isDateValid(date) && (
                            <p className="text-[11px] text-red-500 mt-1">※1週間以内の日付を選択してください</p>
                        )}
                    </div>
                    <div>
                        <label className="section-label flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3" />
                            時刻
                        </label>

                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full input-field p-3 text-base font-bold"
                        />
                    </div>
                </div>

                {!departureStation || !arrivalStation ? (
                    <p className="text-xs text-center text-[var(--muted)] py-2">
                        📍 出発駅・到着駅を選択してください
                    </p>
                ) : null}
                {showError && (
                    <p className="text-[11px] text-red-500 text-center animate-in fade-in slide-in-from-top-1 font-bold">
                        ※出発駅と到着駅を選択してください
                    </p>
                )}
            </div>

            {/* 予測ボタン */}
            <button
                type="submit"
                disabled={!departureStation || !arrivalStation || !isDateValid(date) || isLoading}
                className="w-full btn-primary py-3 text-[14px] font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        予測中...
                    </span>
                ) : (
                    '運休リスクを予測する'
                )}
            </button>
        </form>
    );
}
