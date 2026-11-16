'use client';

import { useId, useRef, useState, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { HOKKAIDO_STATIONS } from '@/lib/hokkaido-data';

export function JourneyStationInput({ label, value, onChange, exclude }: {
    label: string; value: string; onChange: (id: string) => void; exclude: string;
}) {
    const id = useId();
    const ref = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const selected = HOKKAIDO_STATIONS.find(s => s.id === value);
    const options = HOKKAIDO_STATIONS.filter(s => s.id !== exclude &&
        (!query || `${s.name} ${s.kana} ${s.name_en} ${s.id}`.toLowerCase().includes(query.toLowerCase())))
        .sort((a, b) => Number(!!b.isMajor) - Number(!!a.isMajor));
    const choose = (index: number) => {
        if (!options[index]) return;
        onChange(options[index].id); setOpen(false); setQuery('');
    };
    useEffect(() => {
        const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    useEffect(() => {
        if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
    }, [active, open, id]);
    return <div className="journey-station" ref={ref}>
        <label htmlFor={id}>{label}</label>
        <div className="journey-station-field">
            <MapPin size={17} aria-hidden="true" />
            <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open}
                aria-controls={`${id}-options`} aria-activedescendant={open && options.length ? `${id}-option-${active}` : undefined}
                autoComplete="off" placeholder="駅名を選ぶ" value={open ? query : selected?.name || ''}
                onFocus={() => { setOpen(true); setQuery(''); setActive(0); }}
                onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true); }}
                onBlur={e => { if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
                onKeyDown={e => {
                    if (e.key === 'Escape') { setOpen(false); return; }
                    if (e.key === 'Tab') { setOpen(false); return; }
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault(); setOpen(true);
                        setActive(i => Math.max(0, Math.min(options.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))));
                    }
                    if (e.key === 'Enter' && open) { e.preventDefault(); choose(active); }
                }} />
            <ChevronDown size={16} aria-hidden="true" />
        </div>
        {open && <div className="journey-station-options" role="listbox" id={`${id}-options`} aria-label={label}>
            {!options.length && <p>該当する駅が見つかりません</p>}
            {options.map((station, i) => <button type="button" role="option" aria-selected={i === active}
                tabIndex={-1} id={`${id}-option-${i}`} key={station.id}
                onMouseDown={e => e.preventDefault()} onClick={() => choose(i)}>
                <span>{station.name}<small>{station.kana}</small></span><small>{station.region}</small>
            </button>)}
        </div>}
    </div>;
}
