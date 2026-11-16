'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpRight, ArrowUpDown, TrainFront, CalendarDays, Clock3,
    Bookmark, Snowflake, AlertCircle, ChevronRight, Check, LoaderCircle,
    Search } from 'lucide-react';
import { RouteSymbol } from '@/components/journey-symbols';
import { JourneyStationInput } from '@/components/journey-station-input';
import { ForecastResult } from '@/components/journey-result';
import { useJourneyForecast } from '@/hooks/useJourneyForecast';
import { useFavorites } from '@/hooks/useFavorites';
import { getStationById } from '@/lib/hokkaido-data';
import { japanDate, japanTime, addDays } from '@/lib/forecast/time';
import '../journey.css';

const quickRoutes = [
    { from: 'sapporo', to: 'shin-chitose-airport', name: '新千歳空港' },
    { from: 'sapporo', to: 'otaru', name: '小樽' },
    { from: 'sapporo', to: 'asahikawa', name: '旭川' },
    { from: 'sapporo', to: 'obihiro', name: '帯広' },
    { from: 'sapporo', to: 'hakodate', name: '函館' },
    { from: 'sapporo', to: 'kutchan', name: '倶知安' },
];
/** 暫定: 新しい区間結果画面(作り直し段階3)までの旧画面。URLの from/to/date/time で検索を始める。 */
export function JourneyLegacy({ initial }: { initial?: { from?: string; to?: string; date?: string; time?: string } }) {
    const [departure, setDeparture] = useState('');
    const [arrival, setArrival] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [deadline, setDeadline] = useState('');
    const [editing, setEditing] = useState(false);
    const { result, loading, error, search, refresh } = useJourneyForecast();
    const { favorites, isLoaded, addFavorite, removeFavorite, isFavorite } = useFavorites();
    const resultRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLElement>(null);
    // Browser clock is initialized after hydration so the first render agrees with SSR.
    useEffect(() => {
        const day = initial?.date && /^\d{4}-\d{2}-\d{2}$/.test(initial.date) ? initial.date : japanDate();
        const at = initial?.time && /^\d{2}:\d{2}$/.test(initial.time) ? initial.time : japanTime();
        setDate(day); setTime(at);
        if (initial?.from && initial?.to && getStationById(initial.from) && getStationById(initial.to) && initial.from !== initial.to) {
            setDeparture(initial.from); setArrival(initial.to);
            void search({ departureId: initial.from, arrivalId: initial.to, date: day, time: at });
        }
        // 初回のみ
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const today = japanDate();
    const matches = result && result.request.departureId === departure && result.request.arrivalId === arrival && result.request.date === date && result.request.time === time;
    const showSearch = !matches || editing;
    const submit = (from = departure, to = arrival, day = date) => {
        if (!getStationById(from) || !getStationById(to) || from === to) return;
        setDeparture(from); setArrival(to); setDate(day); setEditing(false);
        void search({ departureId: from, arrivalId: to, date: day, time });
    };
    useEffect(() => {
        if (result) resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }, [result]);
    const favorite = isFavorite(departure, arrival);
    const validStations = !!getStationById(departure) && !!getStationById(arrival) && departure !== arrival;
    const edit = () => { setEditing(true); requestAnimationFrame(() => searchRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })); };
    return <main className="journey-app">
        <a href={showSearch ? '#journey-search' : '#journey-result'} className="journey-skip">{showSearch ? 'ルート検索' : '検索結果'}へスキップ</a>
        <div className={`journey-shell ${matches ? 'has-result' : ''}`}>
            {showSearch && <section className="journey-search-card" id="journey-search" ref={searchRef}>
                <div className="search-heading"><span className="section-kicker">JR北海道</span><h1>{matches ? '検索条件' : '運休・復旧予測'}</h1><span className="beta-badge">試験運用</span></div>
                <div className="journey-landscape" aria-hidden="true"><Image src="/images/winter-railway-v1.webp" alt="" width={1536} height={1024} sizes="(max-width: 650px) 100vw, (max-width: 1000px) 40vw, 400px" priority/></div>
                <div className="quick-routes"><h2><span>札幌から</span> 人気のルート</h2><div>{quickRoutes.map(route => <button type="button" key={route.to} aria-pressed={departure === route.from && arrival === route.to} aria-label={`札幌から${route.name}を選択`} onClick={() => { setDeparture(route.from); setArrival(route.to); }}><RouteSymbol destination={route.to}/><span>{route.name}</span>{departure === route.from && arrival === route.to ? <Check size={15}/> : <ChevronRight size={15}/>}</button>)}</div></div>
                <form className="journey-search-form" onSubmit={e => { e.preventDefault(); submit(); }}>
                    <div className="station-pair"><JourneyStationInput label="出発駅" value={departure} onChange={setDeparture} exclude={arrival}/><button type="button" className="station-swap" aria-label="出発駅と到着駅を入れ替える" disabled={!departure && !arrival} onClick={() => { setDeparture(arrival); setArrival(departure); }}><ArrowUpDown size={19}/></button><JourneyStationInput label="到着駅" value={arrival} onChange={setArrival} exclude={departure}/></div>
                    <div className="search-controls"><div className="date-shortcut-label"><span>出発日</span><div className="form-date-shortcuts"><button type="button" aria-pressed={date === today} onClick={() => setDate(today)}>今日</button><button type="button" aria-pressed={date === addDays(today, 1)} onClick={() => setDate(addDays(today, 1))}>明日</button></div></div><div className="journey-date-row"><label><span><CalendarDays size={15}/> 日付を指定</span><input aria-label="出発日" type="date" required min={today} max={addDays(today, 6)} value={date} onChange={e => setDate(e.target.value)}/></label><label><span><Clock3 size={15}/> 出発時刻</span><input aria-label="出発時刻" type="time" required value={time} onChange={e => setTime(e.target.value)}/></label></div></div>
                    <button type="submit" className="journey-button search-submit" disabled={loading || !date || !time || !validStations}>{loading ? <><LoaderCircle size={22} className="spin"/> 検索中</> : <><Search size={22}/>このルートを調べる<ArrowRight size={21}/></>}</button>
                    <div className="search-extras"><details className="arrival-deadline"><summary>到着希望時刻を指定<ChevronRight size={14}/></summary><label htmlFor="arrival-deadline">到着希望<input id="arrival-deadline" type="time" value={deadline} onChange={e => setDeadline(e.target.value)}/></label></details>{validStations && <button className="save-route" type="button" onClick={() => favorite ? removeFavorite(`${departure}-${arrival}`) : addFavorite(departure, arrival, getStationById(departure)!.name, getStationById(arrival)!.name)}>{favorite ? <Check size={16}/> : <Bookmark size={16}/>} {favorite ? '保存済み' : 'ルートを保存'}</button>}{matches && <button type="button" className="cancel-edit" onClick={() => setEditing(false)}>閉じる</button>}</div>
                </form>
                {isLoaded && favorites.length > 0 && <div className="saved-routes"><h2><Bookmark size={15}/> 保存したルート</h2><div>{favorites.slice(0, 5).map(favorite => <button type="button" key={favorite.id} onClick={() => submit(favorite.departureId, favorite.arrivalId)}>{favorite.departureName}<ArrowRight size={13}/>{favorite.arrivalName}</button>)}</div></div>}
                {result && !matches && <p className="journey-notice search-change-notice">条件を変更しました。検索して結果を更新。</p>}
            </section>}
            <div className="journey-content" id="journey-result" ref={resultRef} aria-busy={loading}>
                {loading ? <div className="forecast-loading" role="status"><LoaderCircle size={32} className="spin"/><h2>運行情報・気象予報を確認中</h2></div> : error ? <div className="forecast-error" role="alert"><AlertCircle size={30}/><h2>情報を取得できませんでした</h2><p>{error}</p><button type="button" className="journey-button" onClick={() => submit()}>もう一度検索する</button><a href="https://www3.jrhokkaido.co.jp/webunkou/" target="_blank" rel="noopener noreferrer">JR公式情報 ↗</a></div> : matches && <ForecastResult key={result.generatedAt} result={result} deadline={deadline} refresh={refresh} selectDate={day => submit(departure, arrival, day)} edit={edit}/>}
            </div>
            {!result && !loading && <div className="start-links"><a href="https://www3.jrhokkaido.co.jp/webunkou/" target="_blank" rel="noopener noreferrer"><TrainFront size={23}/><span>JR公式の運行情報</span><ArrowUpRight size={19}/></a><Link href="/accuracy"><Snowflake size={23}/><span>予測について</span><ChevronRight size={19}/></Link></div>}
            <div className="journey-bottom-note"><p>乗車する列車の運行は、JR公式・駅の案内をご確認ください。</p></div>
        </div>
    </main>;
}
