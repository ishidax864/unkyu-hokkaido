'use client';

import { useRef, useEffect } from 'react';
import { Station, HOKKAIDO_STATIONS } from '@/lib/hokkaido-data';
import { MapPin, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
            s.id.includes(query.toLowerCase())
        )
        : HOKKAIDO_STATIONS;

    // 地域ごとにグループ化
    const filteredByRegion = new Map<string, Station[]>();
    filtered.forEach(s => {
        const group = filteredByRegion.get(s.region) || [];
        group.push(s);
        filteredByRegion.set(s.region, group);
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
                        className="text-[10px] text-[var(--primary)] font-bold hover:underline"
                    >
                        リセット
                    </button>
                )}
            </label>

            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    <MapPin className={`w-4 h-4 transition-colors ${selectedStation ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`} />
                </div>

                <input
                    type="text"
                    placeholder={selectedStation ? selectedStation.name : "駅名を入力"}
                    value={query || (selectedStation ? selectedStation.name : '')}
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

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-[var(--border)] rounded-xl shadow-xl backdrop-blur-sm border-t-0"
                    >
                        {filtered.length === 0 ? (
                            <div className="p-8 text-center">
                                <Search className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-20" />
                                <p className="text-sm text-[var(--muted)]">駅が見つかりませんでした</p>
                            </div>
                        ) : (
                            Array.from(filteredByRegion.entries()).map(([region, stations]) => (
                                <div key={region}>
                                    <div className="px-3 py-1.5 text-[10px] font-black text-[var(--muted)] bg-[var(--background-secondary)]/50 sticky top-0 backdrop-blur-md">
                                        {region}エリア
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
                                                    setQuery(station.name);
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
                                                            {station.name}
                                                        </div>
                                                        <div className="text-[10px] text-[var(--muted)] font-medium">
                                                            {station.kana}
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
