'use client';

import React, { useEffect, useState } from 'react';
import { getCrawlerStatusSummary, getAccuracyImpactStats } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    Database,
    TrendingUp,
    RefreshCcw,
    AlertTriangle
} from 'lucide-react';

const RelativeTime = ({ date }: { date: string }) => {
    const [text, setText] = useState('');

    useEffect(() => {
        const d = new Date(date);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

        const rtf = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });

        if (diffInSeconds < 60) setText(rtf.format(-diffInSeconds, 'second'));
        else if (diffInSeconds < 3600) setText(rtf.format(-Math.floor(diffInSeconds / 60), 'minute'));
        else if (diffInSeconds < 86400) setText(rtf.format(-Math.floor(diffInSeconds / 3600), 'hour'));
        else setText(d.toLocaleDateString());
    }, [date]);

    return <span>{text}</span>;
};

export default function CrawlerMonitoringPage() {
    const [statusSummary, setStatusSummary] = useState<any[]>([]);
    const [impactStats, setImpactStats] = useState<any>(null);
    const [accuracyStats, setAccuracyStats] = useState<any>(null); // 🆕
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statusRes, impactRes, accuracyRes] = await Promise.all([
                getCrawlerStatusSummary(),
                getAccuracyImpactStats(),
                import('@/lib/supabase').then(m => m.getAverageAccuracyScore()) // 🆕
            ]);

            if (statusRes.success) setStatusSummary(statusRes.data);
            if (impactRes.success) setImpactStats(impactRes.data);
            if (accuracyRes.success) setAccuracyStats(accuracyRes.data);

            if (!statusRes.success || !impactRes.success) {
                setError('データベース連携に失敗しました。認証設定を確認してください。');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getStatusBadge = (status: string) => {
        if (status === 'success') return <Badge className="bg-green-500 hover:bg-green-600 border-none text-white">Success</Badge>;
        return <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-200">Error</Badge>;
    };

    const getAreaName = (id: string) => {
        const areas: Record<string, string> = {
            '01': '札幌近郊',
            '02': '道央エリア',
            '03': '道北エリア',
            '04': '道東エリア',
            '05': '道南エリア'
        };
        return areas[id] || `Area ${id}`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Crawler & Accuracy Monitoring</h1>
                <button
                    onClick={fetchData}
                    className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
                >
                    <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
                </button>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    {error}
                </div>
            )}

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mean Accuracy</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {accuracyStats ? `${accuracyStats.averageScore}点` : '--点'}
                        </div>
                        <p className="text-xs text-muted-foreground">Based on {accuracyStats?.scoredCount || 0} scored outcomes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Accuracy Lift</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {impactStats ? `${impactStats.ratio.toFixed(1)}%` : '--%'}
                        </div>
                        <p className="text-xs text-muted-foreground">Predictions influenced by official data</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                        <Database className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {impactStats ? impactStats.total : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">Total predictions logged</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Crawler Health */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-primary" />
                            JR Crawler Health Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8">Loading crawler logs...</div>
                            ) : statusSummary.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No crawler logs found in the last 24h.</div>
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
                                            {getStatusBadge(item.status)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Accuracy Outlook */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                            Accuracy Accumulation Outlook
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                            <h4 className="font-semibold text-primary mb-2">How this improves prediction:</h4>
                            <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                                <li><strong>Dynamic Bias</strong>: Official delays increase risk multipliers automatically.</li>
                                <li><strong>Floor Maintenance</strong>: Recent suspensions keep risk high during recovery.</li>
                                <li><strong>Custom Thresholds</strong>: Accumulated logs help fine-tune route-specific tolerances.</li>
                            </ul>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Currently, <strong>{impactStats?.influenced || 0}</strong> predictions were enhanced by incorporating real-time official operational data from the crawler.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
