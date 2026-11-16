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
        answer: '雪・風・雨の影響や、設備の不具合などで運休することがあります。運転の可否はJRが判断します。このサービスの気象指標はJRの運転規制基準ではありません。利用する列車・区間の公式案内を確認してください。',
        icon: <CloudSnow className="w-5 h-5" />,
        relatedLink: { href: '/route/jr-hokkaido.chitose', label: '千歳線の案内を見る' },
    },
    {
        question: '千歳線が止まった時、新千歳空港へはどうやって行けますか？',
        answer: '結果画面から空港連絡バスの案内や交通検索を開けます。鉄道が止まっている時に、バスや道路も利用できるとは限りません。運行状況・所要時間・運賃・空席は各交通機関で確認してください。',
        icon: <Plane className="w-5 h-5" />,
        relatedLink: { href: '/route/jr-hokkaido.chitose', label: '千歳線の詳細・代替手段' },
    },
    {
        question: '運休情報はいつ頃分かりますか？',
        answer: '発表の時刻は事象によって異なります。結果画面で公式発表の時刻と取得時刻を確認できます。現地報告は公式発表より早い場合もありますが、未確認情報として扱います。',
        icon: <Clock className="w-5 h-5" />,
    },
    {
        question: '吹雪の時、電車は動きますか？',
        answer: '気象条件だけでは運転の可否を確定できません。気象リスクが低い場合も、線路や設備の状況によって運休することがあります。最新のJR公式情報と駅の案内を確認してください。',
        icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
        question: '運休北海道の予測精度はどのくらいですか？',
        answer: '実際の冬の運休を使った精度検証は完了していません。現在、検証済みの的中率は公開していません。プログラムの動作テストの合格率を、運休予測の的中率としては扱いません。',
        icon: <Search className="w-5 h-5" />,
        relatedLink: { href: '/accuracy', label: '予測について読む' },
    },
    {
        question: 'お気に入りルートはどうやって登録しますか？',
        answer: '検索欄で出発駅と到着駅を選び、「このルートを保存」を押してください。同じブラウザーの「いつものルート」から再び検索できます。保存は端末内に行われます。',
        icon: <Star className="w-5 h-5" />,
        relatedLink: { href: '/onboarding', label: '使い方ガイドを見る' },
    },
    {
        question: '札幌から新千歳空港以外の代替手段にはどんなものがありますか？',
        answer: '結果画面の「別の交通手段を探す」から、区間に応じた交通検索を開けます。検索結果にはJRも含まれるため、利用できるバス・地下鉄などを確認してください。表示先の運行・空席をこのサービスが保証するものではありません。',
        icon: <MapPin className="w-5 h-5" />,
    },
    {
        question: '冬の北海道旅行で電車を使う際の注意点は？',
        answer: '出発前と移動中に運行情報を確認し、待つ場合は近くの屋内施設を探してください。到着時刻の制約がある時や復旧が不明な時は、代替交通や宿泊先も早めに確認できるようにしています。',
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
