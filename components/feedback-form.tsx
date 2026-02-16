
'use client';

import { useState } from 'react';
import { MessageSquare, X, Send, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface FeedbackFormProps {
    onClose: () => void;
}

export function FeedbackForm({ onClose }: FeedbackFormProps) {
    const [type, setType] = useState<'bug' | 'improvement' | 'other'>('improvement');
    const [content, setContent] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    content,
                    email,
                    pageUrl: window.location.href,
                }),
            });

            if (res.ok) {
                setIsSuccess(true);
                setTimeout(() => onClose(), 2000);
            } else {
                const data = await res.json();
                setError(data.error || '送信に失敗しました');
            }
        } catch (_err) {
            setError('ネットワークエラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">送信完了！</h3>
                <p className="text-gray-500 text-sm">フィードバックありがとうございます。<br />サービスの向上に役立てさせていただきます。</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black text-gray-800">フィードバック</h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'improvement', label: '改善提案', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { id: 'bug', label: 'バグ報告', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                        { id: 'other', label: 'その他', icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50' },
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onClick={() => setType(opt.id as any)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${type === opt.id
                                ? 'border-blue-500 ring-2 ring-blue-50/50 shadow-sm'
                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <div className={`${opt.bg} ${opt.color} p-2 rounded-lg`}>
                                <opt.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-600">{opt.label}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 ml-1">内容*</label>
                    <textarea
                        required
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="使いにくい点や改善してほしいことなど、気軽にご記入ください。"
                        className="w-full h-32 p-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 ml-1">メールアドレス（任意）</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="返信が必要な場合にご記入ください"
                        className="w-full p-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting || !content.trim()}
                    className="w-full py-4 bg-[var(--primary)] text-white font-black rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>送信する</span>
                            <Send className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
