export type Locale = 'ja' | 'en' | 'zh';

export const LOCALE_LABELS: Record<Locale, string> = {
    ja: '日本語',
    en: 'EN',
    zh: '中文',
};

export const DEFAULT_LOCALE: Locale = 'ja';
