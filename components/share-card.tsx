'use client';

import { useRef, useState } from 'react';
import { PredictionResult } from '@/lib/types';
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
    const [_showShare, setShowShare] = useState(false);
    const _cardRef = useRef<HTMLDivElement>(null);

    // シェアテキスト生成
    const getShareText = () => {
        const riskLevel = prediction.probability >= 50 ? '⚠️高' :
            prediction.probability >= 20 ? '⚡中' : '✅低';

        const statusEmoji = prediction.status === '運休' ? '🚫' :
            prediction.status === '運転見合わせ' ? '⚠️' :
                prediction.status === '遅延' ? '🕐' : '✅';

        const date = new Date(prediction.targetDate);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

        return `【運休AI 予測】${dateStr}
${departureStation}→${arrivalStation}（${routeName}）

${statusEmoji} 運休リスク: ${prediction.probability}%（${riskLevel}）

${prediction.reasons[0] || ''}

運行予報を確認する：
https://unkyu-hokkaido.jp

#運休AI #JR北海道 #運休予測`;
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
            console.error('Failed to copy:', err);
        }
    };

    // Web Share API でシェア
    const handleNativeShare = async () => {
        const text = getShareText();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: '運休AI 予測結果',
                    text,
                    url: window.location.href,
                });
                // 🆕 GA4イベント送信
                sendGAEvent('event', 'share', { method: 'web_share_api', route: routeName });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        } else {
            setShowShare(true);
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
                >
                    {copied ? (
                        <Check className="w-3.5 h-3.5 text-[var(--status-normal)]" />
                    ) : (
                        <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'コピー済み' : 'テキストをコピー'}</span>
                </button>
            </div>

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
