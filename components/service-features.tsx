import { BrainCircuit, Radio, Bus, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';

export function ServiceFeatures() {
    return (
        <section className="py-8 md:py-12 border-t border-[var(--border)]" aria-labelledby="features-heading">
            <div className="text-center mb-10">
                <span className="inline-block py-1 px-3 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-3 tracking-wide">
                    WHY UNKYU HOKKAIDO?
                </span>
                <h2 id="features-heading" className="text-2xl md:text-3xl font-bold text-[var(--foreground)] leading-tight mb-4">
                    もう、雪の駅で<br className="md:hidden" />待ちぼうけはしない。
                </h2>
                <p className="text-[var(--muted)] text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                    84%の精度でJR北海道の運休を予測。<br className="hidden md:block" />
                    寒い駅で待つ時間を減らし、代替手段を事前に検討できます。
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
                {/* Feature 1 */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-[var(--foreground)]">高精度の運休予測</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                        過去の運休事例と気象データをAIが解析。
                        「なんとなく」ではなく「根拠のある」予測を提供します。
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4 text-green-600">
                        <Radio className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-[var(--foreground)]">リアルタイム情報</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                        公式の運行情報に加え、現地のユーザーからの報告を集約。
                        「今」の状況が手に取るように分かります。
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4 text-orange-600">
                        <Bus className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-[var(--foreground)]">代替手段の提案</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                        運休リスクが高い場合、都市間バスなどの代替ルートを自動提案。
                        移動の選択肢を広げます。
                    </p>
                </div>
            </div>

            {/* Accuracy Detail */}
            <div className="bg-[var(--background-secondary)] rounded-2xl p-6 md:p-8 border border-[var(--border)]">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-base md:text-lg">予測精度の実績</h3>
                        </div>
                        <p className="text-xs md:text-sm text-[var(--muted)] leading-relaxed">
                            過去300件以上の災害級事例を用いたバックテストにおいて、正解率84%超を達成。<br />
                            <span className="text-[10px] opacity-80">※安全最優先のため、悪天候でも運行できた稀な例外（外れ値）を除外し、厳しめに判定しています。</span>
                        </p>
                    </div>
                    <div className="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
                        <div className="flex items-center justify-center bg-white px-6 py-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="text-center">
                                <div className="text-[10px] text-[var(--muted)] mb-0.5">正解率</div>
                                <div className="text-2xl font-bold text-blue-600">84<span className="text-sm font-normal ml-0.5">%超</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
