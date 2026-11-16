export interface RecoveryIncident {
    id: string;
    route_id: string;
    cause: string;
    started_at: string;
    resumed_at: string;
    verified: boolean;
    /** Reviewed independent weather event; missing grouping is not a sample. */
    storm_id?: string | null;
}

export interface RecoveryEstimate {
    kind: 'not-disrupted' | 'official' | 'historical' | 'all-day' | 'unknown';
    label: string;
    detail: string;
    earliest: string | null;
    latest: string | null;
    sampleCount: number;
    remainingMinutes: { lower: number; upper: number } | null;
}

const unknown = (detail: string, sampleCount = 0): RecoveryEstimate => ({
    kind: 'unknown', label: '復旧の見通しはまだ不明', detail,
    earliest: null, latest: null, sampleCount, remainingMinutes: null,
});

export function estimateRecovery(input: {
    disrupted: boolean; officialText: string; officialExpectedAt?: string | null;
    startedAt?: string | null; routeId: string; cause: string;
    incidents: RecoveryIncident[]; now?: Date;
}): RecoveryEstimate {
    const now = input.now || new Date();
    if (!input.disrupted) return { ...unknown('現在の運休が確認された場合に復旧の見通しを表示します。'), kind: 'not-disrupted', label: '復旧時刻の案内なし' };
    let currentNotice = input.officialText.split(/明日|あす|翌日/)[0];
    const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo'}).format(now);
    const otherDate = [...currentNotice.matchAll(/(\d{1,2})月(\d{1,2})日/g)].find(match =>
        `${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}` !== today.slice(5));
    if (otherDate) currentNotice = currentNotice.slice(0, otherDate.index);
    if (/終日運休|終日.*運転.*見合/.test(currentNotice)) return {
        ...unknown('公式に終日運休の案内があります。対象列車・区間を確認し、別の交通手段や滞在先を検討してください。'),
        kind: 'all-day', label: '終日運休の案内あり',
    };
    const expected = input.officialExpectedAt ? Date.parse(input.officialExpectedAt) : NaN;
    if (Number.isFinite(expected) && expected > now.getTime()) return {
        kind: 'official', label: '公式の再開見込み', detail: 'JR発表の予定時刻です。再開の確約ではなく、変更される場合があります。',
        earliest: new Date(expected).toISOString(), latest: new Date(expected).toISOString(), sampleCount: 0,
        remainingMinutes: { lower: Math.ceil((expected - now.getTime()) / 60_000), upper: Math.ceil((expected - now.getTime()) / 60_000) },
    };
    if (!input.cause || input.cause === 'unknown') return unknown('運休の原因が確認できないため、類似する復旧実績を選べません。');
    const start = input.startedAt ? Date.parse(input.startedAt) : NaN;
    if (!Number.isFinite(start) || start > now.getTime()) return unknown('運休開始時刻が確認できないため、残り時間は推定できません。屋内へ移動し、代替交通も確認してください。');
    const elapsed = (now.getTime() - start) / 60_000;
    // One row per independently verified incident. No forecasts, open incidents,
    // duplicates or future outcomes may leak into this empirical survival estimate.
    const winter = [12, 1, 2, 3];
    const targetMonth = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', month: 'numeric' }).format(now));
    const isWinter = winter.includes(targetMonth);
    const seen = new Set<string>();
    const stormGroups = new Map<string, number[]>();
    for (const event of input.incidents) {
        const beginning = Date.parse(event.started_at);
        const end = Date.parse(event.resumed_at);
        const identity = `${event.route_id}:${event.started_at}`;
        const eventMonth = new Date(beginning + 9 * 3600_000).getUTCMonth() + 1;
        if (isWinter && !winter.includes(eventMonth)) continue;
        if (!event.verified || seen.has(identity) || event.route_id !== input.routeId || event.cause !== input.cause ||
            !event.storm_id || !Number.isFinite(beginning) || !Number.isFinite(end) || end <= beginning || end >= start) continue;
        seen.add(identity);
        const duration = (end - beginning) / 60_000;
        // Condition on the outage still being active; don't subtract elapsed time
        // from an unconditional mean and promise an already-passed recovery time.
        const durations = stormGroups.get(event.storm_id) || [];
        durations.push(duration);
        stormGroups.set(event.storm_id, durations);
    }
    // Route-wide history: retain the latest section reopening per storm, then
    // condition on the ongoing outage. Five segments in one storm are one case.
    const remaining = [...stormGroups.values()].map(values => Math.max(...values))
        .filter(duration => duration > elapsed).map(duration => duration - elapsed).sort((a, b) => a - b);
    if (remaining.length < 5) return unknown('同じ路線・原因で使える復旧実績が不足しています。正確な時間幅をまだ出せません。', remaining.length);
    const lower = Math.max(15, Math.floor(remaining[Math.floor((remaining.length - 1) * 0.2)] / 15) * 15);
    const upper = Math.max(lower, Math.ceil(remaining[Math.ceil((remaining.length - 1) * 0.8)] / 15) * 15);
    return {
        kind: 'historical', label: '過去の復旧実績からの参考範囲',
        detail: `同一路線・原因${isWinter ? '・冬季' : ''}の検証済み事例 ${remaining.length} 件の20〜80パーセンタイル。今回の気象・設備被害で範囲外になることがあります。`,
        earliest: new Date(now.getTime() + lower * 60_000).toISOString(),
        latest: new Date(now.getTime() + upper * 60_000).toISOString(),
        sampleCount: remaining.length, remainingMinutes: { lower, upper },
    };
}

/** Only an explicitly announced future time, never a bare clock or a completed resumption. */
export function officialRecoveryTime(text: string, now = new Date()): string | null {
    const normalized = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    if (/再開[^。\n]{0,20}(?:未定|見通しは立|見込みは立|見込みが立)|予定[^。\n]{0,12}(?:撤回|取り消)/.test(normalized)) return null;
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Tokyo' }).format(now);
    const candidates: string[] = [];
    for (const sentence of normalized.split(/[。\n]/)) {
        if (/しました|いたしました|(?:予定|見込)[^。\n]{0,12}(?:でした|いました|おりました)|昨日|おととい|翌日/.test(sentence)) continue;
        const clock = '([01]?\\d|2[0-3])(?:時|[:：])(?:([0-5]?\\d)分?)?頃?';
        const match = sentence.match(new RegExp(clock+'[^。\\n]{0,30}(?:再開|復旧)[^。\\n]{0,12}(?:見込|予定)')) ||
            sentence.match(new RegExp('(?:再開|復旧)(?:の)?(?:見込み|予定)(?:時刻)?(?:は|：|:|を)?\\s*'+clock)) ||
            sentence.match(new RegExp('(?:再開|復旧)は?\\s*'+clock+'[^。\\n]{0,10}(?:予定|見込)'));
        if (!match) continue;
        let date = today;
        const dates = [...sentence.matchAll(/(?:(20\d{2})年)?(\d{1,2})月(\d{1,2})日/g)];
        if (dates.length > 1) continue;
        if (dates.length) {
            const [,year,month,day]=dates[0];
            date=`${year||today.slice(0,4)}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
            if (!year && today.slice(5,7)==='12' && month==='1') date=`${Number(today.slice(0,4))+1}${date.slice(4)}`;
        } else if (/明日|あす/.test(sentence)) {
            date = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(now.getTime()+86400_000));
        }
        const at = new Date(`${date}T${match[1].padStart(2,'0')}:${(match[2]||'00').padStart(2,'0')}:00+09:00`);
        if (!Number.isFinite(at.getTime()) || new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(at)!==date) continue;
        if (at.getTime()>now.getTime() && at.getTime()-now.getTime()<=7*86400_000) candidates.push(at.toISOString());
    }
    const unique = [...new Set(candidates)];
    return unique.length===1 ? unique[0] : null;
}
