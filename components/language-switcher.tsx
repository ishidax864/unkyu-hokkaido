'use client';

import { useTranslation } from '@/lib/i18n';
import { LOCALE_LABELS } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/types';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const locales: Locale[] = ['ja', 'en', 'zh'];

const LOCALE_FLAGS: Record<Locale, string> = {
    ja: '🇯🇵',
    en: '🇺🇸',
    zh: '🇨🇳',
};

export function LanguageSwitcher() {
    const { locale, setLocale } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    // Pulse animation for first-time visitors to draw attention
    const [shouldPulse, setShouldPulse] = useState(() => {
        try {
            return !localStorage.getItem('unkyu-lang-used');
        } catch {
            return false;
        }
    });
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (l: Locale) => {
        setLocale(l);
        setIsOpen(false);
        setShouldPulse(false);
        localStorage.setItem('unkyu-lang-used', 'true');
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full 
                    bg-white/20 hover:bg-white/30 backdrop-blur-sm
                    border border-white/40 hover:border-white/60
                    text-white text-[13px] font-bold
                    transition-all duration-200 shadow-sm hover:shadow
                    ${shouldPulse ? 'animate-pulse' : ''}
                `}
                aria-label="言語を切り替え / Switch language / 切换语言"
            >
                <Globe className="w-4 h-4" />
                <span>{LOCALE_FLAGS[locale]}</span>
                <span className="hidden min-[375px]:inline">{LOCALE_LABELS[locale]}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 bg-[var(--card)] rounded-xl shadow-xl border border-[var(--border)] py-1.5 z-50 min-w-[140px] animate-[fadeInDown_0.15s_ease-out]">
                    {locales.map((l) => (
                        <button
                            key={l}
                            onClick={() => handleSelect(l)}
                            className={`w-full text-left px-4 py-2.5 text-[14px] flex items-center gap-3 hover:bg-gray-50 transition-colors ${locale === l ? 'font-bold text-[var(--primary)] bg-blue-50/50' : 'text-gray-700'
                                }`}
                        >
                            <span className="text-lg">{LOCALE_FLAGS[l]}</span>
                            <span>{LOCALE_LABELS[l]}</span>
                            {locale === l && (
                                <span className="ml-auto w-2 h-2 rounded-full bg-[var(--primary)]" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

