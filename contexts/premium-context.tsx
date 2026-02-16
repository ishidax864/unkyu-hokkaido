'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PremiumContextType {
    isPremium: boolean;
    upgrade: () => void;
    downgrade: () => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
    const [isPremium, setIsPremium] = useState(false);

    // Mock persistence
    useEffect(() => {
        const saved = localStorage.getItem('unkyu_is_premium');
        // eslint-disable-next-line
        if (saved === 'true') setIsPremium(true);
    }, []);

    const upgrade = () => {
        setIsPremium(true);
        localStorage.setItem('unkyu_is_premium', 'true');
        // In real app, redirect to Stripe
        alert('プレミアムプランにアップグレードしました！（デモ）');
    };

    const downgrade = () => {
        setIsPremium(false);
        localStorage.removeItem('unkyu_is_premium');
    };

    return (
        <PremiumContext.Provider value={{ isPremium, upgrade, downgrade }}>
            {children}
        </PremiumContext.Provider>
    );
}

export function usePremium() {
    const context = useContext(PremiumContext);
    if (context === undefined) {
        throw new Error('usePremium must be used within a PremiumProvider');
    }
    return context;
}
