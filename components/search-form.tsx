import React, { useState } from 'react';
import { sendGAEvent } from '@next/third-parties/google';
import { ArrowRight, Calendar, Clock, PlayCircle, Timer, Zap } from 'lucide-react';
import { Station, HOKKAIDO_STATIONS } from '@/lib/hokkaido-data';
import { StationSelector } from './station-selector';

interface SearchFormProps {
    onSearch: (
        departureId: string,
        arrivalId: string,
        date: string,
        time: string,
        timeType: 'departure' | 'arrival'
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
    timeType: 'departure' | 'arrival';
    setTimeType: (type: 'departure' | 'arrival') => void;
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
    timeType,
    setTimeType,
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
                time: time,
                timeType: timeType
            });
            onSearch(departureStation.id, arrivalStation.id, date, time, timeType);
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
        setTimeType('departure');

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
            onSearch(departureStation.id, arrivalStation.id, dateStr, timeStr, 'departure');
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
                            className={`text-[11px] py-2 px-1 rounded-md border transition-all text-center leading-tight ${departureStation?.id === dep && arrivalStation?.id === arr
                                ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-bold'
                                : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-gray-50 text-gray-600'
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

                <div className="hidden md:flex items-center justify-center py-0.5 z-10 md:my-0 md:pb-3">
                    <ArrowRight className="w-4 h-4 text-[var(--muted)] rotate-90 md:rotate-0" />
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
                            className={`w-full input-field p-3 text-lg font-bold ${!isDateValid(date) ? 'border-red-500 bg-red-50' : ''}`}
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
                        <div className="flex bg-[var(--background-secondary)] rounded-md border border-[var(--border)] p-1 mb-2">
                            <button
                                type="button"
                                onClick={() => setTimeType('departure')}
                                className={`flex-1 text-xs py-1.5 rounded flex items-center justify-center gap-1 ${timeType === 'departure' ? 'bg-white shadow-sm font-medium' : 'text-[var(--muted)]'}`}
                            >
                                <PlayCircle className="w-3 h-3" />
                                出発
                            </button>
                            <button
                                type="button"
                                onClick={() => setTimeType('arrival')}
                                className={`flex-1 text-xs py-1.5 rounded flex items-center justify-center gap-1 ${timeType === 'arrival' ? 'bg-white shadow-sm font-medium' : 'text-[var(--muted)]'}`}
                            >
                                <Timer className="w-3 h-3" />
                                到着
                            </button>
                        </div>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full input-field p-3 text-lg font-bold"
                        />
                    </div>
                </div>

                {/* 🆕 現在ボタン — 駅選択状態に応じてラベル変更 */}
                <button
                    type="button"
                    onClick={setCurrentDateTime}
                    disabled={!departureStation || !arrivalStation}
                    className={`w-full py-3 text-sm flex items-center justify-center gap-2 rounded-md font-medium transition-all ${departureStation && arrivalStation
                        ? 'bg-[var(--primary)] text-white hover:opacity-90 shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {departureStation && arrivalStation
                        ? <><Zap className="w-4 h-4" /> この区間を今すぐ予測</>
                        : '📍 出発駅・到着駅を選択してください'
                    }
                </button>
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
                className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
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
