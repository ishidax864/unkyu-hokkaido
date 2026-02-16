'use client';

import { Plus, MoreVertical, Key } from 'lucide-react';

export default function PartnerManagement() {
    const partners = [
        { name: '北海道タクシー連合', industry: 'タクシー', tier: 'enterprise', keys: 2, status: 'active' },
        { name: '物流ロジQ', industry: '物流/運送', tier: 'pro', keys: 1, status: 'active' },
        { name: '北国トラベル', industry: '観光', tier: 'free', keys: 1, status: 'inactive' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm">登録済みのB2Bパートナーを管理します。</p>
                <button className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    新規パートナー登録
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">パートナー名</th>
                            <th className="px-6 py-4">業種</th>
                            <th className="px-6 py-4">プラン</th>
                            <th className="px-6 py-4">APIキー数</th>
                            <th className="px-6 py-4">ステータス</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                        {partners.map((partner, i) => (
                            <tr key={i} className="hover:bg-gray-50/50 group">
                                <td className="px-6 py-4 font-bold text-gray-900">{partner.name}</td>
                                <td className="px-6 py-4 text-gray-500">{partner.industry}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${partner.tier === 'enterprise' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                        partner.tier === 'pro' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {partner.tier}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <Key className="w-3.5 h-3.5 text-gray-400" />
                                    {partner.keys}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${partner.status === 'active' ? 'bg-[var(--status-normal)]' : 'bg-gray-300'}`} />
                                        <span className="text-xs">{partner.status === 'active' ? '有効' : '無効'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg">
                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
