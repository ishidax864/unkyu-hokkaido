import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: '利用規約 | 運休北海道 - JR北海道の運行・運休予報',
    description: '運休北海道の利用規約です。本サービス（AIによるJR北海道の運休予測）のご利用にあたっての注意事項や免責事項についてご確認いただけます。',
};

export default function TermsOfService() {
    return (
        <main className="min-h-screen bg-[var(--background-secondary)] p-4 md:p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-10">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        トップに戻る
                    </Link>
                </div>

                <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">利用規約</h1>

                <div className="space-y-6 text-sm leading-relaxed text-[var(--foreground)]">
                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">1. サービスの目的と性質</h2>
                        <p>
                            本サービス「運休北海道」（以下「当サービス」）は、天気予報および過去の統計データを基にJR北海道の運行見込みをAIが94%の精度で予測するサービスです。
                            <span className="font-bold text-red-600">JR北海道公式の情報ではありません。</span>
                            正確な運行状況については、必ずJR北海道の公式サイトをご確認ください。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">2. 免責事項</h2>
                        <p>
                            当サービスの予測結果は、あくまで参考情報として提供されるものです。
                            予測の正確性、完全性、有用性について保証するものではありません。
                            当サービスの利用により生じた損害（例：列車に乗り遅れた、代替手段の手配遅れなど）について、運営者は一切の責任を負いません。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">3. 利用の停止</h2>
                        <p>
                            運営者は、理由の如何を問わず、予告なく当サービスの提供を一時停止または終了することができます。
                            これによりユーザーに生じた損害について、一切の責任を負いません。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">4. 禁止事項</h2>
                        <p>
                            当サービスの利用にあたり、以下の行為を禁止します。
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-[var(--muted)]">
                            <li>当サービスのシステムに過度な負荷をかける行為（スクレイピング等）</li>
                            <li>運営者または第三者の権利を侵害する行為</li>
                            <li>その他、運営者が不適切と判断する行為</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">5. 規約の変更</h2>
                        <p>
                            運営者は、必要と判断した場合、ユーザーへの事前の通知なく本規約を変更することができます。
                            変更後の規約は、当サイトに掲載された時点で効力を生じるものとします。
                        </p>
                    </section>

                    <div className="pt-4 text-right text-xs text-[var(--muted)]">
                        2026年2月21日 改定
                    </div>
                </div>
            </div>
        </main>
    );
}
