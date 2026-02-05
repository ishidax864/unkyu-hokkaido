'use client';

import { useRef, useState } from 'react';
import { PredictionResult } from '@/lib/types';
import { Share2, Copy, Check, Twitter, MessageCircle } from 'lucide-react';

interface ShareCardProps {
    prediction: PredictionResult;
    routeName: string;
    departureStation: string;
    arrivalStation: string;
}

export function ShareCard({ prediction, routeName, departureStation, arrivalStation }: ShareCardProps) {
    const [copied, setCopied] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

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

#運休AI #JR北海道 #運休予測`;
    };

    // クリップボードにコピー
    const handleCopy = async () => {
        const text = getShareText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
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
        window.open(url, '_blank', 'width=550,height=420');
    };

    // LINEでシェア
    const shareToLine = () => {
        const text = encodeURIComponent(getShareText());
        const url = `https://social-plugins.line.me/lineit/share?text=${text}`;
        window.open(url, '_blank');
    };

    // リスクに応じた色
    const getRiskBgColor = () => {
        if (prediction.probability >= 50) return 'bg-red-50 border-red-200';
        if (prediction.probability >= 20) return 'bg-amber-50 border-amber-200';
        return 'bg-green-50 border-green-200';
    };

    return (
        <div className="space-y-3">
            {/* シェアボタン */}
            <button
                onClick={handleNativeShare}
                className="w-full card p-3 flex items-center justify-center gap-2 text-[var(--primary)] font-medium hover:bg-[var(--background-secondary)] transition-colors"
            >
                <Share2 className="w-4 h-4" />
                予測結果をシェア
            </button>

            {/* シェアオプション（Web Share API非対応時） */}
            {showShare && (
                <div className="card p-4 space-y-3">
                    <div className="section-label">シェア方法を選択</div>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={shareToTwitter}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-md border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                        >
                            <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                            <span className="text-xs">X</span>
                        </button>

                        <button
                            onClick={shareToLine}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-md border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                        >
                            <MessageCircle className="w-5 h-5 text-[#00B900]" />
                            <span className="text-xs">LINE</span>
                        </button>

                        <button
                            onClick={handleCopy}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-md border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                        >
                            {copied ? (
                                <Check className="w-5 h-5 text-[var(--status-normal)]" />
                            ) : (
                                <Copy className="w-5 h-5 text-[var(--muted)]" />
                            )}
                            <span className="text-xs">{copied ? 'コピー済み' : 'コピー'}</span>
                        </button>
                    </div>

                    {/* プレビュー */}
                    <div ref={cardRef} className={`p-4 rounded-lg border ${getRiskBgColor()}`}>
                        <div className="text-xs text-[var(--muted)] mb-1">運休AI 予測</div>
                        <div className="font-bold text-sm mb-2">
                            {departureStation} → {arrivalStation}
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black">{prediction.probability}</span>
                            <span className="text-sm font-bold text-[var(--muted)]">%</span>
                            <span className={`ml-2 text-sm font-bold ${prediction.probability >= 50 ? 'text-[var(--status-suspended)]' :
                                prediction.probability >= 20 ? 'text-[var(--status-warning)]' :
                                    'text-[var(--status-normal)]'
                                }`}>
                                {prediction.status}
                            </span>
                        </div>
                        <div className="text-xs text-[var(--muted)] mt-2">
                            {prediction.reasons[0]}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
