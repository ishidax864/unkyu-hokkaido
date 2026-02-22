'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'unkyu-favorite-routes';

export interface FavoriteRoute {
    routeId: string;
    routeName: string;
    addedAt: string;
}

/**
 * お気に入りルートを localStorage で管理するフック
 */
export function useFavoriteRoutes() {
    const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);

    // 初回ロード
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch {
            // localStorageが使えない環境
        }
    }, []);

    // localStorage への保存
    const saveFavorites = useCallback((newFavorites: FavoriteRoute[]) => {
        setFavorites(newFavorites);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
        } catch {
            // quota exceeded等
        }
    }, []);

    const addFavorite = useCallback((routeId: string, routeName: string) => {
        setFavorites(prev => {
            if (prev.some(f => f.routeId === routeId)) return prev;
            const updated = [...prev, { routeId, routeName, addedAt: new Date().toISOString() }];
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch { /* noop */ }
            return updated;
        });
    }, []);

    const removeFavorite = useCallback((routeId: string) => {
        setFavorites(prev => {
            const updated = prev.filter(f => f.routeId !== routeId);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch { /* noop */ }
            return updated;
        });
    }, []);

    const toggleFavorite = useCallback((routeId: string, routeName: string) => {
        setFavorites(prev => {
            const exists = prev.some(f => f.routeId === routeId);
            const updated = exists
                ? prev.filter(f => f.routeId !== routeId)
                : [...prev, { routeId, routeName, addedAt: new Date().toISOString() }];
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch { /* noop */ }
            return updated;
        });
    }, []);

    const isFavorite = useCallback((routeId: string) => {
        return favorites.some(f => f.routeId === routeId);
    }, [favorites]);

    return {
        favorites,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        isFavorite,
        saveFavorites,
    };
}
