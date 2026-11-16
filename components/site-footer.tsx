'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RailwayMark } from '@/components/journey-symbols';
import { useTranslation } from '@/lib/i18n';

export function SiteFooter() {
    const { t } = useTranslation();
    const pathname = usePathname();

    if (pathname === '/') return (
        <footer className="journey-site-footer">
            <div className="footer-main">
                <div className="footer-identity"><Link href="/" aria-label="運休北海道 ホーム"><RailwayMark/><span>運休北海道</span></Link><p>{t('footer.operator')}</p><a href="mailto:info@andr.ltd">お問い合わせ ↗</a></div>
                <nav aria-label="サービス情報" className="footer-links">
                    <div><Link href="/accuracy">予測について</Link><Link href="/faq">使い方・FAQ</Link><Link href="/onboarding">ガイド</Link></div>
                    <div><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/legal-notation">特定商取引法に基づく表記</Link></div>
                </nav>
            </div>
            <div className="footer-base"><span>© {new Date().getFullYear()} 運休北海道</span><span>JR北海道とは独立したサービスです</span></div>
        </footer>
    );

    return (
        <footer className="mt-8 text-center pb-8 border-t border-[var(--border)] pt-8">
            <p className="text-sm text-[var(--muted)] mb-4">
                予測は参考情報です。運行・再開はJR北海道の公式情報をご確認ください。
            </p>

            <div className="mt-8 text-sm text-[var(--muted)] opacity-80 space-y-2">
                <div>
                    <p>{t('footer.operator')}</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 my-2">
                        <Link href="/accuracy" className="hover:text-[var(--primary)] transition-colors underline decoration-dotted">予測について</Link>
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
                <div className="pt-3">
                    <p className="font-en text-[11px]">{t('common.copyright')} </p>
                </div>
            </div>
        </footer>
    );
}

