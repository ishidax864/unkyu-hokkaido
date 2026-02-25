import type { Station, Route } from '@/lib/types';
import type { Locale } from './types';

/**
 * Get the localized name for a station based on current locale
 */
export function getLocalizedStationName(station: Station, locale: Locale): string {
    switch (locale) {
        case 'en':
            return station.name_en || station.name;
        case 'zh':
            return station.name_zh || station.name;
        default:
            return station.name;
    }
}

/**
 * Get the localized name for a route based on current locale
 */
export function getLocalizedRouteName(route: Route, locale: Locale): string {
    switch (locale) {
        case 'en':
            return route.name_en || route.name;
        case 'zh':
            return route.name_zh || route.name;
        default:
            return route.name;
    }
}

/**
 * Get the localized region name
 */
export function getLocalizedRegion(region: string, locale: Locale): string {
    const regionMap: Record<string, Record<Locale, string>> = {
        '道央': { ja: '道央', en: 'Central', zh: '道央' },
        '道北': { ja: '道北', en: 'Northern', zh: '道北' },
        '道東': { ja: '道東', en: 'Eastern', zh: '道东' },
        '道南': { ja: '道南', en: 'Southern', zh: '道南' },
    };
    return regionMap[region]?.[locale] || region;
}
