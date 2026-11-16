'use client';

import { useId, useRef, useState, useEffect } from 'react';
import { HOKKAIDO_STATIONS } from '@/lib/hokkaido-data';

/** 駅の選択(かな・ローマ字でも検索可、キーボード操作対応のコンボボックス) */
export function StationPicker({ label, value, onChange, exclude, marker }: {
    label: string; value: string; onChange: (id: string) => void; exclude?: string; marker: 'from' | 'to';
}) {
    const id = useId();
    const ref = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const selected = HOKKAIDO_STATIONS.find(s => s.id === value);
    const q = query.trim().toLowerCase();
    const options = HOKKAIDO_STATIONS
        .filter(s => s.id !== exclude && (!q || `${s.name} ${s.kana} ${s.name_en ?? ''} ${s.id}`.toLowerCase().includes(q)))
        .sort((a, b) => Number(!!b.isMajor) - Number(!!a.isMajor))
        .slice(0, 40);
    const choose = (index: number) => {
        const station = options[index];
        if (!station) return;
        onChange(station.id); setOpen(false); setQuery('');
    };
    useEffect(() => {
        const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    useEffect(() => {
        if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
    }, [active, open, id]);

    return <div className="relative" ref={ref}>
        <label htmlFor={id} className="flex min-h-14 cursor-text items-center gap-3 px-4">
            <span aria-hidden className={marker === 'from'
                ? 'size-3 shrink-0 rounded-full border-[3px] border-brand bg-surface'
                : 'size-3 shrink-0 rounded-sm bg-brand'} />
            <span className="w-14 shrink-0 text-sm font-bold text-ink-3">{label}</span>
            <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open}
                aria-controls={`${id}-list`} aria-activedescendant={open && options.length ? `${id}-opt-${active}` : undefined}
                autoComplete="off" placeholder="駅名・よみがな" value={open ? query : selected?.name ?? ''}
                className="min-w-0 flex-1 bg-transparent py-3 text-xl font-bold text-ink outline-none placeholder:text-base placeholder:font-normal placeholder:text-ink-3"
                onFocus={() => { setOpen(true); setQuery(''); setActive(0); }}
                onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true); }}
                onBlur={e => { if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
                onKeyDown={e => {
                    if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); return; }
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault(); setOpen(true);
                        setActive(i => Math.max(0, Math.min(options.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))));
                    }
                    if (e.key === 'Enter' && open) { e.preventDefault(); choose(active); }
                }} />
        </label>
        {open && <div id={`${id}-list`} role="listbox" aria-label={label}
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-card">
            {!options.length && <p className="px-3 py-3 text-ink-3">該当する駅が見つかりません</p>}
            {options.map((s, i) => <button type="button" role="option" aria-selected={i === active} tabIndex={-1}
                id={`${id}-opt-${i}`} key={s.id} onMouseDown={e => e.preventDefault()} onClick={() => choose(i)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left ${i === active ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}>
                <span className="font-bold">{s.name}<span className="ml-2 text-sm font-normal text-ink-3">{s.kana}</span></span>
                <span className="text-sm text-ink-3">{s.region}</span>
            </button>)}
        </div>}
    </div>;
}
