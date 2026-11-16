/** Conservative extraction for training labels. A keyword is not a ground truth. */
export type ObservationStatus = 'normal' | 'delayed' | 'suspended' | 'unknown';
export function classifyOfficialObservation(text: string, now = new Date()): ObservationStatus {
    let clean = text.replace(/<[^>]*>/g, ' ').replace(/[\s　]+/g, '');
    // A current stoppage can coexist with tomorrow's restart plan. Only use
    // the present-tense part before the future marker to classify the state.
    const future = clean.search(/明日|あす|翌日|計画運休/);
    if (future >= 0) {
        const present = clean.slice(0, future);
        if (!/見合わせています|運休しています|遅れています/.test(present)) return 'unknown';
        clean = present;
    }
    if (!clean) return 'unknown';
    const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(now);
    const dated = [...clean.matchAll(/(\d{1,2})月(\d{1,2})日/g)].find(match =>
        `${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}` !== today.slice(5));
    if (dated) {
        const present = clean.slice(0,dated.index);
        if (!/見合わせています|運休しています|遅れています/.test(present)) return 'unknown';
        clean = present;
    }
    // Negated or retrospective suspensions require human/section-level review.
    if (/運休(?:は|の予定は)?(?:ありません|しません)|見合わせ(?:は)?ありません/.test(clean)) return 'unknown';
    const stopped = /運転(?:を)?見合|運休(?:が|して|とな|とし|します|です|となります)/.test(clean);
    const resumed = /再開(?:しました|いたしました|しています)|平常運転に戻|通常運転に戻/.test(clean);
    const futureRecovery = /再開.*(?:見込|予定)|(?:見込|予定).*再開/.test(clean);
    if (stopped && (futureRecovery || !resumed)) return 'suspended';
    if (stopped && resumed) return 'unknown'; // May be a mixture of sections/directions.
    if (/遅れ(?:が|て|ています)|遅延(?:が|して)/.test(clean)) return 'delayed';
    if (resumed || /通常通り(?:の)?運転|通常運転|平常運転|現在、?遅れに関する情報はありません/.test(clean)) return 'normal';
    return 'unknown';
}

export function hasExplicitAreaAllClear(text: string): boolean {
    return /現在[、,]?\s*遅れに関する情報はありません/.test(text) && !/運休|見合|遅れが/.test(text);
}

export function specificRouteKeywords(keywords: string[]): string[] {
    return keywords.filter(word => !/エリア$|圏$/.test(word));
}

/** Feed publication time, separate from the time our server retrieved it. */
export function officialPublishedAt(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const match = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})時(\d{1,2})分/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    if (+hour > 23 || +minute > 59) return null;
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const at = new Date(`${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00+09:00`);
    if (!Number.isFinite(at.getTime()) || new Date(at.getTime() + 9 * 3600_000).toISOString().slice(0, 10) !== date) return null;
    return at.toISOString();
}
