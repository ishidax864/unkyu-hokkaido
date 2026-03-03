import React, { useState } from 'react';
import { sendGAEvent } from '@next/third-parties/google';
import { ArrowUpDown, Calendar, Clock, Zap } from 'lucide-react';
import { Station, HOKKAIDO_STATIONS } from '@/lib/hokkaido-data';
import { StationSelector } from './station-selector';
import { useTranslation } from '@/lib/i18n';
import { getLocalizedStationName } from '@/lib/i18n/localized-names';

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

    const { t, locale } = useTranslation();

    const sn = (station: Station) => getLocalizedStationName(station, locale);

    const getQuickLabel = (dep: string, arr: string) => {
        const depSt = HOKKAIDO_STATIONS.find(s => s.id === dep);
        const arrSt = HOKKAIDO_STATIONS.find(s => s.id === arr);
        if (!depSt || !arrSt) return `${dep} → ${arr}`;
        return `${sn(depSt)} → ${sn(arrSt)}`;
    };

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
            setDepQuery(sn(depSt));
            setArrQuery(sn(arrSt));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* クイックルート選択 — モバイルで横スクロール */}
            <div>
                <div className="text-[11px] font-bold text-[var(--muted)] mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {t('search.quickRoutes')}
                </div>
                <div className="flex md:grid md:grid-cols-3 gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                    {QUICK_ROUTES.map(({ dep, arr, emoji }) => (
                        <button
                            key={`${dep}-${arr}`}
                            type="button"
                            onClick={() => handleQuickRoute(dep, arr)}
                            className={`text-[12px] py-2 px-3.5 md:px-2 rounded-full border transition-all text-center leading-tight whitespace-nowrap flex-shrink-0 ${departureStation?.id === dep && arrivalStation?.id === arr
                                ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-bold shadow-sm'
                                : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--muted)]'
                                }`}
                        >
                            <span className="inline md:block text-sm mr-1 md:mr-0 md:mb-0.5">{emoji}</span>
                            {getQuickLabel(dep, arr)}
                        </button>
                    ))}
                </div>
            </div>

            {/* 出発・到着駅選択 */}
            <div className="flex flex-col md:flex-row md:items-end md:gap-2 relative">
                <StationSelector
                    label={t('search.departure')}
                    selectedStation={departureStation}
                    isOpen={isDepartureOpen}
                    setIsOpen={setIsDepartureOpen}
                    setStation={setDepartureStation}
                    otherStation={arrivalStation}
                    query={depQuery}
                    setQuery={setDepQuery}
                    onInteract={() => setIsArrivalOpen(false)}
                />

                {/* Swap ボタン — 入力欄の境目にオーバーラップ */}
                <div className="flex items-center justify-center mt-0 -mb-3.5 z-10 md:my-0 md:pb-3">
                    <button
                        type="button"
                        onClick={() => {
                            setDepartureStation(arrivalStation);
                            setArrivalStation(departureStation);
                            setDepQuery(arrivalStation ? sn(arrivalStation) : '');
                            setArrQuery(departureStation ? sn(departureStation) : '');
                        }}
                        disabled={!departureStation && !arrivalStation}
                        className="group flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--primary-light)] hover:border-[var(--primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                        aria-label="出発駅と到着駅を入れ替える"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />
                    </button>
                </div>

                <StationSelector
                    label={t('search.arrival')}
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

            {/* 日付・時刻選択 — 統一フレーム */}
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-0">
                    <label className="section-label flex items-center gap-1 mb-0 pl-1">
                        <Calendar className="w-3 h-3" />
                        {t('search.date')}
                    </label>
                    <label className="section-label flex items-center gap-1 mb-0 pl-3">
                        <Clock className="w-3 h-3" />
                        {t('search.time')}
                    </label>
                </div>
                <div className={`flex items-center rounded-lg border ${!isDateValid(date) ? 'border-red-400 bg-red-50/30' : 'border-[var(--border)] bg-[var(--card)]'} overflow-hidden transition-colors`}>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        onKeyDown={(e) => e.preventDefault()}
                        min={new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date())}
                        max={(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
                        })()}
                        className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm font-bold text-[var(--foreground)] outline-none"
                    />
                    <div className="w-px h-6 bg-[var(--border)] shrink-0" />
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm font-bold text-[var(--foreground)] outline-none"
                    />
                </div>
                {!isDateValid(date) && (
                    <p className="text-[11px] text-red-500">※1週間以内の日付を選択してください</p>
                )}
            </div>

            {/* 予測ボタン */}
            <button
                type="submit"
                disabled={!departureStation || !arrivalStation || !isDateValid(date) || isLoading}
                className="w-full btn-primary py-3.5 text-[14px] font-bold disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('search.searching')}
                    </span>
                ) : (
                    t('search.searchButton')
                )}
            </button>
        </form>
    );
}
