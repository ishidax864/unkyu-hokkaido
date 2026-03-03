'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import {
    ChevronDown,
    BrainCircuit,
    Radio,
    Bus,
    Route,
    ArrowRight,
    Check,
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

const COMPARISON_KEYS = [
    { nameKey: 'features.comp1Name', descKey: 'features.comp1Desc' },
    { nameKey: 'features.comp2Name', descKey: 'features.comp2Desc' },
    { nameKey: 'features.comp3Name', descKey: 'features.comp3Desc' },
] as const;

/* ─── アニメーション付きカウンター（小数対応） ─── */
function AnimCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [val, setVal] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const animated = useRef(false);
    const decimals = String(target).includes('.') ? String(target).split('.')[1].length : 0;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting && !animated.current) {
                    animated.current = true;
                    const dur = 1200;
                    const start = performance.now();
                    const tick = (now: number) => {
                        const t = Math.min((now - start) / dur, 1);
                        const eased = 1 - Math.pow(1 - t, 4);
                        const factor = Math.pow(10, decimals);
                        setVal(Math.round(eased * target * factor) / factor);
                        if (t < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.3 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [target, decimals]);

    return <span ref={ref} className="tabular-nums">{decimals > 0 ? val.toFixed(decimals) : val}{suffix}</span>;
}

/* ─── SVGリングゲージ ─── */
function AccuracyRing() {
    const circleRef = useRef<SVGCircleElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);
    const r = 52;
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
                            'stroke-dashoffset 1.8s cubic-bezier(0.22, 1, 0.36, 1)';
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
        <div ref={containerRef} className="relative w-[100px] h-[100px] mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                    cx="60" cy="60" r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-white/10"
                />
                <circle
                    ref={circleRef}
                    cx="60" cy="60" r={r}
                    fill="none"
                    stroke="#6ee7b7"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[26px] font-bold text-white leading-none tracking-tight">
                    <AnimCounter target={94} />
                </span>
                <span className="text-[10px] font-medium text-white/50 mt-0.5">%</span>
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
    const [expandedCard, setExpandedCard] = useState<number | null>(null);
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

            {/* ─── 特徴カード ─── */}
            <div className="space-y-2.5 mb-5">
                {FEATURE_KEYS.map((f, i) => {
                    const Icon = f.icon;
                    const isOpen = expandedCard === i;
                    return (
                        <button
                            key={i}
                            onClick={() => setExpandedCard(isOpen ? null : i)}
                            className="w-full text-left card group transition-all duration-200 overflow-hidden"
                        >
                            <div className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-[var(--background-secondary)] flex items-center justify-center flex-shrink-0">
                                        <Icon
                                            className="w-[18px] h-[18px] text-[var(--primary)]"
                                            strokeWidth={1.8}
                                        />
                                    </div>
                                    <h3 className="font-bold text-[13px] text-[var(--foreground)] flex-1 leading-snug">
                                        {t(f.titleKey)}
                                    </h3>
                                    <ChevronDown
                                        className={`w-4 h-4 text-[var(--muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                            }`}
                                    />
                                </div>
                                <div
                                    className="overflow-hidden transition-all duration-200"
                                    style={{
                                        maxHeight: isOpen ? '120px' : '0px',
                                        opacity: isOpen ? 1 : 0,
                                        marginTop: isOpen ? '10px' : '0px',
                                    }}
                                >
                                    <p className="text-[12px] text-[var(--muted)] leading-relaxed pl-12">
                                        {t(f.descKey)}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ─── 精度セクション ─── */}
            <div
                className="rounded-xl p-5 mb-4"
                style={{ background: '#1a3a2a' }}
            >
                <AccuracyRing />

                <div className="text-center mt-3">
                    <h3 className="font-bold text-white text-[15px]">
                        {t('features.accuracyTitle')}
                    </h3>
                    <p className="text-[11px] text-white/40 mt-1">
                        {t('features.accuracyTestDesc', { count: '2,293' })}
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mt-4">
                    {[
                        { value: 98.6, suffix: '%', label: t('features.statAccuracy') },
                        { value: 13, suffix: '', label: t('features.statRoutes') },
                        { value: 0.8, suffix: '%', label: t('features.statUnderestimate') },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="text-center py-2 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                            <div className="text-[14px] font-bold text-white tabular-nums">
                                <AnimCounter
                                    target={stat.value}
                                    suffix={stat.suffix}
                                />
                            </div>
                            <div className="text-[10px] text-white/35 mt-0.5 font-medium">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <span className="text-[10px] text-emerald-300/60 font-medium">
                        {t('features.safetyFirst')}
                    </span>
                    <Link
                        href="/accuracy"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-white/50 hover:text-white transition-colors"
                    >
                        {t('features.viewReport')}
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {/* ─── 比較テーブル ─── */}
            <div className="card overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background-secondary)]">
                    <h3 className="text-[12px] font-bold text-[var(--foreground)]">
                        {t('features.compTitle')}
                    </h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {COMPARISON_KEYS.map((c) => (
                        <div
                            key={c.nameKey}
                            className="flex items-center gap-3 px-4 py-3"
                        >
                            <span className="text-[var(--muted)] opacity-30 text-xs">―</span>
                            <div className="min-w-0">
                                <span className="text-[12px] font-bold text-[var(--foreground)]">
                                    {t(c.nameKey)}
                                </span>
                                <span className="text-[12px] text-[var(--muted)] ml-2">
                                    {t(c.descKey)}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--primary-light)]">
                        <Check
                            className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0"
                            strokeWidth={3}
                        />
                        <div className="min-w-0">
                            <span className="text-[12px] font-bold text-[var(--primary)]">
                                {t('features.compOurs')}
                            </span>
                            <span className="text-[12px] font-semibold text-[var(--foreground)] ml-2">
                                {t('features.compOursDesc')}
                            </span>
                        </div>
                    </div>
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
