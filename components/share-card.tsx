'use client';

import { useState } from 'react';
import { PredictionResult } from '@/lib/types';
import { logger } from '@/lib/logger';
import { Share2, Copy, Check, Twitter, MessageCircle } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google'; // 🆕

interface ShareCardProps {
    prediction: PredictionResult;
    routeName: string;
    departureStation: string;
    arrivalStation: string;
}

export function ShareCard({ prediction, routeName, departureStation, arrivalStation }: ShareCardProps) {
    const [copied, setCopied] = useState(false);

    // シェアテキスト生成
    const getShareText = () => {
        const riskEmoji = prediction.probability >= 80 ? '🚫' :
            prediction.probability >= 50 ? '⚠️' :
                prediction.probability >= 20 ? '⚡' : '✅';

        const date = new Date(prediction.targetDate);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

        return `${riskEmoji} ${dateStr} ${routeName}（${departureStation}→${arrivalStation}）
運休リスク ${prediction.probability}%

${prediction.reasons[0] || ''}

AIが天気から電車の運休を予測 👇
https://unkyu-ai.vercel.app
#運休北海道 #JR北海道`;
    };

    // クリップボードにコピー
    const handleCopy = async () => {
        const text = getShareText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            // 🆕 GA4イベント送信
            sendGAEvent('event', 'share', { method: 'copy_clipboard', route: routeName });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            logger.error('Failed to copy', { err });
        }
    };

    // Web Share API でシェア
    const handleNativeShare = async () => {
        const text = getShareText();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: '運休北海道 予測結果',
                    text,
                    url: window.location.href,
                });
                // 🆕 GA4イベント送信
                sendGAEvent('event', 'share', { method: 'web_share_api', route: routeName });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    logger.error('Share failed', { err });
                }
            }
        } else {
            // Fallback to copy
            handleCopy();
        }
    };

    // X(Twitter)でシェア
    const shareToTwitter = () => {
        const text = encodeURIComponent(getShareText());
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        // 🆕 GA4イベント送信
        sendGAEvent('event', 'share', { method: 'twitter', route: routeName });
        window.open(url, '_blank', 'width=550,height=420');
    };

    // LINEでシェア
    const shareToLine = () => {
        const text = encodeURIComponent(getShareText());
        const url = `https://social-plugins.line.me/lineit/share?text=${text}`;
        // 🆕 GA4イベント送信
        sendGAEvent('event', 'share', { method: 'line', route: routeName });
        window.open(url, '_blank');
    };


    return (
        <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="section-label mb-0">結果をシェア</div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                    data-compact
                >
                    {copied ? (
                        <Check className="w-3.5 h-3.5 text-[var(--status-normal)]" />
                    ) : (
                        <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'コピー済み' : 'テキストをコピー'}</span>
                </button>
            </div>

            {/* Visual Preview Card */}
            {(() => {
                const riskLevel = prediction.probability >= 80 ? '🚫 危険' :
                    prediction.probability >= 50 ? '⚠️ 注意' :
                        prediction.probability >= 20 ? '⚡ やや注意' : '✅ 安全';
                const gradientClass = prediction.probability >= 80 ? 'from-red-500 to-red-700' :
                    prediction.probability >= 50 ? 'from-orange-500 to-amber-600' :
                        prediction.probability >= 20 ? 'from-amber-400 to-yellow-500' : 'from-emerald-500 to-teal-600';
                return (
                    <div className={`bg-gradient-to-br ${gradientClass} rounded-xl p-4 text-white shadow-lg`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold opacity-80 tracking-wider">運休北海道 AI予測</span>
                            <span className="text-2xl font-black">{prediction.probability}%</span>
                        </div>
                        <div className="text-sm font-bold mb-1">
                            {departureStation} → {arrivalStation}
                        </div>
                        <div className="text-xs opacity-90">
                            {riskLevel} · {routeName}
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={shareToTwitter}
                    className="flex items-center justify-center gap-2 py-3 rounded-lg bg-[#000000] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                >
                    <Twitter className="w-4 h-4 fill-white" />
                    X でシェア
                </button>

                <button
                    onClick={shareToLine}
                    className="flex items-center justify-center gap-2 py-3 rounded-lg bg-[#06C755] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    LINE
                </button>
            </div>

            {/* その他のシェア (Web Share API) */}
            {typeof navigator !== 'undefined' && !!navigator.share && (
                <button
                    onClick={handleNativeShare}
                    className="w-full py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] text-xs font-medium flex items-center justify-center gap-2 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    その他の方法でシェア
                </button>
            )}

        </div>
    );
}
