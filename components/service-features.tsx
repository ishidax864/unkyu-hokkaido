'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import {
    ChevronDown,
    BrainCircuit,
    Radio,
    Bus,
    Route,
    ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

const STORAGE_KEY = 'unkyu_visited';

/* ─── データ ─── */
const FEATURE_KEYS = [
    { titleKey: 'features.feat1Title', descKey: 'features.feat1Desc', icon: BrainCircuit },
    { titleKey: 'features.feat2Title', descKey: 'features.feat2Desc', icon: Radio },
    { titleKey: 'features.feat3Title', descKey: 'features.feat3Desc', icon: Bus },
    { titleKey: 'features.feat4Title', descKey: 'features.feat4Desc', icon: Route },
] as const;

/* ─── SVGリングゲージ ─── */
function AccuracyRing() {
    const circleRef = useRef<SVGCircleElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);
    const r = 38;
    const C = 2 * Math.PI * r;
    const off = C - (94 / 100) * C;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    if (circleRef.current) {
                        circleRef.current.style.transition =
                            'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)';
                        circleRef.current.style.strokeDashoffset = String(off);
                    }
                }
            },
            { threshold: 0.3 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [off]);

    return (
        <div ref={containerRef} className="relative w-[72px] h-[72px] flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                <circle
                    cx="44" cy="44" r={r}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="4"
                />
                <circle
                    ref={circleRef}
                    cx="44" cy="44" r={r}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>94</span>
                <span className="text-[9px]" style={{ color: 'var(--muted)' }}>%</span>
            </div>
        </div>
    );
}

/* ─── メインコンポーネント ─── */
export function ServiceFeatures() {
    const isReturningUser = useSyncExternalStore(
        (onStoreChange) => {
            window.addEventListener('storage', onStoreChange);
            return () => window.removeEventListener('storage', onStoreChange);
        },
        () => {
            try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
        },
        () => false,
    );
    const [manuallyExpanded, setManuallyExpanded] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        try {
            if (!localStorage.getItem(STORAGE_KEY)) {
                localStorage.setItem(STORAGE_KEY, 'true');
            }
        } catch { /* noop */ }
    }, []);

    const isCollapsed = isReturningUser && !manuallyExpanded;

    if (isCollapsed) {
        return (
            <section className="py-6 border-t border-[var(--border)]">
                <button
                    onClick={() => setManuallyExpanded(true)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors py-2"
                >
                    <ChevronDown className="w-4 h-4" />
                    {isReturningUser
                        ? t('features.toggleShow')
                        : t('features.toggleShowNew')}
                </button>
            </section>
        );
    }

    return (
        <section
            className="py-8 border-t border-[var(--border)]"
            aria-labelledby="features-heading"
        >
            {/* ─── ヒーロー ─── */}
            <div className="text-center mb-6">
                <h2
                    id="features-heading"
                    className="text-[20px] font-bold leading-[1.4] tracking-tight mb-2"
                >
                    {t('features.heroLine1')}
                    <br />
                    <span className="text-[var(--primary)]">
                        {t('features.heroLine2')}
                    </span>
                </h2>
                <p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-[280px] mx-auto">
                    {t('features.heroDesc1')}<strong className="text-[var(--foreground)]">{t('features.heroDesc1Bold')}</strong>。
                    <br />
                    {t('features.heroDesc2')}
                </p>
            </div>

            {/* ─── 特徴リスト（常に展開） ─── */}
            <div className="space-y-3 mb-5">
                {FEATURE_KEYS.map((f, i) => {
                    const Icon = f.icon;
                    return (
                        <div key={i} className="card p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--background-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Icon
                                        className="w-4 h-4 text-[var(--primary)]"
                                        strokeWidth={1.8}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-[13px] text-[var(--foreground)] leading-snug mb-1">
                                        {t(f.titleKey)}
                                    </h3>
                                    <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                                        {t(f.descKey)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ─── 精度セクション ─── */}
            <div
                className="rounded-xl p-5 mb-4 border"
                style={{
                    background: 'var(--primary-light)',
                    borderColor: 'var(--primary)',
                    borderWidth: '1.5px',
                }}
            >
                <div className="flex items-center gap-4">
                    <AccuracyRing />
                    <div className="min-w-0">
                        <h3 className="font-bold text-[15px] mb-1" style={{ color: 'var(--foreground)' }}>
                            {t('features.accuracyTitle')}
                        </h3>
                        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                            2,293件のテストケースで検証。
                            <br />
                            JR北海道 全13路線に対応。
                        </p>
                    </div>
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <Link
                        href="/accuracy"
                        className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
                        style={{ color: 'var(--primary)' }}
                    >
                        {t('features.viewReport')}
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {/* 閉じる */}
            <button
                onClick={() => setManuallyExpanded(false)}
                className="w-full flex items-center justify-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors py-2"
            >
                <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                {t('features.toggleHide')}
            </button>
        </section>
    );
}
