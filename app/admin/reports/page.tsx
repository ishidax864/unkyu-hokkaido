'use client';

import { CheckCircle, XCircle, Trash2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ReportsManagement() {
    const reports = [
        { route: 'hakodate-main', user: 'u728', type: 'stopped', comment: '新函館北斗駅で運転見合わせの放送あり', isVerified: true, time: '2026/02/10 17:30' },
        { route: 'chitose-line', user: 'u911', type: 'delayed', comment: '看板が飛んできたとかで止まってます', isVerified: false, time: '2026/02/10 17:42' },
        { route: 'sassho-line', user: 'u105', type: 'normal', comment: '除雪終わったみたい', isVerified: true, time: '2026/02/10 17:45' },
        { route: 'muroran-main', user: 'u442', type: 'crowded', comment: '振替輸送のバス待ちですごい列', isVerified: false, time: '2026/02/10 17:48' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-1 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-500 font-bold mb-1">未処理の報告</div>
                        <div className="text-2xl font-black text-gray-800">8</div>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500 opacity-20" />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-1 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-500 font-bold mb-1">本日の削除済み</div>
                        <div className="text-2xl font-black text-gray-800">2</div>
                    </div>
                    <Trash2 className="w-8 h-8 text-red-500 opacity-20" />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">ステータス</th>
                                <th className="px-6 py-4">路線 / ユーザー</th>
                                <th className="px-6 py-4">報告内容</th>
                                <th className="px-6 py-4">時刻</th>
                                <th className="px-6 py-4 text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {reports.map((report, i) => (
                                <tr key={i} className={`hover:bg-gray-50/50 ${!report.isVerified ? 'bg-orange-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${report.type === 'stopped' ? 'bg-red-100 text-red-700' :
                                                report.type === 'delayed' ? 'bg-yellow-100 text-yellow-700' :
                                                    report.type === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {report.type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{report.route}</div>
                                        <div className="text-[10px] text-gray-400">ID: {report.user}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {report.isVerified && (
                                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                            )}
                                            <span className="text-gray-800">{report.comment}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">{report.time}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                className={`p-2 rounded-lg transition-colors ${report.isVerified ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'}`}
                                                title="認証済みとしてマーク"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="スパムとして削除"
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
