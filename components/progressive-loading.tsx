'use client';

import { useEffect, useState } from 'react';
import { Cloud, Database, Radio, TrendingUp, CheckCircle } from 'lucide-react';

interface ProgressiveLoadingProps {
    isLoading: boolean;
}

const ANALYSIS_STEPS = [
    { id: 1, label: '気象データを解析中...', icon: Cloud, duration: 800 },
    { id: 2, label: '過去の運休パターンと照合中...', icon: Database, duration: 1000 },
    { id: 3, label: 'JR公式情報を確認中...', icon: Radio, duration: 600 },
    { id: 4, label: '最終リスク予測中...', icon: TrendingUp, duration: 700 },
];

export function ProgressiveLoading({ isLoading }: ProgressiveLoadingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    useEffect(() => {
        if (!isLoading) {
            setCurrentStep(0);
            setCompletedSteps([]);
            return;
        }

        let stepIndex = 0;
        const timers: NodeJS.Timeout[] = [];

        const advanceStep = () => {
            if (stepIndex < ANALYSIS_STEPS.length) {
                setCurrentStep(stepIndex);

                const timer = setTimeout(() => {
                    setCompletedSteps(prev => [...prev, stepIndex]);
                    stepIndex++;
                    advanceStep();
                }, ANALYSIS_STEPS[stepIndex].duration);

                timers.push(timer);
            }
        };

        advanceStep();

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [isLoading]);

    if (!isLoading) return null;

    return (
        <div className="card p-6 space-y-4">
            <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 text-[var(--primary)] font-bold">
                    <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" />
                    AI予測エンジンが解析中...
                </div>
            </div>

            {ANALYSIS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === index;
                const isCompleted = completedSteps.includes(index);
                const isPending = index > currentStep;

                return (
                    <div
                        key={step.id}
                        className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${isActive ? 'bg-blue-50 border border-blue-200' :
                                isCompleted ? 'bg-green-50 border border-green-200' :
                                    'bg-gray-50 border border-transparent'
                            }`}
                    >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-500 text-white' :
                                isCompleted ? 'bg-green-500 text-white' :
                                    'bg-gray-300 text-gray-500'
                            }`}>
                            {isCompleted ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                            )}
                        </div>

                        <span className={`text-sm font-medium ${isActive ? 'text-blue-700' :
                                isCompleted ? 'text-green-700' :
                                    'text-gray-400'
                            }`}>
                            {step.label}
                        </span>

                        {isActive && (
                            <div className="ml-auto">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
