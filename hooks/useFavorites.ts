import { useState, useEffect } from 'react';
import { getStationById } from '@/lib/hokkaido-data';

const STORAGE_KEY = 'unkyu-ai-favorites';

export interface FavoriteRoute {
    id: string; // unique key, typically `${departureId}-${arrivalId}`
    departureId: string;
    arrivalId: string;
    departureName: string;
    arrivalName: string;
    createdAt: string;
}

export function useFavorites() {
    const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
    const [isLoaded, setLoaded] = useState(false);
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            // Hydrate optional browser storage after the server/initial render.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (Array.isArray(stored)) setFavorites(stored.filter(item => item && typeof item.id === 'string' && typeof item.departureId === 'string' && typeof item.arrivalId === 'string' && getStationById(item.departureId) && getStationById(item.arrivalId)));
        } catch { /* Stored routes are optional. */ }
        setLoaded(true);
    }, []);

    // Save to storage
    const saveFavorites = (newFavorites: FavoriteRoute[]) => {
        setFavorites(newFavorites);
        if (typeof window !== 'undefined') {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites)); } catch { /* Session-only when storage is unavailable. */ }
        }
    };

    const addFavorite = (departureId: string, arrivalId: string, departureName: string, arrivalName: string) => {
        const id = `${departureId}-${arrivalId}`;

        // Prevent duplicates
        if (favorites.some(f => f.id === id)) return;

        const newFavorite: FavoriteRoute = {
            id,
            departureId,
            arrivalId,
            departureName,
            arrivalName,
            createdAt: new Date().toISOString(),
        };

        // Add to top
        saveFavorites([newFavorite, ...favorites]);
    };

    const removeFavorite = (id: string) => {
        saveFavorites(favorites.filter(f => f.id !== id));
    };

    const isFavorite = (departureId: string, arrivalId: string) => {
        const id = `${departureId}-${arrivalId}`;
        return favorites.some(f => f.id === id);
    };

    return {
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        isLoaded,
    };
}
