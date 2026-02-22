'use client';

import Link from 'next/link';
import { TrendingUp, ShieldCheck, AlertTriangle, BarChart3, ArrowLeft, Check, Shield } from 'lucide-react';

export default function AccuracyPage() {
    const categories = [
        { name: '穏やかな天候', accuracy: 100, total: 130, emoji: '☀️' },
        { name: '境界域天候', accuracy: 100, total: 130, emoji: '🌤️' },
        { name: '極端な悪天候', accuracy: 100, total: 130, emoji: '🌪️' },
        { name: '公式ステータス反映', accuracy: 100, total: 104, emoji: '🚆' },
        { name: '気象警報', accuracy: 100, total: 78, emoji: '⚠️' },
        { name: '積雪深', accuracy: 100, total: 78, emoji: '❄️' },
        { name: 'エッジケース', accuracy: 100, total: 78, emoji: '🔬' },
        { name: '降水量', accuracy: 99, total: 104, emoji: '🌧️' },
        { name: '中程度天候', accuracy: 95, total: 130, emoji: '🌥️' },
        { name: '路線特性', accuracy: 92, total: 13, emoji: '🗺️' },
        { name: '復旧シナリオ', accuracy: 91, total: 104, emoji: '🔄' },
        { name: '時間帯', accuracy: 91, total: 104, emoji: '🕐' },
        { name: '季節変動', accuracy: 88, total: 104, emoji: '🍂' },
    ];

    return (
        <main className="min-h-screen bg-[var(--background-secondary)]">
            <header className="bg-[var(--primary)] text-white px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-bold">予測精度について</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* ヘッドライン数値 */}
                <section className="card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
                        <h2 className="text-lg font-bold">検証済み精度</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600">94.1<span className="text-sm">%</span></div>
                            <div className="text-[10px] text-blue-600/80 mt-0.5 font-medium">確率的中率</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-600">98.6<span className="text-sm">%</span></div>
                            <div className="text-[10px] text-green-600/80 mt-0.5 font-medium">ステータス的中率</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-purple-600">1,577</div>
                            <div className="text-[10px] text-purple-600/80 mt-0.5 font-medium">テスト件数</div>
                        </div>
                    </div>

                    <div className="bg-[var(--background-secondary)] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-green-600" />
                            <h3 className="font-bold text-sm text-[var(--foreground)]">安全側バイアス設計</h3>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                            運休を<strong>見逃すリスク</strong>を最小化するため、<strong>過大予測 5.1%</strong> に対し
                            <strong>過小予測はわずか 0.8%</strong> に設計されています。
                            「電車が止まるかもしれない」を早めに伝えることで、事前の行動判断を支援します。
                        </p>
                    </div>
                </section>

                {/* データソース */}
                <section className="card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-[var(--primary)]" />
                        <h2 className="text-lg font-bold">予測のデータソース</h2>
                    </div>
                    <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
                        5つの情報源を統合し、各要因に重み付けを行って総合的なリスクスコアを算出しています。
                    </p>

                    <div className="space-y-3">
                        {[
                            { icon: '🌨️', label: 'リアルタイム気象データ', desc: '風速・降雪量・気温・気圧をOpen-Meteo APIから毎時取得。多地点観測対応。', weight: '40%' },
                            { icon: '📊', label: '過去の運休パターン', desc: '過去の運休事例と気象条件のパターンマッチング', weight: '25%' },
                            { icon: '🚆', label: 'JR公式運行情報', desc: 'JR北海道の公式発表をリアルタイムで反映・適応補正', weight: '20%' },
                            { icon: '👥', label: 'ユーザー報告', desc: '現地のリアルタイム運行報告を集約・信頼度フィルタリング', weight: '10%' },
                            { icon: '🗺️', label: '路線脆弱性評価', desc: '13路線の風速閾値・降雪閾値・地形特性に基づく個別分析', weight: '5%' },
                        ].map(({ icon, label, desc, weight }) => (
                            <div key={label} className="flex items-start gap-3 p-3 bg-[var(--background-secondary)] rounded-lg">
                                <span className="text-xl flex-shrink-0">{icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">{label}</span>
                                        <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                                            {weight}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[var(--muted)] mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* カテゴリ別精度 */}
                <section className="card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />
                        <h2 className="text-lg font-bold">カテゴリ別の精度実績</h2>
                    </div>
                    <p className="text-[11px] text-[var(--muted)] mb-4">
                        17カテゴリ × 13路線を組み合わせた包括的テスト。代表的なカテゴリの結果：
                    </p>

                    <div className="space-y-2">
                        {categories.map(({ name, accuracy, total, emoji }) => (
                            <div key={name} className="flex items-center gap-2">
                                <span className="text-sm flex-shrink-0 w-5 text-center">{emoji}</span>
                                <span className="text-xs font-medium w-28 flex-shrink-0 truncate">{name}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${accuracy === 100 ? 'bg-green-500' :
                                                accuracy >= 95 ? 'bg-blue-500' :
                                                    accuracy >= 90 ? 'bg-blue-400' :
                                                        'bg-yellow-500'
                                            }`}
                                        style={{ width: `${accuracy}%` }}
                                    />
                                </div>
                                <span className={`text-xs font-bold w-12 text-right ${accuracy === 100 ? 'text-green-600' :
                                        accuracy >= 95 ? 'text-blue-600' :
                                            accuracy >= 90 ? 'text-blue-500' :
                                                'text-yellow-600'
                                    }`}>
                                    {accuracy}%
                                </span>
                                <span className="text-[10px] text-[var(--muted)] w-8 text-right">({total})</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 検証方法 */}
                <section className="card p-6">
                    <h2 className="text-lg font-bold mb-3">検証方法</h2>
                    <div className="space-y-3 text-sm text-[var(--muted)] leading-relaxed">
                        <p>
                            1,577件のテストケースは、以下の条件を体系的に組み合わせて設計しています：
                        </p>
                        <ul className="space-y-1.5 text-[11px]">
                            <li className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span><strong>天候条件</strong>：穏やか→境界→中程度→極端の4段階</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span><strong>路線</strong>：JR北海道13路線すべてで個別テスト</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span><strong>公式ステータス</strong>：通常・遅延・運休・一部運休の各状態</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span><strong>時間帯・季節</strong>：朝ラッシュ・夜間・真冬・夏場など</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span><strong>複合リスク</strong>：風+雪+積雪の組み合わせシナリオ</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 注意事項 */}
                <section className="card p-6 border-l-4 border-orange-300">
                    <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        ご利用にあたっての注意
                    </h2>
                    <ul className="space-y-2 text-sm text-[var(--muted)]">
                        <li>• 本サービスはAIによる予測であり、JR北海道の公式見解ではありません</li>
                        <li>• 天気予報の精度や突発的な事象（鹿衝突等）により予測が外れる場合があります</li>
                        <li>• 重要な移動の際は、必ずJR北海道公式サイトで最新情報をご確認ください</li>
                        <li>• 予測精度は継続的なテストと改善を行っています</li>
                    </ul>
                </section>

                <div className="text-center pt-4 pb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-opacity"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        トップに戻る
                    </Link>
                </div>
            </div>
        </main>
    );
}
