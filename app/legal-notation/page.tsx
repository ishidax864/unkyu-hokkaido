import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: '特定商取引法に基づく表記 | 運休北海道 - JR北海道の運行・運休予報',
    description: '運休北海道の特定商取引法に基づく表記です。運営者情報（株式会社アンドアール）、お問い合わせ先、寄付の取り扱いについてご確認いただけます。',
};

export default function LegalNotation() {
    return (
        <main className="min-h-screen bg-[var(--background-secondary)] p-4 md:p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-10">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        トップに戻る
                    </Link>
                </div>

                <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">特定商取引法に基づく表記</h1>

                <div className="space-y-6 text-sm leading-relaxed text-[var(--foreground)]">
                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">販売業者 / 運営者</h2>
                        <p>株式会社アンドアール</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">代表責任者</h2>
                        <p>石田 奨太</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">所在地</h2>
                        <p>
                            〒064-0922<br />
                            北海道札幌市中央区南二十二条西９丁目２番１６－１０６号
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">電話番号</h2>
                        <p>
                            080-4043-9665<br />
                            <span className="text-xs text-[var(--muted)]">※受付時間: 平日 10:00〜18:00</span>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">メールアドレス</h2>
                        <p><a href="mailto:info@andr.ltd" className="text-[var(--primary)] hover:underline">info@andr.ltd</a></p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">販売価格 / 販売価格以外に必要な費用</h2>
                        <p>
                            投げ銭（寄付）の価格は、決済ページに表示される金額（税込）によります。<br />
                            インターネット接続料金、通信料金等はお客様の負担となります。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">代金の支払時期 / 支払方法</h2>
                        <p>
                            支払方法：クレジットカード決済（Stripe）<br />
                            支払時期：決済時（即時）
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">商品の引き渡し時期</h2>
                        <p>投げ銭（寄付）という性質上、デジタルコンテンツ等の直接的な商品の提供はありません。</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">返品・キャンセルについて</h2>
                        <p>投げ銭（寄付）の性質上、決済完了後の返金・キャンセルには応じられません。あらかじめご了承ください。</p>
                    </section>

                    <div className="pt-4 text-right text-xs text-[var(--muted)]">
                        2026年2月13日 改定
                    </div>
                </div>
            </div>
        </main>
    );
}
