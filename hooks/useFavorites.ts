import { useState, useEffect } from 'react';

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
    const [favorites, setFavorites] = useState<FavoriteRoute[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    return JSON.parse(stored);
                }
            } catch (error) {
                console.error('Failed to load favorites', error);
            }
        }
        return [];
    });
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial load from localStorage — setState in useEffect is intentional here
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoaded(true);
    }, []);

    // Save to storage
    const saveFavorites = (newFavorites: FavoriteRoute[]) => {
        setFavorites(newFavorites);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
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
