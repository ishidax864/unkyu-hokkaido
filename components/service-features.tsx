'use client';

import { useState, useEffect, useRef } from 'react';
import {
    ChevronDown,
    BrainCircuit,
    Radio,
    Bus,
    Route,
    Shield,
    ArrowRight,
    Check,
    Minus,
} from 'lucide-react';
import Link from 'next/link';

const STORAGE_KEY = 'unkyu_visited';

/* ─── データ ─── */
const FEATURES = [
    {
        icon: BrainCircuit,
        title: '公式発表の前に行動できる',
        desc: '天気予報×過去の運休パターン×路線の脆弱性をAIが統合解析。JR公式の運休発表を待たずに、事前に代替手段を検討できます。',
        gradient: 'from-emerald-500 to-teal-600',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        icon: Radio,
        title: '3層リアルタイム統合',
        desc: '①気象データ ②JR公式運行情報 ③現地ユーザー報告の3つをリアルタイムで統合。「今」と「これから」の両方が分かります。',
        gradient: 'from-blue-500 to-indigo-600',
        iconBg: 'bg-blue-50 dark:bg-blue-950/40',
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
        icon: Bus,
        title: '代替手段を1秒で表示',
        desc: '運休リスクが高い区間の都市間バス・タクシーなどの代替ルートを自動提案。「電車が止まった、どうしよう」をなくします。',
        gradient: 'from-amber-500 to-orange-600',
        iconBg: 'bg-amber-50 dark:bg-amber-950/40',
        iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
        icon: Route,
        title: '13路線の個別分析',
        desc: '宗谷本線と千歳線では、同じ風速でもリスクが全く違う。路線ごとの脆弱性を学習済みで、的確な予測を実現。',
        gradient: 'from-violet-500 to-purple-600',
        iconBg: 'bg-violet-50 dark:bg-violet-950/40',
        iconColor: 'text-violet-600 dark:text-violet-400',
    },
] as const;

const COMPARISONS = [
    { name: 'JR北海道公式', desc: '運休が「起きてから」通知' },
    { name: 'Yahoo!乗換案内', desc: '「明日止まるか」は分からない' },
    { name: '天気アプリ', desc: '「電車が動くか」は教えてくれない' },
] as const;

/* ─── アニメーション付きカウンター ─── */
function AnimCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [val, setVal] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const animated = useRef(false);

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
                        setVal(Math.round(eased * target));
                        if (t < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.3 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [target]);

    return <span ref={ref} className="tabular-nums">{val}{suffix}</span>;
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
        <div ref={containerRef} className="relative w-[120px] h-[120px] mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* 背景リング */}
                <circle
                    cx="60" cy="60" r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-white/10"
                />
                {/* アニメーション付きリング */}
                <circle
                    ref={circleRef}
                    cx="60" cy="60" r={r}
                    fill="none"
                    stroke="url(#accuracy-grad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C}
                />
                <defs>
                    <linearGradient id="accuracy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[28px] font-black text-white leading-none tracking-tight">
                    <AnimCounter target={94} />
                </span>
                <span className="text-xs font-bold text-white/60 mt-0.5">%</span>
            </div>
        </div>
    );
}

/* ─── メインコンポーネント ─── */
export function ServiceFeatures() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isReturningUser, setIsReturningUser] = useState(false);
    const [expandedCard, setExpandedCard] = useState<number | null>(null);

    useEffect(() => {
        try {
            const v = localStorage.getItem(STORAGE_KEY);
            if (v) {
                setIsCollapsed(true);
                setIsReturningUser(true);
            } else {
                localStorage.setItem(STORAGE_KEY, 'true');
            }
        } catch {
            /* noop */
        }
    }, []);

    if (isCollapsed) {
        return (
            <section className="py-6 border-t border-[var(--border)]">
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors py-2"
                >
                    <ChevronDown className="w-4 h-4" />
                    {isReturningUser
                        ? '運休北海道の特徴を見る'
                        : 'サービス紹介を見る'}
                </button>
            </section>
        );
    }

    return (
        <section
            className="py-8 md:py-12 border-t border-[var(--border)]"
            aria-labelledby="features-heading"
        >
            {/* ─── ヒーロー ─── */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] mb-4">
                    <Shield className="w-3 h-3 text-[var(--primary)]" strokeWidth={2.5} />
                    <span className="text-[10px] font-bold text-[var(--primary)] tracking-wider uppercase">
                        Features
                    </span>
                </div>
                <h2
                    id="features-heading"
                    className="text-[22px] md:text-[22px] font-black leading-[1.3] tracking-tight mb-3"
                >
                    もう、雪の駅で
                    <br />
                    <span
                        className="text-transparent bg-clip-text"
                        style={{
                            backgroundImage:
                                'linear-gradient(135deg, var(--primary) 0%, #34d399 50%, var(--primary) 100%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 3s ease-in-out infinite',
                        }}
                    >
                        待ちぼうけはしない。
                    </span>
                </h2>
                <p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-[280px] mx-auto">
                    1,577件のテストで実証された<strong className="text-[var(--foreground)]">94%の精度</strong>。
                    <br />
                    JR北海道13路線の運休を事前に予測。
                </p>
            </div>

            {/* ─── 特徴カード ─── */}
            <div className="space-y-3 mb-6">
                {FEATURES.map((f, i) => {
                    const Icon = f.icon;
                    const isOpen = expandedCard === i;
                    return (
                        <button
                            key={i}
                            onClick={() => setExpandedCard(isOpen ? null : i)}
                            className="w-full text-left card group transition-all duration-300 overflow-hidden"
                            style={{
                                borderRadius: '14px',
                            }}
                        >
                            {/* 上部のグラデーションアクセントライン */}
                            <div
                                className={`h-[3px] bg-gradient-to-r ${f.gradient} opacity-60 group-hover:opacity-100 transition-opacity`}
                            />
                            <div className="p-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
                                    >
                                        <Icon
                                            className={`w-5 h-5 ${f.iconColor}`}
                                            strokeWidth={1.8}
                                        />
                                    </div>
                                    <h3 className="font-bold text-[13px] text-[var(--foreground)] flex-1 leading-snug">
                                        {f.title}
                                    </h3>
                                    <ChevronDown
                                        className={`w-4 h-4 text-[var(--muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''
                                            }`}
                                    />
                                </div>
                                {/* 展開テキスト */}
                                <div
                                    className="overflow-hidden transition-all duration-300"
                                    style={{
                                        maxHeight: isOpen ? '120px' : '0px',
                                        opacity: isOpen ? 1 : 0,
                                        marginTop: isOpen ? '10px' : '0px',
                                    }}
                                >
                                    <p className="text-[12px] text-[var(--muted)] leading-relaxed pl-[52px]">
                                        {f.desc}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ─── 精度セクション — ダークグリーンのインパクト帯 ─── */}
            <div
                className="relative overflow-hidden rounded-xl p-6 mb-5"
                style={{
                    background:
                        'linear-gradient(145deg, #003d29 0%, #005c3d 40%, #007849 100%)',
                }}
            >
                {/* 装飾的なグロー */}
                <div
                    className="absolute top-0 right-0 w-40 h-40 opacity-20 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(circle at center, #34d399 0%, transparent 70%)',
                    }}
                />
                <div
                    className="absolute bottom-0 left-0 w-32 h-32 opacity-10 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(circle at center, #6ee7b7 0%, transparent 70%)',
                    }}
                />

                <div className="relative z-10">
                    {/* リングゲージ */}
                    <AccuracyRing />

                    <div className="text-center mt-4">
                        <h3 className="font-black text-white text-base tracking-tight">
                            予測精度の実績
                        </h3>
                        <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                            17カテゴリ × 13路線 = <strong className="text-white/70">1,577件</strong>のテストで検証済み
                        </p>
                    </div>

                    {/* 3つのKPI */}
                    <div className="grid grid-cols-3 gap-3 mt-5">
                        {[
                            { value: 98.6, suffix: '%', label: 'ステータス的中率' },
                            { value: 13, suffix: '', label: '対応路線' },
                            { value: 0.8, suffix: '%', label: '過小予測率' },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="text-center py-2.5 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.08)' }}
                            >
                                <div className="text-[15px] font-black text-white tabular-nums">
                                    <AnimCounter
                                        target={stat.value}
                                        suffix={stat.suffix}
                                    />
                                </div>
                                <div className="text-[10px] text-white/40 mt-0.5 tracking-wide font-medium">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                        <div className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-emerald-300" strokeWidth={2.5} />
                            <span className="text-[10px] text-emerald-300/80 font-medium">
                                安全最優先設計
                            </span>
                        </div>
                        <Link
                            href="/accuracy"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 hover:text-white transition-colors"
                        >
                            精度レポートを見る
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ─── 比較テーブル ─── */}
            <div className="card overflow-hidden mb-5" style={{ borderRadius: '14px' }}>
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background-secondary)]">
                    <h3 className="text-[12px] font-bold text-[var(--foreground)] tracking-wide">
                        既存サービスとの違い
                    </h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {COMPARISONS.map((c) => (
                        <div
                            key={c.name}
                            className="flex items-center gap-3 px-4 py-3"
                        >
                            <Minus className="w-3.5 h-3.5 text-[var(--muted)] opacity-40 flex-shrink-0" />
                            <div className="min-w-0">
                                <span className="text-[12px] font-bold text-[var(--foreground)]">
                                    {c.name}
                                </span>
                                <span className="text-[12px] text-[var(--muted)] ml-2">
                                    {c.desc}
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
                                運休北海道
                            </span>
                            <span className="text-[12px] font-semibold text-[var(--foreground)] ml-2">
                                事前に予測し、行動を先手で判断
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 閉じる */}
            <button
                onClick={() => setIsCollapsed(true)}
                className="w-full flex items-center justify-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors py-3"
            >
                <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                閉じる
            </button>
        </section>
    );
}
