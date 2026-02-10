'use client';

import {
    Users,
    MessageSquare,
    Activity,
    AlertTriangle,
    ArrowUpRight,
    TrendingUp
} from 'lucide-react';

export default function AdminDashboard() {
    const stats = [
        { label: 'アクティブパートナー', value: '12', change: '+2', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: '累計ユーザー報告', value: '1,280', change: '+45', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
        { label: '24h APIリクエスト', value: '85.4k', change: '+12%', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: '未処理アラート', value: '3', change: '-1', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1 text-[var(--status-normal)] text-sm font-bold">
                                    {stat.change}
                                    <TrendingUp className="w-3 h-3" />
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-sm mb-1">{stat.label}</div>
                                <div className="text-2xl font-black text-gray-800">{stat.value}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Reports Table Sample */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">最近のユーザー報告</h3>
                        <button className="text-sm text-[var(--primary)] font-bold">すべて見る</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">路線Id</th>
                                    <th className="px-6 py-3">種類</th>
                                    <th className="px-6 py-3">内容</th>
                                    <th className="px-6 py-3">時刻</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {[
                                    { route: 'hakodate-main', type: '運休', comment: '倒木で停止中', time: '5分前' },
                                    { route: 'chitose-line', type: '遅延', comment: '雪の影響', time: '12分前' },
                                    { route: 'sassho-line', type: '通常', comment: '再開しました', time: '20分前' },
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-medium text-gray-800">{row.route}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${row.type === '運休' ? 'bg-red-100 text-red-700' :
                                                    row.type === '遅延' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {row.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{row.comment}</td>
                                        <td className="px-6 py-4 text-gray-400 text-xs">{row.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-6">システムヘルス</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">API レスポンスタイム</span>
                                <span className="font-bold text-[var(--status-normal)]">124ms</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[var(--status-normal)] w-[95%]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">DB 接続負荷</span>
                                <span className="font-bold text-yellow-600">42%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 w-[42%]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">メモリ使用率</span>
                                <span className="font-bold text-gray-800">28%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[var(--primary)] w-[28%]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
