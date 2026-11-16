'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ArrowRight, ArrowUpRight, TrainFront, Clock3, Wind, Snowflake, CloudRain,
    RefreshCw, AlertCircle, ChevronRight,
    SlidersHorizontal, CircleCheck, CircleHelp, Cloud, Sun, CloudSnow, CloudSun, CalendarDays } from 'lucide-react';
import { JourneyCommunity } from './journey-community';
import { getStationById, getAlternativeRoutes } from '@/lib/hokkaido-data';
import { japanDate, addDays } from '@/lib/forecast/time';
import type { JourneyForecast } from '@/lib/forecast/types';
import type { CommunitySnapshot } from '@/lib/forecast/community';
import { stationPlaces } from '@/lib/forecast/places';

const officialLabels = { normal: '平常運転', delay: '遅延あり', partial: '一部運休', suspended: '運転見合わせ', cancelled: '運休あり', unknown: '運行状況は不明' };
const riskLabels = { low: '低め', watch: '注意', high: '高い', severe: '非常に高い', unknown: '不明' };
function clockLabel(value: string | null) {
    return value ? new Date(value).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }) : '—';
}
function dayLabel(value: string) {
    return new Date(`${value}T12:00:00+09:00`).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' });
}
function recoveryClock(value: string, now: string) {
    return `${japanDate(new Date(value)) !== japanDate(new Date(now)) ? dayLabel(japanDate(new Date(value))) + ' ' : ''}${clockLabel(value)}`;
}
function mapSearch(query: string) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`; }

function WeatherSymbol({ weather }: { weather?: string }) {
    const Icon = !weather ? CircleHelp : /雪/.test(weather) ? CloudSnow : /雨/.test(weather) ? CloudRain : /曇/.test(weather) ? Cloud : /晴/.test(weather) ? Sun : CloudSun;
    return <Icon size={27} className={!weather ? 'sky-unknown' : /雪|雨/.test(weather) ? 'sky-wet' : /晴/.test(weather) ? 'sky-sun' : 'sky-cloud'} aria-label={weather || '天気不明'}/>;
}

function ActionPlan({ result, deadline, communitySignal }: { result: JourneyForecast; deadline: string; communitySignal: CommunitySnapshot['signal'] }) {
    const departure = getStationById(result.request.departureId)!;
    const arrival = getStationById(result.request.arrivalId)!;
    const isToday = result.request.date === japanDate();
    const disrupted = isToday && (['suspended', 'cancelled', 'partial'].includes(result.official.status) || communitySignal === 'disruption' || communitySignal === 'mixed');
    const longWait = isToday && (result.recovery.kind === 'all-day' || (result.recovery.remainingMinutes?.upper ?? 0) >= 360);
    const shortWait = isToday && !!result.recovery.remainingMinutes && result.recovery.remainingMinutes.upper <= 120;
    const mode = deadline && disrupted ? 'transport' : longWait ? 'stay' : shortWait && disrupted ? 'shelter' : disrupted || ['high', 'severe'].includes(result.current.level) ? 'transport' : null;
    const options = getAlternativeRoutes(departure.id, arrival.id).filter(option => option.url?.startsWith('https://')).slice(0, 2);
    const places = stationPlaces(departure.id, new Date(`${result.request.date}T${result.request.time}:00+09:00`));
    const actions = [
        { id: 'transport', artwork: 'transport', title: 'バス・他の交通', subtitle: `${arrival.name}方面`, href: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${departure.name}駅 北海道`)}&destination=${encodeURIComponent(`${arrival.name}駅 北海道`)}&travelmode=transit` },
        { id: 'shelter', artwork: 'cafe', title: '近くのカフェ', subtitle: `${departure.name}駅周辺`, href: mapSearch(`${departure.name}駅 カフェ 待合室`) },
        { id: 'stay', artwork: 'hotel', title: '近くの宿泊先', subtitle: `${departure.name}駅周辺`, href: mapSearch(`${departure.name}駅 ホテル`) },
    ];
    return <section className="journey-actions" aria-labelledby="action-title">
        <div className="journey-section-heading"><h3 id="action-title">交通・待機場所</h3>{deadline && <span>到着希望 {deadline}</span>}</div>
        {mode && <p className="action-reason">{mode === 'stay' ? '長時間の運休に備えて、交通・宿泊先を確認' : mode === 'shelter' ? '再開予定まで、近くの屋内で待機' : deadline ? '到着希望時刻があるため、別の交通手段を確認' : '運休・遅延に備えて、別の交通手段を確認'}</p>}
        <div className="action-grid">{actions.map(({ id, artwork, title, subtitle, href }) => <a key={id} href={href} target="_blank" rel="noopener noreferrer" className={`action-card action-${id} ${id === mode ? 'recommended' : ''}`}>
            <span className="action-art"><Image src={`/images/${artwork}-v1.webp`} width={80} height={80} sizes="(max-width: 650px) 64px, 80px" alt=""/></span><span className="action-label"><strong>{title}</strong><small>{subtitle}</small></span><span className="action-arrow"><ArrowUpRight size={17}/></span>{id === mode && <span className="recommended-label">優先して確認</span>}
        </a>)}</div>
        {result.buses && <div className="bus-departures">
            <div className="journey-section-heading"><h4>空港バスの候補</h4><a href={result.buses.url} target="_blank" rel="noopener noreferrer">公式時刻表<ArrowUpRight size={13}/></a></div>
            {result.buses.departures.length > 0 ? result.buses.departures.slice(0,2).map(bus => {
                const pastDeadline = !!deadline && Date.parse(bus.arrivesAt) > Date.parse(`${result.request.date}T${deadline}:00+09:00`);
                return <div className="bus-departure" key={`${bus.departsAt}:${bus.name}`}>
                    <div className="bus-time"><strong>{clockLabel(bus.departsAt)}</strong><ArrowRight size={16}/><strong>{clockLabel(bus.arrivesAt)}</strong><span>{bus.durationMinutes}分</span></div>
                    <div className="bus-meta"><span>{bus.name}{pastDeadline && <em>到着希望より後</em>}</span><a href={bus.boardingUrl} target="_blank" rel="noopener noreferrer">{bus.boarding}のりば<ArrowUpRight size={14}/></a></div>
                </div>;
            }) : <p className="journey-caption">{result.buses.available ? '指定時刻以降の候補はありません。' : '時刻表を確認できません。公式案内をご確認ください。'}</p>}
            {result.buses.departures.length > 0 && <p className="journey-micro">時刻表上の候補 · 出発まで15分以上の便を表示。のりばへの移動時間・遅延・運休・満席は未反映。</p>}
        </div>}
        {(places.cafe || places.hotel) && <div className="nearby-places">
            {places.cafe && <a href={places.cafe.url} target="_blank" rel="noopener noreferrer"><span className="place-kind">カフェ</span><span><b>{places.cafe.name}</b><small>{places.cafe.detail}</small></span><ArrowUpRight size={16}/></a>}
            {places.hotel && <a href={places.hotel.url} target="_blank" rel="noopener noreferrer"><span className="place-kind">宿泊</span><span><b>{places.hotel.name}</b><small>{places.hotel.detail}</small></span><ArrowUpRight size={16}/></a>}
        </div>}
        {options.length > 0 && <div className="alternative-links">{options.map(option => <a key={option.name} href={option.url} target="_blank" rel="noopener noreferrer">{option.name}<ArrowUpRight size={14}/></a>)}</div>}
        <p className="journey-micro">運行・営業・空室はリンク先で確認。交通検索にはJRも含みます。</p>
    </section>;
}

export function ForecastResult({ result, deadline, refresh, selectDate, edit }: { result: JourneyForecast; deadline: string; refresh: () => void; selectDate: (date: string) => void; edit: () => void }) {
    const [communitySignal, setCommunitySignal] = useState<CommunitySnapshot['signal']>('insufficient');
    const [now, setNow] = useState(() => Date.now());
    const [communityRoute, setCommunityRoute] = useState(result.route.id);
    const [outlook, setOutlook] = useState<'hours' | 'days'>('hours');
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
    const stale = now - Date.parse(result.generatedAt) >= 5 * 60_000;
    const dep = getStationById(result.request.departureId)!;
    const arr = getStationById(result.request.arrivalId)!;
    const weather = result.current.weather;
    const observedSnow = result.observedSnow?.points.reduce<(NonNullable<JourneyForecast['observedSnow']>)['points'][number] | null>((a,b) => !a || b.snowfall24hCm > a.snowfall24hCm ? b : a, null);
    const recovery = result.recovery;
    const disrupted = ['suspended', 'cancelled', 'partial', 'delay'].includes(result.official.status);
    const StatusIcon = result.official.status === 'normal' ? CircleCheck : result.official.status === 'unknown' ? CircleHelp : AlertCircle;
    const showRecovery = recovery.kind !== 'not-disrupted';
    const recoveryValue = recovery.kind === 'all-day' ? '終日運休' : recovery.earliest ? recovery.kind === 'official' ? clockLabel(recovery.earliest) : recoveryClock(recovery.earliest, result.generatedAt) : recovery.kind === 'unknown' ? '未定' : '—';
    return <div className={`forecast-result ${showRecovery ? 'with-recovery' : ''}`}>
        <div className="result-heading"><div><p className="trip-date"><CalendarDays size={15}/>{dayLabel(result.request.date)} <b>{result.request.time}</b> 出発</p><h1><span>{dep.name}</span><ArrowRight aria-hidden="true"/><span>{arr.name}</span></h1></div><button className="edit-search" type="button" onClick={edit}><SlidersHorizontal size={17}/> 条件を変更</button></div>
        {stale && <div className="journey-notice" role="status">情報が古くなっています。<button type="button" onClick={refresh}>更新する</button></div>}
        <section className={`operation-ticket status-${result.official.status}`} aria-labelledby="operation-title">
            <div className="ticket-top"><span><TrainFront size={16}/>{result.route.name}</span><a href={result.official.url} className="official-source" target="_blank" rel="noopener noreferrer">JR公式<ArrowUpRight size={14}/></a></div>
            <div className={`operation-board ${showRecovery ? 'has-recovery' : ''}`}>
                <div className="operation-status">
                    <StatusIcon className="operation-icon" size={36}/>
                    <div><h2 id="operation-title">現在の運行状況</h2><strong className="status-value">{officialLabels[result.official.status]}</strong><p className="status-meta">{result.official.status === 'unknown' ? '公式ページで最新情報を確認' : `発表 ${clockLabel(result.official.publishedAt)}`}</p></div>
                </div>
                {showRecovery && <section className={`recovery-panel ${recovery.kind === 'all-day' ? 'all-day' : ''}`} aria-labelledby="recovery-title">
                    <div className="metric-heading"><h2 id="recovery-title"><Clock3 size={17}/> 再開の見込み</h2><span className="source-tag">{recovery.kind === 'historical' ? '過去の実績' : recovery.kind === 'unknown' ? '情報不足' : 'JR発表'}</span></div>
                    {recovery.kind === 'official' && recovery.earliest && japanDate(new Date(recovery.earliest)) !== japanDate(new Date(result.generatedAt)) && <p className="recovery-date">{dayLabel(japanDate(new Date(recovery.earliest)))}</p>}
                    <strong className={`recovery-value ${recoveryValue.length > 8 ? 'long-value' : ''}`}>{recoveryValue}{recovery.kind === 'historical' && recovery.latest && <span>〜 {recoveryClock(recovery.latest, result.generatedAt)}</span>}{recovery.earliest && <small>頃</small>}</strong>
                    <details className="recovery-detail"><summary>見込みの根拠<ChevronRight size={14}/></summary><p>{recovery.detail}</p>{recovery.kind === 'historical' && <p>検証済みの予測区間ではありません。</p>}</details>
                </section>}
            </div>
            {result.official.status !== 'unknown' && <details className="official-detail" open={disrupted}><summary>発表内容を読む <ChevronRight size={16}/></summary><p>{result.official.text}</p></details>}
        </section>
        {result.request.date !== japanDate() && <p className="journey-notice">運行状況は現在の情報です。選択日の発表ではありません。</p>}
        <section className={`weather-overview risk-${result.current.level}`} aria-labelledby="weather-title">
            <div className="weather-heading"><h2 id="weather-title">{result.request.time} の気象リスク</h2><strong><span className="risk-dot"/>{riskLabels[result.current.level]}</strong><Link href="/accuracy#snow-verification">参考値<CircleHelp size={14}/></Link></div>
            <div className="weather-metrics"><span><Wind size={22}/><span className="weather-name">風速</span><b>{weather?.windSpeed.toFixed(1) ?? '—'}<small>m/s</small></b></span><span><Snowflake size={22}/><span className="weather-name">降雪</span><b>{weather?.snowfall?.toFixed(1) ?? '—'}<small>cm/h</small></b></span><span><CloudRain size={22}/><span className="weather-name">降水</span><b>{weather?.precipitation.toFixed(1) ?? '—'}<small>mm/h</small></b></span></div>
            {result.current.level === 'unknown' && <p>{result.current.reasons[0]}</p>}
            {observedSnow && observedSnow.snowfall24hCm > 0 && <a className="observed-snow" href={result.observedSnow!.url} target="_blank" rel="noopener noreferrer"><Snowflake size={18}/><span><b>{observedSnow.snowfall24hCm}<small> cm</small></b> 24時間降雪<small>{observedSnow.station} · {clockLabel(result.observedSnow!.observedAt)} 観測</small></span><ArrowUpRight size={15}/></a>}
            {result.warnings && (result.warnings.alerts.length > 0 || !result.warnings.available) && <a className={`weather-alert-strip ${result.warnings.alerts.some(a => a.severity !== 'advisory') ? 'has-warning' : ''}`} href={result.warnings.url} target="_blank" rel="noopener noreferrer">
                <AlertCircle size={19}/><span><b>{result.warnings.alerts.length ? [...new Set(result.warnings.alerts.map(a => a.name))].join('・') : '警報情報を取得できません'}</b><small>現在 · 路線周辺の気象庁発表</small></span><ArrowUpRight size={16}/>
            </a>}
            {result.sources.forecastHoursAhead >= 72 && <p>先の予報は変わることがあります。</p>}
        </section>
        <ActionPlan result={result} deadline={deadline} communitySignal={communitySignal}/>
        <section className="forecast-outlook" aria-labelledby="outlook-title">
            <div className="journey-section-heading"><h3 id="outlook-title">気象リスク予報</h3><Link href="/accuracy#snow-verification">冬季は検証中<ChevronRight size={14}/></Link></div>
            <div className="outlook-switch" role="tablist" aria-label="予報の期間" onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 'hours' : event.key === 'End' ? 'days' : outlook === 'hours' ? 'days' : 'hours';
                setOutlook(next);
                event.currentTarget.querySelector<HTMLButtonElement>(`#${next}-tab`)?.focus();
            }}>
                <button type="button" id="hours-tab" role="tab" tabIndex={outlook === 'hours' ? 0 : -1} aria-selected={outlook === 'hours'} aria-controls="hours-panel" onClick={() => setOutlook('hours')}>時間ごと</button>
                <button type="button" id="days-tab" role="tab" tabIndex={outlook === 'days' ? 0 : -1} aria-selected={outlook === 'days'} aria-controls="days-panel" onClick={() => setOutlook('days')}>7日間</button>
            </div>
            <div id="hours-panel" role="tabpanel" aria-labelledby="hours-tab" hidden={outlook !== 'hours'}>
                <div className="hourly-grid" aria-label="時間ごとの気象リスク">{result.hourly.map(slot => <div key={`${slot.date}${slot.time}`} className={`hourly-slot risk-${slot.level} ${slot.date === result.request.date && slot.time.slice(0, 2) === result.request.time.slice(0, 2) ? 'selected' : ''}`}>
                    <span>{slot.date !== result.request.date ? `${Number(slot.date.slice(-2))}日 ` : ''}{slot.time}</span><WeatherSymbol weather={slot.weather?.weather}/><strong>{riskLabels[slot.level]}</strong><small>{slot.weather?.windSpeed.toFixed(1) ?? '—'} m/s</small>
                </div>)}</div>
            </div>
            <div id="days-panel" role="tabpanel" aria-labelledby="days-tab" hidden={outlook !== 'days'}>
                <div className="week-grid">{result.daily.map(slot => <button type="button" key={slot.date} className={`risk-${slot.level} ${slot.date === result.request.date ? 'selected' : ''}`} onClick={() => selectDate(slot.date)} aria-pressed={slot.date === result.request.date} aria-label={`${dayLabel(slot.date)} ${riskLabels[slot.level]}の予測を表示`}><span>{slot.date === japanDate() ? '今日' : slot.date === addDays(japanDate(), 1) ? '明日' : dayLabel(slot.date)}</span><WeatherSymbol weather={slot.weather?.weather}/><strong>{riskLabels[slot.level]}</strong><small>{slot.weather?.windSpeed.toFixed(1) ?? '—'} m/s</small></button>)}</div>
            </div>
            <p className="journey-micro">{outlook === 'days' ? `各日 ${result.request.time} 頃 · ` : ''}気象条件の目安です。運休確率・再開時刻を示すものではありません。</p>
        </section>
        {result.route.lines.length > 1 && <label className="community-route-label">現地報告の路線<select value={communityRoute} onChange={e => { setCommunityRoute(e.target.value); setCommunitySignal('insufficient'); }}>{result.route.lines.map(line => <option key={line.id} value={line.id}>{line.name}</option>)}</select></label>}
        <JourneyCommunity key={`${communityRoute}:${dep.id}:${arr.id}`} routeId={communityRoute} routeName={result.route.lines.find(line => line.id === communityRoute)?.name || result.route.name} departureId={dep.id} arrivalId={arr.id} officialStatus={result.official.status} onSignal={setCommunitySignal}/>
        <details className="forecast-evidence"><summary>予測の根拠・過去の記録 <ChevronRight size={16}/></summary><dl><div><dt>気象予報</dt><dd>Open-Meteo · 取得 {clockLabel(result.sources.weatherFetchedAt)} · {result.current.coverage.available}/{result.current.coverage.total} 地点</dd></div><div><dt>対象地点</dt><dd>{result.route.points.join('・')}</dd></div><div><dt>対象範囲</dt><dd>{result.route.scope}</dd></div><div><dt>復旧実績</dt><dd>{result.historyAvailable ? '検証済み記録を照合' : '今回の表示では実績の照合なし'} · 採用 {recovery.sampleCount} 件</dd></div></dl><ul>{result.current.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p>過去の運休実績（2026年2〜11月と冬の大雪記録）で重みを決めた参考指標です。冬の事例はまだ少なく、局地的な大雪は前日の予報で捉えられないことがあります。<Link href="/accuracy#core-verification">検証結果</Link></p>
            {result.winterCases.length > 0 && <div className="winter-cases"><h4>過去の冬の再開記録</h4><p>乗車区間外も含む路線の参考例です。今回の復旧予測ではありません。</p>{result.winterCases.slice(0, 4).map(event => <a href={event.sourceUrl} key={event.id} target="_blank" rel="noopener noreferrer"><span><b>{event.section}</b><small>{event.startDate} の大雪</small></span><span>{event.resumedDate.slice(5).replace('-', '/')} {event.label}<ArrowUpRight size={13}/></span></a>)}</div>}<a href="/accuracy">データの検証状況<ArrowUpRight size={14}/></a><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather data by Open-Meteo ↗</a></details>
        <div className="result-updated"><span>取得 {clockLabel(result.generatedAt)}</span><button type="button" onClick={refresh}><RefreshCw size={15}/> 情報を更新</button></div>
    </div>;
}

