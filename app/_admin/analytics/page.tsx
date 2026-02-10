'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Calendar } from 'lucide-react';

// Mock data
const apiUsageData = [
    { name: '02/04', requests: 4000 },
    { name: '02/05', requests: 3000 },
    { name: '02/06', requests: 2000 },
    { name: '02/07', requests: 2780 },
    { name: '02/08', requests: 1890 },
    { name: '02/09', requests: 2390 },
    { name: '02/10', requests: 3490 },
];

const reportTrendData = [
    { name: '02/04', count: 120 },
    { name: '02/05', count: 150 },
    { name: '02/06', count: 80 },
    { name: '02/07', count: 90 },
    { name: '02/08', count: 200 },
    { name: '02/09', count: 180 },
    { name: '02/10', count: 250 },
];

export default function AnalyticsPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 font-medium hover:bg-gray-50 transition-colors">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        過去7日間
                    </button>
                </div>
                <button className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 font-medium hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4 text-gray-400" />
                    CSVエクスポート
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* API Usage Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">B2B API 利用実績</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={apiUsageData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="requests" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Reports Trend */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">ユーザー報告件数の推移</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={reportTrendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="var(--status-suspended)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: 'var(--status-suspended)', strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Metrics Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">パートナー別利用状況</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">パートナー名</th>
                            <th className="px-6 py-4">リクエスト数</th>
                            <th className="px-6 py-4">エラー率</th>
                            <th className="px-6 py-4">平均レスポンス</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {[
                            { name: '北海道タクシー連合', req: '42,900', error: '0.02%', latency: '112ms' },
                            { name: '物流ロジQ', req: '31,200', error: '0.05%', latency: '128ms' },
                            { name: '北国トラベル', req: '11,300', error: '0.12%', latency: '145ms' },
                        ].map((p, i) => (
                            <tr key={i}>
                                <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                                <td className="px-6 py-4 text-gray-500 font-medium">{p.req}</td>
                                <td className="px-6 py-4 text-[var(--status-normal)] font-bold">{p.error}</td>
                                <td className="px-6 py-4 text-gray-400">{p.latency}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
