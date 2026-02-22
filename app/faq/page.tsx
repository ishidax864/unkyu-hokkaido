import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, ChevronDown, Train, CloudSnow, Clock, Search, Star, MapPin, AlertTriangle, Plane } from 'lucide-react';

export const metadata: Metadata = {
    title: 'よくある質問（FAQ） - JR北海道の運休に関する疑問を解決',
    description: 'JR北海道の運休に関するよくある質問をまとめました。運休の判断基準、千歳線が止まった時の代替手段、吹雪時の運行状況、運休予測の仕組みなどを分かりやすく解説。',
    alternates: {
        canonical: '/faq',
    },
};

interface FAQItem {
    question: string;
    answer: string;
    icon: React.ReactNode;
    relatedLink?: { href: string; label: string };
}

const faqItems: FAQItem[] = [
    {
        question: 'JR北海道が運休になるのはどんな時ですか？',
        answer: 'JR北海道は主に以下の気象条件で運休になります。①風速20m/s以上の強風（路線により基準が異なります）②短時間での大量降雪（1時間に5cm以上）③吹雪による視界不良④大雨・台風⑤線路上の積雪や倒木。特に冬季（12月〜3月）は運休リスクが高まります。路線ごとの詳しい基準は各路線ページをご覧ください。',
        icon: <CloudSnow className="w-5 h-5" />,
        relatedLink: { href: '/route/jr-hokkaido.chitose', label: '千歳線の運休基準を見る' },
    },
    {
        question: '千歳線が止まった時、新千歳空港へはどうやって行けますか？',
        answer: '千歳線が運休した場合、主な代替手段は以下の通りです。①北都交通・中央バスの空港連絡バス（札幌駅〜新千歳空港、約80分、1,100円）②タクシー（約50km、15,000〜20,000円程度）③レンタカー。空港連絡バスは千歳線の運休時に増便されることもありますが、吹雪で高速道路が通行止めの場合はバスも運休する可能性があります。運休北海道では代替交通手段も含めてご案内しています。',
        icon: <Plane className="w-5 h-5" />,
        relatedLink: { href: '/route/jr-hokkaido.chitose', label: '千歳線の詳細・代替手段' },
    },
    {
        question: '運休情報はいつ頃分かりますか？',
        answer: 'JR北海道の公式運休情報は通常、当日の早朝5〜6時頃に発表されます。ただし前日夜に「計画運休」として事前発表されることもあります。運休北海道のAI予測は前日から翌日の運休リスクを予測するため、公式発表よりも早く運休の可能性を把握でき、余裕を持った行動計画が立てられます。',
        icon: <Clock className="w-5 h-5" />,
    },
    {
        question: '吹雪の時、電車は動きますか？',
        answer: '吹雪の程度によります。軽い吹雪であれば徐行運転で対応されることが多いですが、視界が極端に悪化する「ホワイトアウト」級の吹雪では運休になります。特に千歳線・室蘭本線・石勝線など開けた地形を走る路線は影響を受けやすく、函館本線（札幌〜旭川）は比較的風に強い傾向があります。運休北海道では気象データと路線特性を組み合わせて、路線ごとの運休リスクを予測しています。',
        icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
        question: '運休北海道の予測精度はどのくらいですか？',
        answer: '1,577件のテストケースで検証した結果、確率的中率94.1%、ステータス的中率98.6%を達成しています。安全側に設計されているため、過大予測（実際は動くのに運休と予測）が5.1%に対し、過小予測（運休を見逃す）はわずか0.8%です。これにより「予測を信じて行動したのに運休だった」というリスクを最小化しています。',
        icon: <Search className="w-5 h-5" />,
        relatedLink: { href: '/accuracy', label: '予測精度の詳細を見る' },
    },
    {
        question: 'お気に入りルートはどうやって登録しますか？',
        answer: '①トップページで出発駅と到着駅を入力し検索 ②予測結果画面に表示される★ボタンをタップ ③ルート名を入力して保存。登録したお気に入りはトップページに表示され、ワンタップで最新の予測結果を確認できます。通勤・通学ルートの登録がおすすめです。',
        icon: <Star className="w-5 h-5" />,
        relatedLink: { href: '/onboarding', label: '使い方ガイドを見る' },
    },
    {
        question: '札幌から新千歳空港以外の代替手段にはどんなものがありますか？',
        answer: '札幌〜新千歳空港間以外にも、各路線エリアで代替交通手段があります。例えば、札幌〜旭川間は高速バス（約2時間、2,300円）、札幌〜帯広間は高速バス（約4時間、3,800円）が利用可能です。運休北海道では検索した区間に応じた代替手段を自動で提案します。',
        icon: <MapPin className="w-5 h-5" />,
    },
    {
        question: '冬の北海道旅行で電車を使う際の注意点は？',
        answer: '冬の北海道で電車を利用する際は以下の点に注意してください。①前日に翌日の天気予報を確認し、運休北海道で運休リスクをチェック ②代替交通手段（バス・タクシー）の連絡先をメモ ③フライトがある場合は余裕を持ったスケジュールを組む（運休時のバス移動は鉄道の倍の時間がかかります）④特に12〜2月は運休リスクが高いため、柔軟な旅程を計画してください。',
        icon: <Train className="w-5 h-5" />,
    },
];

function FAQJsonLd() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(item => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

export default function FAQPage() {
    return (
        <>
            <FAQJsonLd />
            <main className="min-h-screen bg-[var(--background-secondary)]">
                <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 px-4">
                    <div className="max-w-2xl mx-auto flex items-center gap-3">
                        <Link href="/" className="text-white/80 hover:text-white transition-colors" aria-label="トップに戻る">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-lg font-bold">よくある質問</h1>
                    </div>
                </header>

                <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                        JR北海道の運休に関するよくある質問をまとめました。
                    </p>

                    {faqItems.map((item, index) => (
                        <details
                            key={index}
                            className="card group"
                        >
                            <summary className="flex items-start gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mt-0.5">
                                    {item.icon}
                                </span>
                                <span className="flex-1 font-bold text-sm text-[var(--foreground)] leading-relaxed pr-6">
                                    {item.question}
                                </span>
                                <ChevronDown className="w-4 h-4 text-[var(--muted)] flex-shrink-0 mt-1 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="px-4 pb-4 pl-[52px]">
                                <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                                    {item.answer}
                                </p>
                                {item.relatedLink && (
                                    <Link
                                        href={item.relatedLink.href}
                                        className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                    >
                                        {item.relatedLink.label} →
                                    </Link>
                                )}
                            </div>
                        </details>
                    ))}

                    <div className="card p-5 text-center">
                        <HelpCircle className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-[var(--muted)] mb-3">
                            解決しない場合はお問い合わせください
                        </p>
                        <a
                            href="mailto:info@andr.ltd"
                            className="inline-block text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                            info@andr.ltd
                        </a>
                    </div>

                    <nav className="text-center pt-4">
                        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                            ← トップに戻る
                        </Link>
                    </nav>
                </div>
            </main>
        </>
    );
}
