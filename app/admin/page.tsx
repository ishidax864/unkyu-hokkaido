'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    MessageSquare,
    AlertTriangle,
    TrendingUp,
    BrainCircuit,
    Activity,
    ArrowRight,
    RefreshCcw,
    CheckCircle2,
    Database,
} from 'lucide-react';
import { UserFeedbackDB, getCrawlerStatusSummary, getMLTrainingStats } from '@/lib/supabase';

export default function AdminDashboard() {
    const [recentFeedback, setRecentFeedback] = useState<UserFeedbackDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [crawlerStatus, setCrawlerStatus] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [mlStats, setMlStats] = useState<any>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const abortController = new AbortController();
            const timeout = setTimeout(() => abortController.abort(), 10000);

            const [statsRes, feedbackRes, crawlerRes, mlRes] = await Promise.all([
                fetch('/api/admin/stats', { signal: abortController.signal }),
                fetch('/api/admin/feedback', { signal: abortController.signal }),
                getCrawlerStatusSummary(),
                getMLTrainingStats(),
            ]);

            clearTimeout(timeout);

            if (statsRes.ok && feedbackRes.ok) {
                const feedbackData = await feedbackRes.json();
                setRecentFeedback(feedbackData.items);
            }
            if (crawlerRes.success) setCrawlerStatus(crawlerRes.data);
            if (mlRes.success) setMlStats(mlRes.data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                setError('タイムアウト。接続を確認してください。');
            } else {
                setError('データの読み込みに失敗しました。');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/admin/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setRecentFeedback(prev =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item)
                );
            }
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const getAreaName = (id: string) => {
        const areas: Record<string, string> = {
            '01': '札幌近郊', '02': '道央', '03': '道北', '04': '道東', '05': '道南'
        };
        return areas[id] || `エリア ${id}`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
                    <p className="text-sm text-gray-500 mt-1">運休北海道の管理概要</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm disabled:opacity-50"
                >
                    <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    更新
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">{error}</p>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 font-bold">MLデータ蓄積</span>
                        <BrainCircuit className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-black text-gray-800">
                        {isLoading ? <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" /> : (mlStats?.totalRows?.toLocaleString() || '0')}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">今日 +{mlStats?.todayRows || 0} 件</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 font-bold">クローラー状態</span>
                        <Activity className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-black text-gray-800">
                        {isLoading ? <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" /> : (
                            crawlerStatus.every(s => s.status === 'success') ? (
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    正常
                                </span>
                            ) : '異常あり'
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{crawlerStatus.length} エリア監視中</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 font-bold">未処理フィードバック</span>
                        <MessageSquare className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-2xl font-black text-gray-800">
                        {isLoading ? <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" /> : recentFeedback.filter(f => f.status === 'open').length}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">全 {recentFeedback.length} 件</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 font-bold">ストレージ使用量</span>
                        <Database className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-black text-gray-800">
                        {isLoading ? <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" /> : `${mlStats?.estimatedStorageMB || 0} MB`}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">無料枠 500 MB</p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Crawler Health */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-gray-400" />
                            <h3 className="font-bold text-gray-800">クローラー稼動状況</h3>
                        </div>
                        <Link href="/admin/crawler" className="text-xs text-[var(--primary)] font-bold flex items-center gap-1 hover:underline">
                            詳細 <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="p-5">
                        {isLoading ? (
                            <div className="text-center py-4 text-gray-300 animate-pulse">読み込み中...</div>
                        ) : crawlerStatus.length === 0 ? (
                            <div className="text-center py-4 text-gray-400">直近のクローラーログなし</div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {crawlerStatus.map((item, idx) => (
                                    <div key={idx} className="py-3 flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold text-sm">{getAreaName(item.area_id)}</div>
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(item.fetched_at).toLocaleString('ja-JP')}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {item.status === 'success' ? '成功' : 'エラー'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ML Progress */}
                {mlStats && (
                    <div className="bg-white rounded-xl border border-purple-100 shadow-sm">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-purple-500" />
                                <h3 className="font-bold text-gray-800">ML学習データ</h3>
                            </div>
                            <Link href="/admin/crawler" className="text-xs text-[var(--primary)] font-bold flex items-center gap-1 hover:underline">
                                詳細 <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center bg-green-50 rounded-lg p-3">
                                    <div className="text-lg font-bold text-green-600">{mlStats.statusBreakdown.normal}</div>
                                    <div className="text-[10px] text-gray-500">通常</div>
                                </div>
                                <div className="text-center bg-yellow-50 rounded-lg p-3">
                                    <div className="text-lg font-bold text-yellow-600">{mlStats.statusBreakdown.delayed}</div>
                                    <div className="text-[10px] text-gray-500">遅延</div>
                                </div>
                                <div className="text-center bg-red-50 rounded-lg p-3">
                                    <div className="text-lg font-bold text-red-600">{mlStats.statusBreakdown.suspended}</div>
                                    <div className="text-[10px] text-gray-500">運休</div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-500">学習準備</span>
                                    <span className="text-xs text-gray-400">{mlStats.totalRows.toLocaleString()} / 10,000</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                                        style={{ width: `${Math.min(mlStats.totalRows / 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Feedback Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-gray-400" />
                        <h3 className="font-bold text-gray-800">最近のフィードバック</h3>
                    </div>
                    <span className="text-xs text-gray-400">{recentFeedback.length} 件</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-3">種類</th>
                                <th className="px-6 py-3">内容</th>
                                <th className="px-6 py-3">ステータス</th>
                                <th className="px-6 py-3">投稿日</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={4} className="px-6 py-4">
                                            <div className="h-4 bg-gray-50 animate-pulse rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : recentFeedback.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                        フィードバックはまだありません
                                    </td>
                                </tr>
                            ) : recentFeedback.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${row.type === 'bug' ? 'bg-red-100 text-red-700' :
                                            row.type === 'improvement' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {row.type === 'bug' ? 'バグ' : row.type === 'improvement' ? '改善' : 'その他'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-800 font-medium min-w-[300px] whitespace-pre-wrap break-words">
                                        {row.content}
                                    </td>
                                    <td className="px-6 py-4">
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
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {new Date(row.created_at!).toLocaleDateString('ja-JP')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
