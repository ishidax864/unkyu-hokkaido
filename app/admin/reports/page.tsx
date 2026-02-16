'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { UserReportDB } from '@/lib/supabase';

export default function ReportsManagement() {
    const [reports, setReports] = useState<UserReportDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchReports() {
            try {
                const res = await fetch('/api/admin/reports');
                if (res.ok) {
                    const data = await res.json();
                    setReports(data.items);
                }
            } catch (error) {
                console.error('Failed to fetch reports', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchReports();
    }, []);

    const unverifiedCount = reports.filter(r => r.report_type !== 'normal').length;

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-1 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-500 font-bold mb-1">未処理の報告 (直近)</div>
                        <div className="text-2xl font-black text-gray-800">
                            {isLoading ? '...' : unverifiedCount}
                        </div>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500 opacity-20" />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">種類</th>
                                <th className="px-6 py-4">路線</th>
                                <th className="px-6 py-4">報告内容</th>
                                <th className="px-6 py-4">時刻</th>
                                <th className="px-6 py-4 text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-300 animate-pulse">
                                        読み込み中...
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                        報告はまだありません
                                    </td>
                                </tr>
                            ) : reports.map((report) => (
                                <tr key={report.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${report.report_type === 'stopped' ? 'bg-red-100 text-red-700' :
                                            report.report_type === 'delayed' ? 'bg-yellow-100 text-yellow-700' :
                                                report.report_type === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {report.report_type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{report.route_id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-800">{report.comment || '(コメントなし)'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-xs text-nowrap">
                                        {new Date(report.created_at!).toLocaleString('ja-JP')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="削除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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
