import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Wind, CloudSnow, AlertTriangle, Train, MapPin, TrendingUp, Shield, ExternalLink } from 'lucide-react';
import routesData from '@/data/hokkaido-routes.json';
import { ROUTE_VULNERABILITY, DEFAULT_VULNERABILITY } from '@/lib/prediction-engine/route-config';
import { notFound } from 'next/navigation';

interface RouteData {
    id: string;
    name: string;
    company: string;
    region: string;
    color: string;
}

// 路線ごとのSEO情報（slug → 詳細情報）
const ROUTE_SEO_INFO: Record<string, {
    description: string;
    section: string;
    majorStations: string[];
    suspensionPatterns: string[];
    alternatives: string[];
    tips: string[];
}> = {
    'jr-hokkaido.hakodate-main': {
        description: '函館本線は小樽〜札幌〜旭川を結ぶJR北海道の主要幹線です。比較的運休に強い路線ですが、冬季の大雪時には遅延・運休が発生します。',
        section: '小樽〜札幌〜岩見沢〜旭川',
        majorStations: ['札幌', '小樽', '岩見沢', '旭川', '手稲', '桑園'],
        suspensionPatterns: ['大雪時の徐行運転による遅延', '強風時の一部区間運休', '倒木による一時運休'],
        alternatives: ['高速バス（札幌〜旭川：約2時間）', '中央バス（札幌〜小樽：約1時間）', '都市間バス'],
        tips: ['札幌〜小樽間は比較的安定', '旭川方面は積雪の影響が大きい', '特急は在来線より運休判断が早い場合あり'],
    },
    'jr-hokkaido.chitose': {
        description: '千歳線は札幌と新千歳空港を結ぶ空港連絡線で、JR北海道の中でも最も利用者が多い路線です。平野部を走行するため吹雪・強風の影響を受けやすく、冬季の運休が多い路線です。',
        section: '札幌〜南千歳〜新千歳空港',
        majorStations: ['札幌', '新札幌', '北広島', '恵庭', '千歳', '南千歳', '新千歳空港'],
        suspensionPatterns: ['吹雪による視界不良での運休', '強風（18m/s以上）での運休', '大雪による除雪遅延', '快速エアポートの運休（在来線は運行する場合あり）'],
        alternatives: ['北都交通 空港連絡バス（約80分、1,100円）', '中央バス 空港連絡バス', 'タクシー（約15,000〜20,000円）', 'レンタカー'],
        tips: ['フライト前日に運休北海道で翌日の運休リスクを確認', '空港連絡バスの時刻表も事前に確認', '吹雪時はバスも運休する可能性あり', '余裕を持ったスケジュールを推奨'],
    },
    'jr-hokkaido.sassho': {
        description: '学園都市線（札沼線）は札幌と北海道医療大学を結ぶ路線です。一部単線区間があり、積雪時の運休リスクがあります。通勤・通学利用者が多い路線です。',
        section: '札幌〜あいの里公園〜北海道医療大学',
        majorStations: ['札幌', '新琴似', 'あいの里教育大', 'あいの里公園', '石狩当別', '北海道医療大学'],
        suspensionPatterns: ['強風・大雪による運休', 'エゾシカ衝突による一時運休', '単線区間での除雪遅延'],
        alternatives: ['中央バス（札幌〜当別方面）', 'タクシー', '地下鉄南北線・東豊線（札幌市内）'],
        tips: ['朝のラッシュ時に運休すると代替が混雑', '札幌市内は地下鉄での迂回も検討'],
    },
    'jr-hokkaido.muroran-main': {
        description: '室蘭本線は苫小牧〜室蘭〜東室蘭〜長万部を結ぶ路線です。海沿いを走る区間が多く、強風の影響を受けやすい路線です。特急すずらん・北斗が運行しています。',
        section: '苫小牧〜室蘭〜東室蘭〜長万部',
        majorStations: ['苫小牧', '登別', '室蘭', '東室蘭', '伊達紋別', '長万部'],
        suspensionPatterns: ['海沿い区間での強風による運休', 'エゾシカ衝突', '大雨・高波による運休'],
        alternatives: ['道南バス（室蘭〜札幌：約2.5時間）', '高速バス（苫小牧〜札幌：約2時間）', 'タクシー'],
        tips: ['海沿い区間は風速16m/sで運休判断', '特急北斗は函館方面との接続便'],
    },
    'jr-hokkaido.soya-main': {
        description: '宗谷本線は旭川から稚内までを結ぶ日本最北端の鉄道路線です。全長259.4kmの長距離路線で、冬季の運休リスクが最も高い路線の一つです。',
        section: '旭川〜名寄〜稚内',
        majorStations: ['旭川', '和寒', '士別', '名寄', '音威子府', '幌延', '稚内'],
        suspensionPatterns: ['猛吹雪による長期運休', 'エゾシカ衝突（頻発）', '極寒によるポイント凍結', '積雪による除雪遅延'],
        alternatives: ['宗谷バス（旭川〜稚内：約5時間）', '都市間バス', '航空便（札幌〜稚内）'],
        tips: ['12〜2月は特に運休リスクが高い', '稚内方面は天候急変に注意', '名寄以北は特に厳しい気象条件'],
    },
    'jr-hokkaido.sekihoku-main': {
        description: '石北本線は旭川から網走を結ぶ路線です。北見峠など山間部を通過するため、積雪・強風に弱く、冬季は頻繁に運行に影響が出ます。',
        section: '旭川〜上川〜遠軽〜北見〜網走',
        majorStations: ['旭川', '上川', '遠軽', '北見', '女満別', '網走'],
        suspensionPatterns: ['北見峠区間での大雪・強風', 'エゾシカ衝突', '長時間の除雪作業による運休'],
        alternatives: ['北海道中央バス（旭川〜北見：約3.5時間）', '航空便（札幌〜女満別）', 'レンタカー'],
        tips: ['北見峠は北海道屈指の難所', '遠軽以東は特に積雪が多い'],
    },
    'jr-hokkaido.furano': {
        description: '富良野線は旭川と富良野を結ぶ観光路線です。内陸部を走るため積雪の影響を受けます。夏のラベンダーシーズンには観光客で賑わいます。',
        section: '旭川〜美瑛〜富良野',
        majorStations: ['旭川', '美瑛', '上富良野', '中富良野', '富良野'],
        suspensionPatterns: ['大雪による運休', 'エゾシカ衝突', '積雪による除雪遅延'],
        alternatives: ['ふらのバス（旭川〜富良野：約2時間）', 'タクシー', 'レンタカー'],
        tips: ['冬季の観光は運休リスクを事前に確認', '美瑛エリアは積雪が特に多い'],
    },
    'jr-hokkaido.rumoi': {
        description: '留萌本線は深川と留萌を結ぶ路線です。日本海沿いを走る区間があり、強風・波浪の影響を受けやすく、JR北海道の中でも特に運休しやすい路線です。',
        section: '深川〜留萌',
        majorStations: ['深川', '留萌'],
        suspensionPatterns: ['海沿い区間での強風・高波', 'エゾシカ衝突', '大雪・吹雪', '暴風雪警報での全面運休'],
        alternatives: ['沿岸バス（留萌〜旭川方面）', 'タクシー'],
        tips: ['風速14m/sで運休判断（JR北海道で最も厳しい基準）', '冬季は長期運休になることも'],
    },
    'jr-hokkaido.hidaka': {
        description: '日高本線は苫小牧と様似を結ぶ路線です。太平洋沿いを走る区間があり、強風や高波の影響を受けやすい路線です。',
        section: '苫小牧〜日高〜様似',
        majorStations: ['苫小牧', '鵡川', '日高門別', '静内', '浦河', '様似'],
        suspensionPatterns: ['海沿い区間での強風・高波', 'エゾシカ衝突（頻発）', '大雨による土砂崩れ'],
        alternatives: ['道南バス（苫小牧〜静内方面）', 'タクシー'],
        tips: ['海沿い区間は強風に注意', 'エゾシカ衝突が最も多い路線の一つ'],
    },
    'jr-hokkaido.sekisho': {
        description: '石勝線は南千歳から帯広方面へ向かう主要路線です。日高山脈を越える峠越え区間があり、強風・積雪の影響を受けやすい路線です。特急おおぞら・とかちが運行しています。',
        section: '南千歳〜新夕張〜トマム〜新得',
        majorStations: ['南千歳', '追分', '新夕張', 'トマム', '新得'],
        suspensionPatterns: ['峠越え区間での強風・大雪', 'エゾシカ衝突', '吹雪による視界不良'],
        alternatives: ['高速バス（札幌〜帯広：約4時間、3,800円）', '航空便（札幌〜帯広）'],
        tips: ['トマム付近は山間部で気象変化が激しい', '特急は在来線より運休基準が厳しい場合あり'],
    },
    'jr-hokkaido.nemuro-main': {
        description: '根室本線は滝川から帯広・釧路・根室を結ぶ長距離路線です。広大な十勝平野・道東エリアを走り、部分運休が発生しやすい路線です。',
        section: '滝川〜富良野〜帯広〜釧路〜根室',
        majorStations: ['滝川', '富良野', '帯広', '池田', '釧路', '根室'],
        suspensionPatterns: ['部分運休（区間ごとの運休判断）', '大雪・強風', 'エゾシカ衝突'],
        alternatives: ['高速バス（札幌〜釧路：約5.5時間）', '航空便（札幌〜釧路）', 'レンタカー'],
        tips: ['全線運休は稀だが部分運休は頻発', '帯広・釧路間は比較的安定'],
    },
    'jr-hokkaido.senmo-main': {
        description: '釧網本線は網走と釧路を結ぶ観光路線です。冬季のSL冬の湿原号や流氷観光で人気ですが、冬季は運休リスクが高い路線です。',
        section: '網走〜知床斜里〜川湯温泉〜釧路',
        majorStations: ['網走', '知床斜里', '川湯温泉', '標茶', '釧路'],
        suspensionPatterns: ['冬季の強風・大雪', 'エゾシカ衝突（多発地帯）', '極寒によるレール凍結'],
        alternatives: ['阿寒バス（釧路〜網走方面）', 'レンタカー'],
        tips: ['冬季観光は運休リスクを必ず確認', '流氷シーズンは特に風が強い'],
    },
    'jr-hokkaido.hakodate-south': {
        description: '函館本線（道南区間）は函館エリアの路線です。北海道新幹線との接続もあり、強風の影響を受ける区間があります。',
        section: '函館〜新函館北斗〜長万部',
        majorStations: ['函館', '五稜郭', '新函館北斗', '大沼公園', '森', '長万部'],
        suspensionPatterns: ['津軽海峡からの強風', '大雪・吹雪', '大沼付近の結氷'],
        alternatives: ['函館バス（市内路線）', '高速バス（函館〜札幌：約5.5時間）', '北海道新幹線（新函館北斗）'],
        tips: ['新幹線接続がある新函館北斗までは比較的安定', '函館〜大沼間は風の影響を受けやすい'],
    },
};

export function generateStaticParams() {
    return (routesData as RouteData[]).map((route) => ({
        routeId: route.id,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ routeId: string }> }): Promise<Metadata> {
    const { routeId } = await params;
    const route = (routesData as RouteData[]).find(r => r.id === routeId);
    if (!route) return {};

    return {
        title: `${route.name}の運休予測・運行情報 - 遅延・運休リスクをAIで予測`,
        description: `${route.name}（${route.region}）の運休・遅延情報をAIで予測。風速・積雪データから運休リスクを事前に把握。代替交通手段、運休パターン、注意点も掲載。`,
        alternates: {
            canonical: `/route/${routeId}`,
        },
    };
}

export default async function RoutePage({ params }: { params: Promise<{ routeId: string }> }) {
    const { routeId } = await params;
    const route = (routesData as RouteData[]).find(r => r.id === routeId);
    if (!route) notFound();

    const vuln = ROUTE_VULNERABILITY[routeId] || DEFAULT_VULNERABILITY;
    const seoInfo = ROUTE_SEO_INFO[routeId];
    if (!seoInfo) notFound();

    // 脆弱性レベル
    const vulnLevel = vuln.vulnerabilityScore >= 1.6 ? '高' : vuln.vulnerabilityScore >= 1.3 ? '中' : '低';
    const vulnColor = vuln.vulnerabilityScore >= 1.6 ? 'red' : vuln.vulnerabilityScore >= 1.3 ? 'yellow' : 'green';
    const vulnBg = vulnColor === 'red' ? 'bg-red-50 text-red-700' : vulnColor === 'yellow' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700';

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `${route.name}の運休予測・運行情報`,
        description: seoInfo.description,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://unkyu-ai.vercel.app'}/route/${routeId}`,
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'トップ', item: process.env.NEXT_PUBLIC_SITE_URL || 'https://unkyu-ai.vercel.app' },
                { '@type': 'ListItem', position: 2, name: `${route.name}` },
            ],
        },
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <main className="min-h-screen bg-[var(--background-secondary)]">
                <header className="text-white py-4 px-4" style={{ background: `linear-gradient(135deg, ${route.color}, ${route.color}dd)` }}>
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/" className="text-white/80 hover:text-white transition-colors" aria-label="トップに戻る">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{route.region}</span>
                        </div>
                        <h1 className="text-xl font-bold">{route.name}の運休予測</h1>
                        <p className="text-sm text-white/80 mt-1">{seoInfo.section}</p>
                    </div>
                </header>

                <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                    {/* 概要 */}
                    <section className="card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Train className="w-5 h-5 text-[var(--primary)]" />
                            <h2 className="font-bold text-base">路線概要</h2>
                        </div>
                        <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-4">
                            {seoInfo.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {seoInfo.majorStations.map(station => (
                                <span key={station} className="text-[11px] bg-[var(--background-secondary)] px-2 py-1 rounded-full text-[var(--muted)]">
                                    📍 {station}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* 運休リスク指標 */}
                    <section className="card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
                            <h2 className="font-bold text-base">運休リスク指標</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-[var(--background-secondary)] rounded-lg p-3 text-center">
                                <Wind className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                                <div className="text-lg font-bold text-[var(--foreground)]">{vuln.windThreshold}<span className="text-xs text-[var(--muted)]">m/s</span></div>
                                <div className="text-[10px] text-[var(--muted)]">風速閾値</div>
                            </div>
                            <div className="bg-[var(--background-secondary)] rounded-lg p-3 text-center">
                                <CloudSnow className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
                                <div className="text-lg font-bold text-[var(--foreground)]">{vuln.snowThreshold}<span className="text-xs text-[var(--muted)]">cm/h</span></div>
                                <div className="text-[10px] text-[var(--muted)]">積雪閾値</div>
                            </div>
                            <div className="bg-[var(--background-secondary)] rounded-lg p-3 text-center">
                                <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                                <div className={`text-sm font-bold rounded-full px-2 py-0.5 ${vulnBg}`}>{vulnLevel}リスク</div>
                                <div className="text-[10px] text-[var(--muted)] mt-0.5">脆弱性</div>
                            </div>
                        </div>
                        {vuln.hasDeerRisk && (
                            <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                                <span>🦌</span>
                                <span>エゾシカ衝突リスクあり（秋〜冬に多発）</span>
                            </div>
                        )}
                    </section>

                    {/* 運休パターン */}
                    <section className="card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-5 h-5 text-[var(--primary)]" />
                            <h2 className="font-bold text-base">よくある運休パターン</h2>
                        </div>
                        <ul className="space-y-2">
                            {seoInfo.suspensionPatterns.map((pattern, i) => (
                                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--muted)]">
                                    <span className="text-red-400 mt-0.5">•</span>
                                    <span>{pattern}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* 代替手段 */}
                    <section className="card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <MapPin className="w-5 h-5 text-[var(--primary)]" />
                            <h2 className="font-bold text-base">代替交通手段</h2>
                        </div>
                        <ul className="space-y-2">
                            {seoInfo.alternatives.map((alt, i) => (
                                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--muted)]">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>{alt}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* 利用ヒント */}
                    <section className="card p-5">
                        <h2 className="font-bold text-base mb-3">💡 利用のヒント</h2>
                        <ul className="space-y-2">
                            {seoInfo.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--muted)]">
                                    <span className="text-blue-500 mt-0.5">→</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* CTA */}
                    <div className="card p-5 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
                        <h2 className="font-bold text-base mb-2">
                            {route.name}の運休リスクを今すぐチェック
                        </h2>
                        <p className="text-[12px] text-[var(--muted)] mb-4">
                            AIが天気・運行情報・路線特性を分析して予測します
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                        >
                            🔍 運休リスクを調べる
                        </Link>
                    </div>

                    {/* 他の路線リンク */}
                    <section className="card p-5">
                        <h2 className="font-bold text-sm mb-3">他の路線を見る</h2>
                        <div className="flex flex-wrap gap-2">
                            {(routesData as RouteData[])
                                .filter(r => r.id !== routeId)
                                .slice(0, 6)
                                .map(r => (
                                    <Link
                                        key={r.id}
                                        href={`/route/${r.id}`}
                                        className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--muted)] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                    >
                                        {r.name}
                                    </Link>
                                ))}
                            <Link
                                href="/faq"
                                className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--muted)] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            >
                                よくある質問 →
                            </Link>
                        </div>
                    </section>

                    <nav className="text-center pt-2">
                        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                            ← トップに戻る
                        </Link>
                    </nav>
                </div>
            </main>
        </>
    );
}
