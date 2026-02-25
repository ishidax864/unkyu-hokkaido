'use client';

import { useRef, useEffect } from 'react';
import { Station, HOKKAIDO_STATIONS } from '@/lib/hokkaido-data';
import { MapPin, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getLocalizedStationName, getLocalizedRegion } from '@/lib/i18n/localized-names';

interface StationSelectorProps {
    label: string;
    selectedStation: Station | null;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    setStation: (station: Station | null) => void;
    otherStation: Station | null;
    query: string;
    setQuery: (q: string) => void;
    onInteract?: () => void; // 他のセレクターを閉じる等のコールバック用
}

export function StationSelector({
    label,
    selectedStation,
    isOpen,
    setIsOpen,
    setStation,
    otherStation,
    query,
    setQuery,
    onInteract
}: StationSelectorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { locale, t } = useTranslation();

    const sn = (station: Station) => getLocalizedStationName(station, locale);

    // クリック外検知
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setIsOpen]);

    // フィルタリングロジック
    const filtered = query.trim()
        ? HOKKAIDO_STATIONS.filter(s =>
            s.name.includes(query) ||
            s.kana.includes(query) ||
            s.id.includes(query.toLowerCase()) ||
            (s.name_en && s.name_en.toLowerCase().includes(query.toLowerCase()))
        )
        : HOKKAIDO_STATIONS;

    // 主要駅とその他のグループ化 (UI改善)
    const majorStations = filtered.filter(s => s.isMajor);
    const otherStations = filtered.filter(s => !s.isMajor);

    const groups: { title: string; stations: Station[] }[] = [];

    // 1. 主要駅グループを最上部に
    if (majorStations.length > 0) {
        groups.push({ title: locale === 'en' ? 'Major Stations' : locale === 'zh' ? '主要车站' : '主要駅', stations: majorStations });
    }

    // 2. 地域ごとにグループ化（主要駅以外）
    const regionalMap = new Map<string, Station[]>();
    // 並び順を安定させるための地域順序
    const regionOrder = ['道央', '道北', '道東', '道南'];

    otherStations.forEach(s => {
        const group = regionalMap.get(s.region) || [];
        group.push(s);
        regionalMap.set(s.region, group);
    });

    regionOrder.forEach(region => {
        const stations = regionalMap.get(region);
        if (stations && stations.length > 0) {
            const areaLabel = locale === 'en' ? 'Area' : locale === 'zh' ? '区域' : 'エリア';
            groups.push({ title: `${getLocalizedRegion(region, locale)} ${areaLabel}`, stations });
        }
    });

    // 定義外の地域があれば追加
    Array.from(regionalMap.entries()).forEach(([region, stations]) => {
        if (!regionOrder.includes(region)) {
            const areaLabel = locale === 'en' ? 'Area' : locale === 'zh' ? '区域' : 'エリア';
            groups.push({ title: `${getLocalizedRegion(region, locale)} ${areaLabel}`, stations });
        }
    });

    const handleFocusOrChange = () => {
        setIsOpen(true);
        if (onInteract) onInteract();
    };

    return (
        <div className="relative flex-1" ref={containerRef}>
            <label className="section-label flex items-center justify-between">
                {label}
                {selectedStation && (
                    <button
                        type="button"
                        onClick={() => {
                            setStation(null);
                            setQuery('');
                        }}
                        className="text-[11px] text-[var(--primary)] font-bold hover:underline"
                    >
                        {locale === 'en' ? 'Reset' : locale === 'zh' ? '重置' : 'リセット'}
                    </button>
                )}
            </label>

            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    <MapPin className={`w-4 h-4 transition-colors ${selectedStation ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`} />
                </div>

                <input
                    type="text"
                    placeholder={selectedStation ? sn(selectedStation) : t('search.stationSearch')}
                    value={query || (selectedStation ? sn(selectedStation) : '')}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setStation(null);
                        handleFocusOrChange();
                    }}
                    onFocus={handleFocusOrChange}
                    className={`w-full input-field pl-9 pr-10 py-3 text-lg font-black transition-all
                        ${selectedStation ? 'bg-blue-50/30 border-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]' : 'bg-white'}
                    `}
                />

                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen && onInteract) onInteract();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <>
                    {/* Mobile: fullscreen modal overlay */}
                    <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col animate-[fadeInDown_0.15s_ease-out]">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background-secondary)]">
                            <h3 className="text-base font-bold">{label}</h3>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-sm text-[var(--primary)] font-bold px-3 py-1"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                        {/* Search input */}
                        <div className="px-4 py-2 border-b border-[var(--border)]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                                <input
                                    type="text"
                                    placeholder={t('search.stationSearch')}
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setStation(null);
                                    }}
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2.5 text-base border border-[var(--border)] rounded-lg"
                                />
                            </div>
                        </div>
                        {/* Station list */}
                        <div className="flex-1 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Search className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-20" />
                                    <p className="text-sm text-[var(--muted)]">{t('search.noResults')}</p>
                                </div>
                            ) : (
                                groups.map(({ title, stations }) => (
                                    <div key={title}>
                                        <div className="px-4 py-2 text-[11px] font-black text-[var(--muted)] bg-[var(--background-secondary)]/50 sticky top-0 backdrop-blur-md flex items-center gap-2">
                                            <div className={`w-1 h-3 rounded-full ${title.includes('主要') || title.includes('Major') ? 'bg-[var(--primary)]' : 'bg-gray-300'}`} />
                                            {title}
                                        </div>
                                        {stations.map((station) => {
                                            const isSelected = selectedStation?.id === station.id;
                                            const isDisabled = otherStation?.id === station.id;
                                            return (
                                                <button
                                                    key={station.id}
                                                    type="button"
                                                    disabled={isDisabled}
                                                    onClick={() => {
                                                        setStation(station);
                                                        setQuery(sn(station));
                                                        setIsOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors
                                                        ${isDisabled
                                                            ? 'opacity-30 cursor-not-allowed grayscale'
                                                            : isSelected
                                                                ? 'bg-blue-50 text-[var(--primary)]'
                                                                : 'hover:bg-gray-50 active:bg-gray-100'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${station.isMajor ? 'bg-[var(--primary)]' : 'bg-gray-300'}`} />
                                                        <div>
                                                            <div className={`text-base font-bold ${station.isMajor ? 'text-[var(--foreground)]' : 'text-gray-700'}`}>
                                                                {sn(station)}
                                                            </div>
                                                            <div className="text-[11px] text-[var(--muted)] font-medium">
                                                                {locale === 'ja' ? station.kana : station.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Desktop: regular dropdown */}
                    <div
                        className="hidden md:block absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-[var(--border)] rounded-xl shadow-xl backdrop-blur-sm border-t-0 animate-[fadeInDown_0.15s_ease-out]"
                    >
                        {filtered.length === 0 ? (
                            <div className="p-8 text-center">
                                <Search className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-20" />
                                <p className="text-sm text-[var(--muted)]">{t('search.noResults')}</p>
                            </div>
                        ) : (
                            groups.map(({ title, stations }) => (
                                <div key={title}>
                                    <div className="px-3 py-1.5 text-[11px] font-black text-[var(--muted)] bg-[var(--background-secondary)]/50 sticky top-0 backdrop-blur-md flex items-center gap-2">
                                        <div className={`w-1 h-3 rounded-full ${title.includes('主要') || title.includes('Major') ? 'bg-[var(--primary)]' : 'bg-gray-300'}`} />
                                        {title}
                                    </div>
                                    {stations.map((station) => {
                                        const isSelected = selectedStation?.id === station.id;
                                        const isDisabled = otherStation?.id === station.id;
                                        return (
                                            <button
                                                key={station.id}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => {
                                                    setStation(station);
                                                    setQuery(sn(station));
                                                    setIsOpen(false);
                                                }}
                                                className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors
                                                        ${isDisabled
                                                        ? 'opacity-30 cursor-not-allowed grayscale'
                                                        : isSelected
                                                            ? 'bg-blue-50 text-[var(--primary)]'
                                                            : 'hover:bg-gray-50'
                                                    }
                                                    `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${station.isMajor ? 'bg-[var(--primary)]' : 'bg-gray-300'}`} />
                                                    <div>
                                                        <div className={`text-base font-bold ${station.isMajor ? 'text-[var(--foreground)]' : 'text-gray-700'}`}>
                                                            {sn(station)}
                                                        </div>
                                                        <div className="text-[11px] text-[var(--muted)] font-medium">
                                                            {locale === 'ja' ? station.kana : station.name}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
