'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Locale } from './types';
import { DEFAULT_LOCALE } from './types';

import ja from './locales/ja.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dictionaries: Record<Locale, Record<string, any>> = { ja, en, zh };

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return typeof current === 'string' ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        try {
            const saved = localStorage.getItem('unkyu-locale') as Locale | null;
            if (saved && dictionaries[saved]) return saved;
        } catch {
            /* SSR or localStorage unavailable */
        }
        return DEFAULT_LOCALE;
    });

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('unkyu-locale', newLocale);
        document.documentElement.lang = newLocale === 'zh' ? 'zh-CN' : newLocale;
    }, []);

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        const dict = dictionaries[locale];
        let value = getNestedValue(dict as Record<string, unknown>, key);

        // Fallback to Japanese
        if (value === undefined) {
            value = getNestedValue(dictionaries.ja as Record<string, unknown>, key);
        }

        // Fallback to key name
        if (value === undefined) return key;

        // Parameter interpolation: {{name}} → value
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
            }
        }

        return value;
    }, [locale]);

    const contextValue = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within LanguageProvider');
    }
    return context;
}
