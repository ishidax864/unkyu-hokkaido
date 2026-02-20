'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    BrainCircuit,
    Activity,
    ArrowRight,
    RefreshCcw,
    CheckCircle2,
    Database,
    MessageSquare,
    MapPin,
} from 'lucide-react';
import { UserFeedbackDB, getMLTrainingStats } from '@/lib/supabase';

export default function AdminDashboard() {
    const [feedback, setFeedback] = useState<UserFeedbackDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<{ reports: number; recentReports: number; feedbackOpen: number } | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [crawlerOk, setCrawlerOk] = useState<boolean | null>(null);
    const [mlTotal, setMlTotal] = useState<number>(0);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [statsRes, feedbackRes, statusRes, mlRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/feedback'),
                fetch('/api/admin/status'),
                getMLTrainingStats(),
            ]);

            if (statsRes.ok) {
                const s = await statsRes.json();
                setStats({ reports: s.reportCount || 0, recentReports: s.recentReportCount || 0, feedbackOpen: s.feedbackCount || 0 });
            }
            if (feedbackRes.ok) {
                const f = await feedbackRes.json();
                setFeedback(f.items || []);
            }
            if (statusRes.ok) {
                const data = await statusRes.json();
                const items = data.items || [];
                setCrawlerOk(items.length > 0 && items.every((s: any) => s.status === 'normal'));
            }
            if (mlRes.success) setMlTotal(mlRes.data.totalRows || 0);
        } catch {
            setError('データの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/admin/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setFeedback(prev =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item)
                );
            }
        } catch { /* ignore */ }
    };

    const Skeleton = () => <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />;

    return (
        <div className="space-y-8 max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
                <button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm disabled:opacity-50 transition-colors"
                >
                    <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    更新
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-800">
                    <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}

            {/* KPI Cards — 数字だけ、詳細は各ページへ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ML データ */}
                <Link href="/admin/crawler" className="group bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] text-gray-500 font-bold">ML データ</span>
                        <BrainCircuit className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
                    </div>
                    <div className="text-2xl font-black text-gray-800">
                        {isLoading ? <Skeleton /> : mlTotal.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 group-hover:text-purple-500 transition-colors">
                        詳細を見る <ArrowRight className="w-3 h-3" />
                    </div>
                </Link>

                {/* クローラー */}
                <Link href="/admin/crawler" className="group bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] text-gray-500 font-bold">クローラー</span>
                        <Activity className="w-4 h-4 text-green-400 group-hover:text-green-600 transition-colors" />
                    </div>
                    <div className="text-2xl font-black text-gray-800">
                        {isLoading ? <Skeleton /> : crawlerOk === null ? '--' : (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className={`w-6 h-6 ${crawlerOk ? 'text-green-500' : 'text-red-500'}`} />
                                {crawlerOk ? '正常' : '異常'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 group-hover:text-green-500 transition-colors">
                        詳細を見る <ArrowRight className="w-3 h-3" />
                    </div>
                </Link>

                {/* 現地報告 */}
                <Link href="/admin/reports" className="group bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] text-gray-500 font-bold">現地報告</span>
                        <MapPin className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="text-2xl font-black text-gray-800">
                        {isLoading ? <Skeleton /> : (
                            <span>{stats?.reports || 0}<span className="text-sm font-medium text-gray-400 ml-1">件</span></span>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">直近24h: {stats?.recentReports || 0} 件</div>
                </Link>

                {/* フィードバック */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] text-gray-500 font-bold">未対応フィードバック</span>
                        <MessageSquare className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="text-2xl font-black text-gray-800">
                        {isLoading ? <Skeleton /> : (
                            <span>{stats?.feedbackOpen || 0}<span className="text-sm font-medium text-gray-400 ml-1">件</span></span>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">全 {feedback.length} 件</div>
                </div>
            </div>

            {/* Feedback Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        フィードバック一覧
                    </h3>
                    <span className="text-xs text-gray-400">{feedback.length} 件</span>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-gray-50/80 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-2.5 w-20">種類</th>
                            <th className="px-6 py-2.5">内容</th>
                            <th className="px-6 py-2.5 w-28">ステータス</th>
                            <th className="px-6 py-2.5 w-24">投稿日</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <tr key={i}><td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-50 animate-pulse rounded" /></td></tr>
                            ))
                        ) : feedback.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">フィードバックはまだありません</td></tr>
                        ) : feedback.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-3">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${row.type === 'bug' ? 'bg-red-100 text-red-700' :
                                        row.type === 'improvement' ? 'bg-purple-100 text-purple-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {row.type === 'bug' ? 'バグ' : row.type === 'improvement' ? '改善' : 'その他'}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-gray-800 break-words max-w-md">{row.content}</td>
                                <td className="px-6 py-3">
                                    <select
                                        value={row.status || 'open'}
                                        onChange={(e) => row.id && handleStatusUpdate(row.id, e.target.value)}
                                        className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer hover:text-[var(--primary)]"
                                    >
                                        <option value="open">未対応</option>
                                        <option value="in_progress">対応中</option>
                                        <option value="closed">完了</option>
                                    </select>
                                </td>
                                <td className="px-6 py-3 text-gray-400 text-xs whitespace-nowrap">
                                    {new Date(row.created_at!).toLocaleDateString('ja-JP')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
