'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Search, BarChart3, Bus, Star, Train } from 'lucide-react';
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
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">{t('onboarding.step1Dep')}</div>
                                <span className="text-sm text-gray-400">Sapporo</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px] text-red-600 font-bold">{t('onboarding.step1Arr')}</div>
                                <span className="text-sm text-gray-400">New Chitose Airport</span>
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
                                {t('onboarding.step1Button')}
                            </button>
                        </div>
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
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="text-center mb-3">
                            <div className="text-[11px] text-[var(--muted)]">{t('onboarding.step2Risk')}</div>
                            <div className="text-4xl font-bold text-orange-500 my-1">45<span className="text-lg">%</span></div>
                            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                                {t('onboarding.step2DelayPossible')}
                            </span>
                        </div>
                        <div className="border-t pt-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-orange-500">💨</span>
                                <span className="text-[var(--muted)]">{t('onboarding.step2Wind')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-blue-500">❄️</span>
                                <span className="text-[var(--muted)]">{t('onboarding.step2Snow')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2 text-[11px] text-[var(--muted)]">
                        <div className="flex items-start gap-2 bg-green-50 p-2.5 rounded-lg">
                            <span className="font-bold text-green-700">🟢 0-20%</span>
                            <span>{t('onboarding.step2Green')}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-yellow-50 p-2.5 rounded-lg">
                            <span className="font-bold text-yellow-700">🟡 20-50%</span>
                            <span>{t('onboarding.step2Yellow')}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-orange-50 p-2.5 rounded-lg">
                            <span className="font-bold text-orange-700">🟠 50-80%</span>
                            <span>{t('onboarding.step2Orange')}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-red-50 p-2.5 rounded-lg">
                            <span className="font-bold text-red-700">🔴 80-100%</span>
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
            icon: Bus,
            color: 'orange',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                        {t('onboarding.step3Desc')}
                    </p>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Bus className="w-4 h-4 text-orange-500" />
                            {t('onboarding.step3Alt')}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                <div>
                                    <div className="text-xs font-bold">{t('onboarding.step3Bus')}</div>
                                    <div className="text-[10px] text-[var(--muted)]">{t('onboarding.step3BusRoute')}</div>
                                </div>
                                <div className="text-xs font-bold text-orange-600">{t('onboarding.step3BusTime')}</div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <div>
                                    <div className="text-xs font-bold">{t('onboarding.step3Taxi')}</div>
                                    <div className="text-[10px] text-[var(--muted)]">{t('onboarding.step3TaxiRoute')}</div>
                                </div>
                                <div className="text-xs font-bold text-blue-600">{t('onboarding.step3TaxiTime')}</div>
                            </div>
                        </div>
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
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {t('onboarding.step4FavTitle')}
                        </div>
                        <div className="space-y-2">
                            <button className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors text-left">
                                <div>
                                    <div className="text-xs font-bold">{t('onboarding.step4Commute')}</div>
                                    <div className="text-[10px] text-[var(--muted)]">{t('onboarding.step4CommuteRoute')}</div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-yellow-600" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors text-left">
                                <div>
                                    <div className="text-xs font-bold">{t('onboarding.step4School')}</div>
                                    <div className="text-[10px] text-[var(--muted)]">{t('onboarding.step4SchoolRoute')}</div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-purple-600" />
                            </button>
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
