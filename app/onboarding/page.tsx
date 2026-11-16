import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: '使い方' };

const steps = [
    ['駅と日時を選ぶ', '出発駅と到着駅を選び、今日を含む7日間から出発日時を指定します。運休で困っている場合は、いまいる駅を出発駅にしてください。「運休・復旧を調べる」を押すと結果が表示されます。'],
    ['運行状況と復旧の見通しを見る', 'JRの発表、復旧の見通し、気象リスクを確認します。気象リスクは運休確率ではありません。情報が不足する場合は「不明」と表示されます。'],
    ['待機場所や別の手段を探す', '結果からカフェ、交通手段、宿泊先の検索を開けます。営業状況・運行・空席・空室はリンク先で確認してください。'],
    ['現地の様子を確認・共有する', '「この路線の様子を報告する」を開き、ご自身が確認した状況を選んで共有します。補足に駅名や方向を入れると、ほかの人の判断に役立ちます。個人情報は書かないでください。'],
    ['いつものルートを保存する', '検索欄の「このルートを保存」を押すと、同じブラウザーで次回も選べます。保存は端末内に行われます。'],
];
export default function OnboardingPage() {
    return <main className="mx-auto max-w-3xl px-5 py-10 leading-8">
        <Link href="/" className="inline-flex items-center gap-2 text-green-700"><ArrowLeft size={19}/> 検索に戻る</Link>
        <h1 className="my-7 text-3xl font-bold">使い方</h1>
        <ol className="space-y-8">{steps.map(([title,body],i) => <li key={title}><h2 className="mb-2 text-xl font-bold">{i+1}. {title}</h2><p>{body}</p></li>)}</ol>
        <Link href="/" className="mt-9 inline-flex items-center gap-3 rounded-lg bg-green-700 px-6 py-3 font-bold text-white">運休・復旧を調べる<ArrowRight size={20}/></Link>
    </main>;
}
