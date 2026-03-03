'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Search, BarChart3, Star, Train } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const colorClasses: Record<string, { bg: string; text: string; light: string; border: string }> = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
    green: { bg: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-200' },
    orange: { bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
};

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const { t } = useTranslation();

    const steps = useMemo(() => [
        {
            step: 1,
            title: t('onboarding.step1Title'),
            subtitle: t('onboarding.step1Subtitle'),
            icon: Search,
            color: 'blue',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                        {t('onboarding.step1Desc')}
                    </p>
                    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <Image
                            src="/images/onboarding/step1-search.png"
                            alt="検索フォームの画面"
                            width={375}
                            height={812}
                            className="w-full h-auto"
                            priority
                        />
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-[11px] text-blue-700">
                        {t('onboarding.step1Hint')}
                    </div>
                </div>
            ),
        },
        {
            step: 2,
            title: t('onboarding.step2Title'),
            subtitle: t('onboarding.step2Subtitle'),
            icon: BarChart3,
            color: 'green',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                        {t('onboarding.step2Desc')}
                    </p>
                    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <Image
                            src="/images/onboarding/step2-results.png"
                            alt="予測結果の画面"
                            width={375}
                            height={500}
                            className="w-full h-auto"
                        />
                    </div>
                    <div className="space-y-2 text-[11px] text-[var(--muted)]">
                        <div className="flex items-start gap-2 bg-green-50 p-2.5 rounded-lg">
                            <span className="font-bold text-green-700 flex-shrink-0">🟢 0-20%</span>
                            <span>{t('onboarding.step2Green')}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-yellow-50 p-2.5 rounded-lg">
                            <span className="font-bold text-yellow-700 flex-shrink-0">🟡 20-50%</span>
                            <span>{t('onboarding.step2Yellow')}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-orange-50 p-2.5 rounded-lg">
                            <span className="font-bold text-orange-700 flex-shrink-0">🟠 50-80%</span>
                            <span>{t('onboarding.step2Orange')}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-red-50 p-2.5 rounded-lg">
                            <span className="font-bold text-red-700 flex-shrink-0">🔴 80-100%</span>
                            <span>{t('onboarding.step2Red')}</span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            step: 3,
            title: t('onboarding.step3Title'),
            subtitle: t('onboarding.step3Subtitle'),
            icon: Train,
            color: 'orange',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                        {t('onboarding.step3Desc')}
                    </p>
                    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <Image
                            src="/images/onboarding/step3-timetable.png"
                            alt="時刻表の画面"
                            width={375}
                            height={500}
                            className="w-full h-auto"
                        />
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-[11px] text-orange-700">
                        {t('onboarding.step3Hint')}
                    </div>
                </div>
            ),
        },
        {
            step: 4,
            title: t('onboarding.step4Title'),
            subtitle: t('onboarding.step4Subtitle'),
            icon: Star,
            color: 'purple',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                        {t('onboarding.step4Desc')}
                    </p>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                            <span className="text-lg flex-shrink-0">①</span>
                            <p className="text-[12px] text-[var(--foreground)] leading-relaxed">
                                予測結果画面の右上にある <strong>「☆ お気に入り登録」</strong> ボタンをタップするだけで登録完了。
                            </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                            <span className="text-lg flex-shrink-0">②</span>
                            <p className="text-[12px] text-[var(--foreground)] leading-relaxed">
                                トップページにお気に入りが表示され、ワンタップで最新予測を確認できます。
                            </p>
                        </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-[11px] text-purple-700">
                        {t('onboarding.step4Hint')}
                    </div>
                </div>
            ),
        },
    ], [t]);

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
                    <h1 className="text-lg font-bold">{t('onboarding.pageTitle')}</h1>
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
                        {t('onboarding.prev')}
                    </button>

                    {currentStep < steps.length - 1 ? (
                        <button
                            onClick={() => setCurrentStep(currentStep + 1)}
                            className={`flex items-center gap-1 px-6 py-2.5 ${colors.bg} text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition-all`}
                        >
                            {t('onboarding.next')}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <Link
                            href="/"
                            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition-all"
                        >
                            <Train className="w-4 h-4" />
                            {t('onboarding.letsStart')}
                        </Link>
                    )}
                </div>

                {/* Skip link */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors underline">
                        {t('onboarding.skipToTop')}
                    </Link>
                </div>
            </div>
        </main>
    );
}
