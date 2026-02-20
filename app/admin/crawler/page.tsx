/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { getCrawlerStatusSummary, getMLTrainingStats } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertTriangle,
    RefreshCcw,
    BrainCircuit,
    Thermometer,
    Wind,
    Snowflake,
    BarChart3,
    Database,
} from 'lucide-react';

export default function CrawlerMLPage() {
    const [crawlerStatus, setCrawlerStatus] = useState<any[]>([]);
    const [mlStats, setMlStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [cRes, mRes] = await Promise.all([
                getCrawlerStatusSummary(),
                getMLTrainingStats(),
            ]);
            if (cRes.success) setCrawlerStatus(cRes.data);
            if (mRes.success) setMlStats(mRes.data);
            if (!cRes.success && !mRes.success) setError('データ取得に失敗しました');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const areaName = (id: string) => {
        const m: Record<string, string> = { '01': '札幌近郊', '02': '道央', '03': '道北', '04': '道東', '05': '道南' };
        return m[id] || `エリア ${id}`;
    };

    const pct = (n: number, total: number) => total > 0 ? (n / total * 100).toFixed(1) : '0';

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">データ収集 & ML</h1>
                    <p className="text-sm text-gray-500 mt-1">クローラー稼動状況と ML トレーニングデータの詳細</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm disabled:opacity-50 transition-colors"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    更新
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-800">
                    <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}

            {/* ─── クローラー稼動一覧 ─── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-600" />
                        クローラー稼動状況
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-6 text-center text-gray-400 animate-pulse">読み込み中...</div>
                    ) : crawlerStatus.length === 0 ? (
                        <div className="py-6 text-center text-gray-400">直近24時間のログなし</div>
                    ) : (
                        <div className="divide-y">
                            {crawlerStatus.map((item, i) => (
                                <div key={i} className="py-3 flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-sm">{areaName(item.area_id)}</div>
                                        <div className="text-[11px] text-gray-400">
                                            {new Date(item.fetched_at).toLocaleString('ja-JP')}
                                        </div>
                                        {item.error_message && (
                                            <div className="text-[11px] text-red-500 mt-1">{item.error_message}</div>
                                        )}
                                    </div>
                                    <Badge className={`border-none text-white text-[10px] ${item.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                        }`}>
                                        {item.status === 'success' ? '成功' : 'エラー'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── ML トレーニングデータ ─── */}
            {mlStats && (
                <Card className="border-purple-100">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-purple-600" />
                            ML トレーニングデータ
                            <span className="ml-auto text-sm font-normal text-gray-400">
                                {mlStats.totalRows.toLocaleString()} 件
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* ステータス分布 */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1">
                                <BarChart3 className="w-3.5 h-3.5" /> ステータス分布
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: '通常運行', count: mlStats.statusBreakdown.normal, color: 'green' },
                                    { label: '遅延', count: mlStats.statusBreakdown.delayed, color: 'yellow' },
                                    { label: '運休', count: mlStats.statusBreakdown.suspended, color: 'red' },
                                ].map(({ label, count, color }) => (
                                    <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4 text-center`}>
                                        <div className={`text-xl font-bold text-${color}-600`}>{count}</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
                                        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full bg-${color}-500 rounded-full`}
                                                style={{ width: `${pct(count, mlStats.totalRows)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 最新の気象データ */}
                        {mlStats.latestWeather && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1">
                                    <Snowflake className="w-3.5 h-3.5" /> 最新の気象データ
                                </h4>
                                <div className="bg-white border rounded-lg p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { icon: Thermometer, color: 'text-orange-500', value: `${mlStats.latestWeather.temperature ?? '--'}°C`, label: '気温' },
                                            { icon: Wind, color: 'text-blue-500', value: `${mlStats.latestWeather.wind_speed ?? '--'} km/h`, label: '風速' },
                                            { icon: Snowflake, color: 'text-cyan-500', value: `${mlStats.latestWeather.snowfall ?? '--'} cm`, label: '降雪量' },
                                            { icon: Database, color: 'text-gray-500', value: `${mlStats.latestWeather.snow_depth ?? '--'} cm`, label: '積雪深' },
                                        ].map(({ icon: Icon, color, value, label }) => (
                                            <div key={label} className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${color}`} />
                                                <div>
                                                    <div className="text-base font-bold">{value}</div>
                                                    <div className="text-[10px] text-gray-500">{label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 text-[10px] text-gray-400">
                                        {areaName(mlStats.latestWeather.area_id)} ·
                                        最終記録 {new Date(mlStats.latestWeather.recorded_at).toLocaleString('ja-JP')}
                                        {mlStats.oldestRecord && <> · 蓄積開始 {new Date(mlStats.oldestRecord).toLocaleDateString('ja-JP')}</>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 学習準備プログレスバー */}
                        <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-600">ML 学習準備状況</span>
                                <span className="text-[11px] text-gray-500">{mlStats.totalRows.toLocaleString()} / 10,000</span>
                            </div>
                            <div className="h-2.5 bg-white rounded-full overflow-hidden border border-purple-100">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(mlStats.totalRows / 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2">
                                {mlStats.totalRows < 1000 ? '📊 蓄積中 — 1,000件でパターン分析が可能に'
                                    : mlStats.totalRows < 5000 ? '📈 パターン検出中 — 5,000件で有意な予測モデル構築が可能に'
                                        : mlStats.totalRows < 10000 ? '🎯 十分なデータ量 — ML学習を開始できます'
                                            : '🚀 企業提供レベルの品質に到達'}
                            </p>
                            <div className="mt-3 text-[10px] text-gray-400">
                                ストレージ: {mlStats.estimatedStorageMB} MB / 500 MB (無料枠)
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
