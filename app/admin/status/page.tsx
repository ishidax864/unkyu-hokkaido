'use client';

import { useState, useEffect } from 'react';
import {
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Clock,
    Search
} from 'lucide-react';
import { JROperationStatus } from '@/lib/jr-status';

export default function AdminStatusPage() {
    const [statusData, setStatusData] = useState<JROperationStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/status');
            if (res.ok) {
                const data = await res.json();
                setStatusData(data.items);
                setLastUpdated(new Date().toLocaleTimeString());
            }
        } catch (error) {
            console.error('Failed to fetch status', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const filteredData = statusData.filter(item =>
        item.routeName.includes(filter) ||
        item.statusText.includes(filter) ||
        (item.rawText && item.rawText.includes(filter))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">運行状況監視モニター</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        JR北海道の公式サイトから取得した生の運行情報と、システムの判定結果を表示します。
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <span className="text-xs text-gray-400">
                            最終更新: {lastUpdated}
                        </span>
                    )}
                    <button
                        onClick={fetchStatus}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        更新
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="路線名、状況、キーワードで検索..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">路線名 / ID</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">判定ステータス</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">判定テキスト</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Raw Text (概況)</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">取得元エリア</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {isLoading && statusData.length === 0 ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-12"></div></td>
                                    </tr>
                                ))
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                        データが見つかりません
                                    </td>
                                </tr>
                            ) : filteredData.map((item) => (
                                <tr key={item.routeId} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-bold text-gray-900">{item.routeName}</div>
                                        <div className="text-[10px] text-gray-400 font-mono mt-1">{item.routeId}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'suspended' || item.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                item.status === 'delay' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-green-100 text-green-700'
                                            }`}>
                                            {item.status === 'suspended' || item.status === 'cancelled' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                                                item.status === 'delay' ? <Clock className="w-3.5 h-3.5" /> :
                                                    <CheckCircle className="w-3.5 h-3.5" />}
                                            {item.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-top text-gray-700">
                                        {item.statusText}
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded border border-gray-100 leading-relaxed max-h-32 overflow-y-auto w-full">
                                            {item.rawText || '(No raw text provided)'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                                            {item.sourceArea || 'N/A'}
                                        </span>
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
