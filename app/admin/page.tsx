'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    MessageSquare,
    AlertTriangle,
    TrendingUp,
} from 'lucide-react';
import { UserFeedbackDB } from '@/lib/supabase';

export default function AdminDashboard() {
    const [stats, setStats] = useState([
        { label: 'アクティブパートナー', value: '...', change: '', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: '累計ユーザー報告', value: '...', change: '', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
        { label: '未処理フィードバック', value: '...', change: '', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    ]);

    const [recentFeedback, setRecentFeedback] = useState<UserFeedbackDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, feedbackRes] = await Promise.all([
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/feedback')
                ]);

                if (statsRes.ok && feedbackRes.ok) {
                    const statsData = await statsRes.json();
                    const feedbackData = await feedbackRes.json();

                    setStats(prev => [
                        { ...prev[0], value: statsData.partnerCount.toString() },
                        { ...prev[1], value: statsData.reportCount.toString(), change: `+${statsData.recentReportCount}` },
                        { ...prev[2], value: statsData.feedbackCount.toString() },
                    ]);

                    setRecentFeedback(feedbackData.items);
                }
            } catch (error) {
                console.error('Failed to fetch admin data', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, []);

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

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                {stat.change && (
                                    <div className="flex items-center gap-1 text-[var(--status-normal)] text-sm font-bold">
                                        {stat.change}
                                        <TrendingUp className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-gray-500 text-sm mb-1">{stat.label}</div>
                                <div className="text-2xl font-black text-gray-800">
                                    {isLoading ? <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" /> : stat.value}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-8 text-nowrap">
                {/* Recent Feedback Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-gray-400" />
                            <h3 className="font-bold text-gray-800">最近のフィードバック</h3>
                        </div>
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
                                        <td className="px-6 py-4 text-gray-800 font-medium max-w-xs truncate" title={row.content}>
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
        </div>
    );
}
