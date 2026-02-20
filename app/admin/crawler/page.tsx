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
    HardDrive,
    Database
} from 'lucide-react';

const RelativeTime = ({ date }: { date: string }) => {
    const getRelativeText = () => {
        const d = new Date(date);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
        const rtf = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });

        if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
        if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
        if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
        return d.toLocaleDateString('ja-JP');
    };

    const [text, setText] = useState(() => getRelativeText());

    useEffect(() => {
        const timer = setInterval(() => setText(getRelativeText()), 30000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    return <span>{text}</span>;
};

export default function CrawlerMonitoringPage() {
    const [statusSummary, setStatusSummary] = useState<any[]>([]);
    const [mlStats, setMlStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statusRes, mlRes] = await Promise.all([
                getCrawlerStatusSummary(),
                getMLTrainingStats()
            ]);

            if (statusRes.success) setStatusSummary(statusRes.data);
            if (mlRes.success) setMlStats(mlRes.data);

            if (!statusRes.success) {
                setError('データベース連携に失敗しました。認証設定を確認してください。');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getAreaName = (id: string) => {
        const areas: Record<string, string> = {
            '01': '札幌近郊',
            '02': '道央エリア',
            '03': '道北エリア',
            '04': '道東エリア',
            '05': '道南エリア'
        };
        return areas[id] || `エリア ${id}`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">クローラー & ML 監視</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        データ収集と機械学習トレーニングデータの状況
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 更新
                </button>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    {error}
                </div>
            )}

            {/* サマリーカード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">MLデータ総件数</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loading ? '--' : (mlStats?.totalRows?.toLocaleString() || '0')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            今日 +{mlStats?.todayRows || 0} 件
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ストレージ使用量</CardTitle>
                        <HardDrive className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loading ? '--' : `${mlStats?.estimatedStorageMB || 0} MB`}
                        </div>
                        <p className="text-xs text-muted-foreground">無料枠 500 MB 中</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">監視エリア数</CardTitle>
                        <Database className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loading ? '--' : statusSummary.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {statusSummary.every(s => s.status === 'success') ? '全エリア正常' : '異常あり'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ML Training Data Monitor */}
            {mlStats && (
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <BrainCircuit className="w-5 h-5 mr-2 text-purple-600" />
                            ML トレーニングデータ
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* ステータス分布 */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center">
                                <BarChart3 className="w-4 h-4 mr-1" /> ステータス分布
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white border border-green-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {mlStats.statusBreakdown.normal}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">通常運行</div>
                                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${mlStats.totalRows > 0 ? (mlStats.statusBreakdown.normal / mlStats.totalRows * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="bg-white border border-yellow-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {mlStats.statusBreakdown.delayed}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">遅延</div>
                                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-500 rounded-full"
                                            style={{ width: `${mlStats.totalRows > 0 ? (mlStats.statusBreakdown.delayed / mlStats.totalRows * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="bg-white border border-red-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                        {mlStats.statusBreakdown.suspended}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">運休</div>
                                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full"
                                            style={{ width: `${mlStats.totalRows > 0 ? (mlStats.statusBreakdown.suspended / mlStats.totalRows * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 最新の気象データ */}
                        {mlStats.latestWeather && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center">
                                    <Snowflake className="w-4 h-4 mr-1" /> 最新の気象データ
                                </h4>
                                <div className="bg-white border rounded-lg p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="flex items-center gap-2">
                                            <Thermometer className="w-4 h-4 text-orange-500" />
                                            <div>
                                                <div className="text-lg font-bold">{mlStats.latestWeather.temperature ?? '--'}°C</div>
                                                <div className="text-[10px] text-gray-500">気温</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Wind className="w-4 h-4 text-blue-500" />
                                            <div>
                                                <div className="text-lg font-bold">{mlStats.latestWeather.wind_speed ?? '--'} km/h</div>
                                                <div className="text-[10px] text-gray-500">風速</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Snowflake className="w-4 h-4 text-cyan-500" />
                                            <div>
                                                <div className="text-lg font-bold">{mlStats.latestWeather.snowfall ?? '--'} cm</div>
                                                <div className="text-[10px] text-gray-500">降雪量</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Database className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <div className="text-lg font-bold">{mlStats.latestWeather.snow_depth ?? '--'} cm</div>
                                                <div className="text-[10px] text-gray-500">積雪深</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-gray-400">
                                        最終記録: {new Date(mlStats.latestWeather.recorded_at).toLocaleString('ja-JP')} ·
                                        エリア: {getAreaName(mlStats.latestWeather.area_id)}
                                        {mlStats.oldestRecord && (
                                            <> · データ蓄積開始: {new Date(mlStats.oldestRecord).toLocaleDateString('ja-JP')}</>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 学習準備プログレスバー */}
                        <div className="bg-white border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold text-gray-600">ML学習準備状況</span>
                                <span className="text-xs text-gray-500">
                                    {mlStats.totalRows.toLocaleString()} / 10,000 行
                                </span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(mlStats.totalRows / 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                {mlStats.totalRows < 1000
                                    ? '📊 データ蓄積中... 1,000件以上で基本的なパターン分析が可能になります'
                                    : mlStats.totalRows < 5000
                                        ? '📈 パターンが見え始めています。5,000件で有意な予測モデルが構築可能に'
                                        : mlStats.totalRows < 10000
                                            ? '🎯 十分なデータ量です。MLモデルの学習を開始できます'
                                            : '🚀 企業向けデータ提供が可能な品質に達しています'
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* クローラー稼動状況 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-primary" />
                        クローラー稼動状況
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-8 text-gray-400 animate-pulse">読み込み中...</div>
                        ) : statusSummary.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">直近24時間のクローラーログなし</div>
                        ) : (
                            <div className="divide-y">
                                {statusSummary.map((item, idx) => (
                                    <div key={idx} className="py-3 flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold">{getAreaName(item.area_id)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                最終取得: <RelativeTime date={item.fetched_at} />
                                            </div>
                                            {item.error_message && (
                                                <div className="text-xs text-destructive mt-1">{item.error_message}</div>
                                            )}
                                        </div>
                                        <Badge className={`border-none text-white ${item.status === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                                            }`}>
                                            {item.status === 'success' ? '成功' : 'エラー'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
