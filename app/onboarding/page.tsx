'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Search, BarChart3, Bus, Star, Train } from 'lucide-react';

const steps = [
    {
        step: 1,
        title: '出発駅・到着駅を入力',
        subtitle: '調べたい区間を選ぶだけ',
        icon: Search,
        color: 'blue',
        content: (
            <div className="space-y-4">
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                    トップページの検索フォームに、出発駅と到着駅を入力してください。
                    JR北海道の全13路線・主要駅に対応しています。
                </p>

                {/* Mock search form */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">発</div>
                            <span className="text-sm text-gray-400">札幌</span>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px] text-red-600 font-bold">着</div>
                            <span className="text-sm text-gray-400">新千歳空港</span>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400">
                                2026-02-25
                            </div>
                            <div className="flex-1 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400">
                                08:30
                            </div>
                        </div>
                        <button className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-bold">
                            🔍 運休リスクを調べる
                        </button>
                    </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-[11px] text-blue-700">
                    <strong>💡 ヒント：</strong>駅名を1文字入力するだけで候補が表示されます。
                    「さっ」と打てば「札幌」が候補に出ます。
                </div>
            </div>
        ),
    },
    {
        step: 2,
        title: 'AI予測結果を確認',
        subtitle: '確率・ステータス・理由が一目でわかる',
        icon: BarChart3,
        color: 'green',
        content: (
            <div className="space-y-4">
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                    検索ボタンを押すと、AIが算出した運休リスクが表示されます。
                </p>

                {/* Mock result */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="text-center mb-3">
                        <div className="text-[11px] text-[var(--muted)]">運休リスク</div>
                        <div className="text-4xl font-bold text-orange-500 my-1">45<span className="text-lg">%</span></div>
                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                            ⚠️ 遅延の可能性
                        </span>
                    </div>
                    <div className="border-t pt-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-orange-500">💨</span>
                            <span className="text-[var(--muted)]">強風のため（風速18m/s予報）</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-blue-500">❄️</span>
                            <span className="text-[var(--muted)]">降雪2cm/h予報</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 text-[11px] text-[var(--muted)]">
                    <div className="flex items-start gap-2 bg-green-50 p-2.5 rounded-lg">
                        <span className="font-bold text-green-700">🟢 0-20%</span>
                        <span>ほぼ平常運転。安心して乗車できます</span>
                    </div>
                    <div className="flex items-start gap-2 bg-yellow-50 p-2.5 rounded-lg">
                        <span className="font-bold text-yellow-700">🟡 20-50%</span>
                        <span>遅延の可能性。時間に余裕を持って</span>
                    </div>
                    <div className="flex items-start gap-2 bg-orange-50 p-2.5 rounded-lg">
                        <span className="font-bold text-orange-700">🟠 50-80%</span>
                        <span>運休の可能性大。代替手段の検討を</span>
                    </div>
                    <div className="flex items-start gap-2 bg-red-50 p-2.5 rounded-lg">
                        <span className="font-bold text-red-700">🔴 80-100%</span>
                        <span>運休の可能性極めて高い。代替手段を確保</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        step: 3,
        title: '代替交通を確認',
        subtitle: '電車が止まっても大丈夫',
        icon: Bus,
        color: 'orange',
        content: (
            <div className="space-y-4">
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                    運休リスクが高い場合、予測結果の下に代替交通手段が自動表示されます。
                    都市間バスやタクシーの情報にワンタップでアクセスできます。
                </p>

                {/* Mock alternatives */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Bus className="w-4 h-4 text-orange-500" />
                        代替交通手段
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div>
                                <div className="text-xs font-bold">🚌 北海道中央バス</div>
                                <div className="text-[10px] text-[var(--muted)]">札幌⇔新千歳空港</div>
                            </div>
                            <div className="text-xs font-bold text-orange-600">約80分</div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                                <div className="text-xs font-bold">🚕 タクシー</div>
                                <div className="text-[10px] text-[var(--muted)]">札幌市内→新千歳空港</div>
                            </div>
                            <div className="text-xs font-bold text-blue-600">約60分</div>
                        </div>
                    </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-3 text-[11px] text-orange-700">
                    <strong>⚡ ポイント：</strong>飛行機に乗る予定がある方は、リスクが50%を超えたら早めにバスを予約しておくのがおすすめです。
                </div>
            </div>
        ),
    },
    {
        step: 4,
        title: 'お気に入り登録',
        subtitle: '次回からワンタップで予測',
        icon: Star,
        color: 'purple',
        content: (
            <div className="space-y-4">
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                    よく使うルートをお気に入りに登録しておくと、次回からワンタップで予測結果が表示されます。
                    通勤・通学ルートの登録がおすすめです。
                </p>

                {/* Mock favorites */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        お気に入りルート
                    </div>
                    <div className="space-y-2">
                        <button className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors text-left">
                            <div>
                                <div className="text-xs font-bold">🏠 通勤ルート</div>
                                <div className="text-[10px] text-[var(--muted)]">札幌 → 新千歳空港</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-yellow-600" />
                        </button>
                        <button className="w-full flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors text-left">
                            <div>
                                <div className="text-xs font-bold">🎓 通学ルート</div>
                                <div className="text-[10px] text-[var(--muted)]">小樽 → 札幌</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-purple-600" />
                        </button>
                    </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-3 text-[11px] text-purple-700">
                    <strong>💡 ヒント：</strong>予測結果画面の ★ ボタンでお気に入りに追加できます。
                    朝の忙しい時間にサッと確認できて便利です。
                </div>
            </div>
        ),
    },
];

const colorClasses: Record<string, { bg: string; text: string; light: string; border: string }> = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
    green: { bg: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-200' },
    orange: { bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
};

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const step = steps[currentStep];
    const colors = colorClasses[step.color];
    const Icon = step.icon;

    return (
        <main className="min-h-screen bg-[var(--background-secondary)]">
            <header className="bg-[var(--primary)] text-white px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-bold">使い方ガイド</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6">

                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {steps.map((s, i) => (
                        <button
                            key={s.step}
                            onClick={() => setCurrentStep(i)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i === currentStep
                                ? `${colors.bg} text-white shadow-lg scale-110`
                                : i < currentStep
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                        >
                            {i < currentStep ? '✓' : s.step}
                        </button>
                    ))}
                </div>

                {/* Step Content */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 ${colors.light} rounded-lg flex items-center justify-center ${colors.text}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className={`text-[10px] font-bold ${colors.text} uppercase tracking-wide`}>
                                Step {step.step} / {steps.length}
                            </div>
                            <h2 className="text-lg font-bold text-[var(--foreground)] leading-tight">{step.title}</h2>
                            <p className="text-xs text-[var(--muted)]">{step.subtitle}</p>
                        </div>
                    </div>

                    {step.content}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${currentStep === 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-[var(--muted)] hover:bg-gray-100'
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        前へ
                    </button>

                    {currentStep < steps.length - 1 ? (
                        <button
                            onClick={() => setCurrentStep(currentStep + 1)}
                            className={`flex items-center gap-1 px-6 py-2.5 ${colors.bg} text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition-all`}
                        >
                            次へ
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <Link
                            href="/"
                            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition-all"
                        >
                            <Train className="w-4 h-4" />
                            さっそく使ってみる
                        </Link>
                    )}
                </div>

                {/* Skip link */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors underline">
                        スキップしてトップへ
                    </Link>
                </div>
            </div>
        </main>
    );
}
