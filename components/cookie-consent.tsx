'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export function CookieConsent() {
    const [show, setShow] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            const timer = setTimeout(() => setShow(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setShow(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookie-consent', 'declined');
        setShow(false);
        if (typeof window !== 'undefined') {
            const gaId = process.env.NEXT_PUBLIC_GA_ID || '';
            if (gaId) {
                (window as Record<string, unknown>)['ga-disable-' + gaId] = true;
            }
        }
    };

    if (!show) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-label="Cookie Consent"
        >
            <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <p className="text-xs text-[var(--foreground)] leading-relaxed mb-3">
                    {t('cookie.message')}
                    <Link href="/privacy" className="text-[var(--primary)] underline ml-1">{t('cookie.seePolicy')}</Link>
                </p>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={handleDecline}
                        className="px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors rounded-lg"
                    >
                        {t('cookie.decline')}
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-4 py-1.5 text-xs bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                    >
                        {t('cookie.accept')}
                    </button>
                </div>
            </div>
        </div>
    );
}

