import { BrainCircuit, Radio, Bus, TrendingUp, Shield, Route, Zap, X, Check } from 'lucide-react';
import Link from 'next/link';

export function ServiceFeatures() {
    return (
        <section className="py-8 md:py-12 border-t border-[var(--border)]" aria-labelledby="features-heading">
            <div className="text-center mb-10">
                <span className="inline-block py-1 px-3 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-3 tracking-wide">
                    運休北海道の特徴
                </span>
                <h2 id="features-heading" className="text-2xl md:text-3xl font-bold text-[var(--foreground)] leading-tight mb-4">
                    もう、雪の駅で<br className="md:hidden" />待ちぼうけはしない。
                </h2>
                <p className="text-[var(--muted)] text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                    1,577件のテストで実証された<strong className="text-[var(--foreground)]">94%の精度</strong>。<br className="hidden md:block" />
                    JR北海道13路線の運休を事前に予測し、寒い駅で待つ時間をゼロに。
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
                {/* Feature 1 */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 text-blue-600">
                        <BrainCircuit className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base mb-1.5 text-[var(--foreground)]">公式発表の前に行動できる</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                        天気予報×過去の運休パターン×路線の脆弱性をAIが統合解析。
                        JR公式の運休発表を待たずに、<strong>事前に代替手段を検討</strong>できます。
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3 text-green-600">
                        <Radio className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base mb-1.5 text-[var(--foreground)]">3層リアルタイム統合</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                        ①気象データ ②JR公式運行情報 ③現地ユーザー報告の
                        <strong>3つの情報源をリアルタイムで統合</strong>。
                        「今」と「これから」の両方が分かります。
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center mb-3 text-orange-600">
                        <Bus className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base mb-1.5 text-[var(--foreground)]">代替手段を1秒で表示</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                        運休リスクが高い区間の都市間バス・タクシーなどの代替ルートを<strong>自動提案</strong>。
                        「電車が止まった、どうしよう」をなくします。
                    </p>
                </div>

                {/* Feature 4 */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3 text-purple-600">
                        <Route className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base mb-1.5 text-[var(--foreground)]">13路線の個別分析</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                        宗谷本線と千歳線では、同じ風速でもリスクが全く違う。
                        <strong>路線ごとの脆弱性を学習済み</strong>で、的確な予測を実現。
                    </p>
                </div>
            </div>

            {/* 競合比較セクション */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-5 md:p-7 border border-blue-100 mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-base md:text-lg text-[var(--foreground)]">
                        他のサービスでは解決できなかった「痒いところ」
                    </h3>
                </div>

                <div className="space-y-3">
                    {/* 競合の課題 */}
                    {[
                        {
                            name: 'JR北海道公式',
                            issue: '運休は「起きてから」通知。事前予測なし',
                            icon: '🚆',
                        },
                        {
                            name: 'Yahoo!乗換案内',
                            issue: '運休を検知するが「明日止まるか」は分からない',
                            icon: '📱',
                        },
                        {
                            name: '天気アプリ',
                            issue: '「雪が降る」と分かっても「電車が動くか」は不明',
                            icon: '🌨️',
                        },
                    ].map(({ name, issue, icon }) => (
                        <div key={name} className="flex items-start gap-3 bg-white/70 p-3 rounded-lg">
                            <span className="text-lg flex-shrink-0">{icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[var(--foreground)]">{name}</span>
                                    <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                </div>
                                <p className="text-[11px] text-[var(--muted)] mt-0.5">{issue}</p>
                            </div>
                        </div>
                    ))}

                    {/* 運休北海道 */}
                    <div className="flex items-start gap-3 bg-blue-600/5 p-3 rounded-lg border border-blue-200">
                        <span className="text-lg flex-shrink-0">🚀</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-blue-700">運休北海道</span>
                                <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            </div>
                            <p className="text-[11px] text-blue-700 mt-0.5 font-medium">
                                天気 × 公式情報 × 路線特性を統合し、「明日の電車が動くか」を事前に予測。行動を先手で判断可能に。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accuracy Detail */}
            <div className="bg-[var(--background-secondary)] rounded-2xl p-5 md:p-7 border border-[var(--border)]">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-base md:text-lg">予測精度の実績</h3>
                        </div>
                        <p className="text-xs md:text-sm text-[var(--muted)] leading-relaxed">
                            17カテゴリ × 13路線 = 1,577件のテストで検証済み。<br />
                            安全最優先の設計で、<strong>過大予測5.1%</strong> vs <strong>過小予測0.8%</strong>。
                            運休を見逃すリスクを最小限に抑えています。
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-[11px] text-green-700 font-medium">ステータス的中率 98.6%</span>
                            </div>
                            <Link href="/accuracy" className="text-[11px] text-[var(--primary)] font-medium hover:underline">
                                詳細を見る →
                            </Link>
                        </div>
                    </div>
                    <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                        <div className="flex items-center justify-center bg-white px-6 py-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="text-center">
                                <div className="text-[11px] text-[var(--muted)] mb-0.5">的中精度</div>
                                <div className="text-3xl font-bold text-blue-600">94<span className="text-lg">%</span></div>
                                <div className="text-[10px] text-[var(--muted)] mt-0.5">1,577件検証済</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
