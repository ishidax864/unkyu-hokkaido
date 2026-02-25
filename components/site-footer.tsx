'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export function SiteFooter() {
    const { t } = useTranslation();

    return (
        <footer className="mt-8 text-center pb-8 border-t border-[var(--border)] pt-8">
            <p className="text-xs text-[var(--muted)] mb-4">
                {t('prediction.disclaimer')}
            </p>

            <div className="mt-8 text-xs text-[var(--muted)] opacity-80 space-y-2">
                <div>
                    <p>{t('footer.operator')}</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 my-2">
                        <Link href="/accuracy" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted">{t('footer.accuracy')}</Link>
                        <Link href="/faq" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted">{t('footer.faq')}</Link>
                        <Link href="/onboarding" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted">{t('footer.guide')}</Link>
                        <Link href="/terms" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted">{t('footer.terms')}</Link>
                        <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted">{t('footer.privacy')}</Link>
                        <Link href="/legal-notation" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted">{t('footer.legal')}</Link>
                    </div>

                    <a href="mailto:info@andr.ltd" className="hover:text-[var(--primary)] transition-colors block mt-2">
                        {t('footer.contact')}: info@andr.ltd
                    </a>
                </div>
                <div className="pt-4">
                    <p className="mb-0.5 text-[11px]">{t('common.weatherData')}: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">Open-Meteo API</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY 4.0</a>)</p>
                    <p className="mb-1 text-[11px] opacity-60">{t('common.adDisclaimer')}</p>
                    <p className="mb-2 text-[11px] opacity-50">{t('common.jrDisclaimer')}</p>
                    <p className="font-en text-[11px]">{t('common.copyright')} <span className="opacity-50 ml-1">v7.5</span></p>
                </div>
            </div>
        </footer>
    );
}

