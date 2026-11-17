import Link from 'next/link';
import { ArrowLeft, Snowflake, Clock3, Radio, ShieldCheck } from 'lucide-react';
import { winterCatalogSummary, winterCaseReferences } from '@/lib/forecast/historical';
import catalog from '@/data/historical/winter-events.json';
import replay from '@/artifacts/winter-evidence-replay.json';
import coreCv from '@/data/model/core-cv.json';
import coefficients from '@/lib/forecast/core-coefficients.json';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '予測について', description: '運休リスク・復旧見通し・現地報告の見方と、冬季の予測精度の検証について。' };

export default function AccuracyPage() {
    const summary = winterCatalogSummary();
    const cases = winterCaseReferences([...new Set(catalog.events.map(e => e.routeId))]);
    const snowExample = replay.observationComparisons.find(row => row.date === '2026-01-25' && row.model === 'gfs_global');
    const regionalExample = replay.observationComparisons.find(row => row.date === '2026-01-25' && row.model === 'jma_msm');
    // 平常日の4%にだけ警告する設定(「移動計画の見直しを」の基準)での検出数。交差検証の値。
    const at4 = (subset: 'all' | 'winter', key: 'newCore_cv' | 'engineB') => coreCv.report[subset][key].atFalseAlarm[1].caught;
    const total = (subset: 'all' | 'winter') => coreCv.report[subset].newCore_cv.positives;
    return <main className="mx-auto max-w-3xl px-5 py-10 leading-8">
        <Link href="/" className="inline-flex items-center gap-2 text-green-700"><ArrowLeft size={19}/> 検索に戻る</Link>
        <h1 className="my-7 text-3xl font-bold">予測について</h1>
        <p className="text-lg">前日の天気予報だけで、実際の運休をどれくらい捉えられたかを検証しました。冬の事例はまだ少なく、精度を保証するものではありません。</p>
        <section id="core-verification" className="mt-8 rounded-xl border border-green-300 bg-green-50 p-6">
            <h2 className="text-xl font-bold">前日の予報での検証結果</h2>
            <p className="mt-3">天気が原因の運休{total('all')}件（路線・日ごと）と、運休のなかった{coreCv.report.all.newCore_cv.negatives.toLocaleString('ja-JP')}件を使いました。予測には、その前日に発表されていた予報だけを使い、JRの発表や後から分かった実測は使っていません。同じ嵐が学習と検証の両方に入らないよう、週ごとに分けて検証しています。</p>
            <dl className="my-5 grid grid-cols-2 gap-5">
                <div><dt className="text-sm">全期間・前日に捉えた運休</dt><dd className="mt-1 text-3xl font-bold">{at4('all', 'newCore_cv')}<span className="text-base font-normal"> / {total('all')}件</span></dd><dd className="text-sm">以前の判定：{at4('all', 'engineB')}件</dd></div>
                <div><dt className="text-sm">冬（11〜3月）</dt><dd className="mt-1 text-3xl font-bold">{at4('winter', 'newCore_cv')}<span className="text-base font-normal"> / {total('winter')}件</span></dd><dd className="text-sm">以前の判定：{at4('winter', 'engineB')}件</dd></div>
            </dl>
            <p className="text-sm">運休のなかった日の約4%で「移動計画の見直しを」以上を表示する設定での件数です。1時間の降水量、1時間と24時間の降雪量、24時間の雨量を使っています（{coefficients.training.period[0]}〜{coefficients.training.period[1]}のデータで調整）。</p>
            <p className="mt-3 text-sm">真冬（12〜2月）の札幌圏は、報道で確認できた運休日と照らして別に検証しました（2025年12月11日〜2026年2月19日の71日）。大きな運休が始まった4日のうち3日は前日に「変化に注意」以上を出せましたが、運休記事のない59日のうち約3割でも同じ表示が出ています。真冬は「降っても走る」日が多く、前日の予報だけでは見分けきれません。そのため12〜2月は表示の区切りを厳しめにしています。</p>
            <p className="mt-3 text-sm">限界：2026年1月25日の札幌の大雪のように、前日の予報自体に大雪が出ていない場合は捉えられません。当日は気象庁の警報と降雪の観測で補います。大雪の翌日以降に続く運休（除雪が追いつかない日）も、気象予報からは予測できません。強風による運休は事例が少ないため、突風25m/s以上の予報では一律に「変化に注意」としています。</p>
        </section>
        <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-bold">確認した冬の過去記録</h2>
            <div className="my-5 flex flex-wrap gap-8"><div><b className="text-4xl text-slate-900">{summary.storms}</b> 回の大雪</div><div><b className="text-4xl text-slate-900">{summary.actualSegmentReopenings}</b> 区間の再開実績</div></div>
            <p>2022年2月の2回、2025年12月、2026年1月の公式資料を確認しました。予定時刻と救済列車を実績から除き、実際の再開が確認できる区間を掲載しています。</p>
            <details className="mt-4"><summary className="cursor-pointer font-bold text-blue-700">記録と出典を見る</summary><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr className="border-b border-slate-300"><th className="py-2">運休開始日</th><th>区間</th><th>再開実績</th></tr></thead><tbody>{cases.map(event => <tr key={event.id} className="border-b border-slate-200"><td className="py-3 pr-3">{event.startDate}</td><td className="pr-3">{event.section}</td><td><a href={event.sourceUrl} className="text-blue-700 underline" target="_blank" rel="noopener noreferrer">{event.resumedDate.slice(5).replace('-', '/')} {event.label} ↗</a></td></tr>)}</tbody></table></div></details>
            <p className="mt-4 text-sm text-slate-600">大規模障害を選んだ事例集です。正常運行や短い運休の十分な比較例はなく、これだけで的中率は計算できません。正確な開始・再開時刻が揃う{summary.exactDurationRows}区間は、{summary.exactDurationStorms}回の雪害に属します。同じ雪害の区間を独立した標本として扱いません。</p>
        </section>
        <section id="snow-verification" className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-6">
            <h2 className="text-xl font-bold">局地的な大雪の見逃しが残っています</h2>
            <p className="mt-3">過去の大雪に、現在の気象判定を当てはめて確認しました。札幌では、取得した気象モデルの雪が実際の観測より大幅に少なく、リスクを低く判定する例がありました。</p>
            <dl className="my-5 grid grid-cols-2 gap-5"><div><dt className="text-sm">2026年1月25日・札幌の実測</dt><dd className="mt-1 text-3xl font-bold"><span className="block sm:inline">{snowExample?.observedSnowCmCalendarDay ?? '—'}</span> <span className="whitespace-nowrap text-base font-normal">cm／日</span></dd></div><div><dt className="text-sm">24時間前の予報を集計（GFS）</dt><dd className="mt-1 text-3xl font-bold"><span className="block sm:inline">{snowExample?.modelSnowCmCalendarDay ?? '—'}</span> <span className="whitespace-nowrap text-base font-normal">cm／日</span></dd></div></dl>
            {regionalExample && <p className="mb-3 text-sm">日本向けのMSMモデルも照合しましたが、同じ日は{regionalExample.modelSnowCmCalendarDay}cm相当でした。これは降水量・気温から換算した値で、気象庁が発表した降雪量そのものではありません。</p>}
            <p className="text-sm">現在配信する予報と同じモデルの精度評価ではありません。点観測とモデルの格子推計にも違いがありますが、冬季の信頼性を確認するうえで解消すべき差です。</p>
            <a className="mt-3 inline-block text-blue-800 underline" href="https://www.data.jma.go.jp/stats/etrn/view/daily_s1.php?prec_no=14&block_no=47412&year=2026&month=1&day=&view=a3" target="_blank" rel="noopener noreferrer">気象庁の観測記録を見る ↗</a>
            <p className="mt-3 text-sm">検証用に、気象データ{replay.weatherRows.toLocaleString('ja-JP')}地点・時間分と、気象庁の観測{replay.observationDays}日分を取得しました。数値は日本時間の1日合計で、連続24時間の最大降雪量とは異なります。</p>
        </section><div className="mt-8 space-y-8">
            <section><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Snowflake/> 気象リスクの見方</h2><p>沿線の降雪・雨・風の予報から、過去に運休が起きやすかった条件かどうかを表示しています。「強い気象リスク」は運休の確定、「低め」は運転の保証ではありません。移動前に確認するための目安です。</p></section>
            <section><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Clock3/> 復旧の見通し</h2><p>JRが発表した再開予定を優先します。過去実績からの参考時間は、運休開始時刻と同じ路線・原因の確認済み事例が揃った場合に表示します。十分な情報がない場合は、時間を出さず「不明」と表示します。いずれも再開の確約ではありません。</p></section>
            <section><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Radio/> 現地の声の見方</h2><p>直近15分の投稿を確認します。現地報告は未確認情報です。路線・方向・列車によって状況が異なるため、投稿をもとに公式情報を上書きしません。投稿がないことも、運転している証拠にはなりません。</p></section>
            <section><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><ShieldCheck/> 冬の実績で検証します</h2><p>冬のデータを中心に、運休の見逃し、不要な警告、復旧時間の誤差を評価します。夏を含めた平均や、プログラムの動作テストの合格率を、冬の予測精度として表示することはありません。この冬に15分ごとに集めている運行記録で、真冬の検証と再調整を行います。</p><p className="mt-3">2026年10月12日の確認では、保存されていた運行データに誤った分類や記録の欠落が見つかりました。過去記録の確認と修復が必要なため、このデータから精度を保証することはできません。</p></section>
        </div>
        <a href="https://www3.jrhokkaido.co.jp/webunkou/" target="_blank" rel="noopener noreferrer" className="mt-9 inline-block rounded-lg bg-green-700 px-6 py-3 font-bold text-white">JR北海道の公式情報を見る ↗</a>
    </main>;
}
