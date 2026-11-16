'use client';
import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Radio, Send, Check } from 'lucide-react';
import type { CommunitySnapshot } from '@/lib/forecast/community';
import type { JRStatus } from '@/lib/types';
import { HOKKAIDO_STATIONS, getStationById } from '@/lib/hokkaido-data';

const choices = [{ type: 'normal', label: '動いている' }, { type: 'stopped', label: '止まっている' },
    { type: 'delayed', label: '遅れている' }, { type: 'crowded', label: '混んでいる' }] as const;

export function JourneyCommunity({ routeId, routeName, officialStatus, onSignal, departureId, arrivalId }: {
    routeId: string; routeName: string; officialStatus: JRStatus | 'unknown';
    departureId?: string; arrivalId?: string;
    onSignal: (signal: CommunitySnapshot['signal']) => void;
}) {
    const [snapshot, setSnapshot] = useState<CommunitySnapshot | null>(null);
    const [error, setError] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const stations = HOKKAIDO_STATIONS.filter(station => station.lines.includes(routeId));
    const [stationId, setStationId] = useState(stations.some(s => s.id === departureId) ? departureId! : '');
    const [directionStationId, setDirectionStationId] = useState(stations.some(s => s.id === arrivalId) ? arrivalId! : '');
    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const params = new URLSearchParams({routeId, stationId, directionStationId});
            const response = await fetch(`/api/community?${params}`, { signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000), cache: 'no-store' });
            if (!response.ok) throw new Error('Unavailable');
            const value: CommunitySnapshot = await response.json();
            if (signal?.aborted) return;
            setSnapshot(value); setError(false); onSignal(value.signal);
        } catch {
            if (signal?.aborted) return;
            setError(true); setSnapshot(null); onSignal('insufficient');
        }
    }, [routeId, stationId, directionStationId, onSignal]);
    useEffect(() => {
        const controller = new AbortController();
        void load(controller.signal);
        const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(controller.signal); }, 15_000);
        return () => { controller.abort(); clearInterval(timer); };
    }, [load]);
    async function submit() {
        if (!selected || sending) return;
        setSending(true); setMessage(''); setSuccess(false);
        try {
            const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ routeId, reportType: selected, comment, stationId, directionStationId }),
                signal: AbortSignal.timeout(10_000) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '共有できませんでした。');
            setSuccess(true); setMessage('報告を共有しました。ありがとうございます。'); setSelected(null); setComment('');
            await load();
        } catch (error) { setMessage(error instanceof Error ? error.message : '共有できませんでした。再度お試しください。'); }
        finally { setSending(false); }
    }
    const conflict = snapshot?.signal === 'mixed' || (snapshot?.signal === 'disruption' && officialStatus === 'normal') ||
        (snapshot?.signal === 'moving' && ['suspended', 'cancelled', 'partial'].includes(officialStatus));
    return <section className="journey-community" aria-labelledby="community-title">
        <div className="journey-section-heading"><h3 id="community-title"><Radio size={18} /> 現地の声</h3><span>直近15分</span></div>
        <p className="journey-caption">{routeName} · 利用者の未確認情報</p>
        <div className="community-location">
            <label>駅<select disabled={sending} value={stationId} onChange={e => {setStationId(e.target.value); if(e.target.value === directionStationId) setDirectionStationId(''); setSnapshot(null);onSignal('insufficient');}}><option value="">路線全体</option>{stations.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label>方面<select disabled={sending} value={directionStationId} onChange={e => {setDirectionStationId(e.target.value);setSnapshot(null);onSignal('insufficient');}}><option value="">両方向</option>{stations.filter(s=>s.id!==stationId).map(s=><option key={s.id} value={s.id}>{s.name}方面</option>)}</select></label>
        </div>
        {error ? <p className="journey-notice" role="status">現地報告を取得できません。</p> : !snapshot ? <p className="journey-caption">現地報告を確認中…</p> : <>
            {snapshot.total > 0 ? <div className="community-counts">{choices.map(choice => <div key={choice.type}><strong>{snapshot.counts[choice.type]}<span className="count-unit">件</span></strong><span>{choice.label}</span></div>)}</div> : <div className="community-empty"><MessageCircle size={24}/><p>この15分間の報告はありません<small>投稿から運行状況を判断できません。</small></p></div>}
            {conflict && <p className="journey-notice">情報が食い違っています。列車・方向・区間によって状況が異なる可能性があります。駅係員や公式案内も確認してください。</p>}
            {snapshot.signal === 'disruption' && !conflict && <p className="journey-notice">複数の送信元から運休・遅延の報告があります。公式発表前の可能性もあるため、代替交通を早めに確認してください。</p>}
            {snapshot.comments.map((entry, i) => <blockquote key={`${entry.createdAt}-${i}`}><MessageCircle size={14}/><p>{entry.text}</p><time>{new Date(entry.createdAt).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}</time></blockquote>)}
        </>}
        <details className="community-form"><summary>いまの様子を報告 <MessageCircle size={15}/></summary>
            <p className="journey-caption">{stationId ? `${getStationById(stationId)?.name}駅` : routeName}{directionStationId ? ` · ${getStationById(directionStationId)?.name}方面` : ''}で、いま確認した状況</p>
            <div className="community-choices">{choices.map(choice => <button type="button" key={choice.type} aria-pressed={selected === choice.type} onClick={() => setSelected(choice.type)}>{choice.label}</button>)}</div>
            <label htmlFor="report-comment">補足（任意／個人情報を除く）</label>
            <input id="report-comment" value={comment} maxLength={160} onChange={e => setComment(e.target.value)} placeholder="例：札幌方面の列車が発車しました"/>
            <button type="button" className="journey-button" disabled={!selected || sending} onClick={submit}><Send size={15}/>{sending ? '共有しています…' : 'この内容を共有する'}</button>
        </details>
        {message && <p className={success ? 'community-success' : 'journey-notice'} role="status">{success && <Check size={15}/>} {message}</p>}
        <p className="journey-micro">15秒ごとに自動更新</p>
    </section>;
}
