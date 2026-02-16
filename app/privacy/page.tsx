import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: 'プライバシーポリシー | 運休北海道 - JR北海道の運行・運休予報',
    description: '運休北海道のプライバシーポリシーです。個人情報の取り扱い方針やアクセス解析、Cookieの使用についてご確認いただけます。',
};

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-[var(--background-secondary)] p-4 md:p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-10">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        トップに戻る
                    </Link>
                </div>

                <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">プライバシーポリシー</h1>

                <div className="space-y-6 text-sm leading-relaxed text-[var(--foreground)]">
                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">1. 収集する情報</h2>
                        <p>
                            本サービス（運休北海道）は、以下の情報を収集することがあります。
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-[var(--muted)]">
                            <li>Google Analyticsを用いたアクセス解析データ（Cookieを使用）</li>
                            <li>ユーザーが自ら送信した「現場の状況」報告データ</li>
                            <li>ブラウザのローカルストレージに保存されるお気に入りルート設定（サーバーには送信されません）</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">2. 情報の利用目的</h2>
                        <p>
                            収集した情報は、以下の目的で利用します。
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-[var(--muted)]">
                            <li>サービスの利用状況分析および品質向上</li>
                            <li>ユーザーからのフィードバックに基づく機能改善</li>
                            <li>「現場の状況」機能における、他のユーザーへの情報共有</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">3. 第三者への提供</h2>
                        <p>
                            法令に基づく場合を除き、取得した個人情報を第三者に提供することはありません。なお、アクセス解析のためにGoogle Analyticsを使用しており、データの一部がGoogleに送信される場合があります。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">4. 免責事項</h2>
                        <p>
                            本サービスからリンクやバナーなどによって他のサイトに移動された場合、移動先サイトで提供される情報、サービス等について一切の責任を負いません。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 border-b pb-1">5. お問い合わせ</h2>
                        <p>
                            本ポリシーに関するお問い合わせは、以下のメールアドレスまでお願いいたします。<br />
                            <a href="mailto:info@andr.ltd" className="text-[var(--primary)] hover:underline">info@andr.ltd</a>
                        </p>
                    </section>

                    <div className="pt-4 text-right text-xs text-[var(--muted)]">
                        2026年2月13日 改定
                    </div>
                </div>
            </div>
        </main>
    );
}
