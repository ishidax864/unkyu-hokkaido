import { japanDate } from './time';

export interface BusDeparture {
    name: string; departsAt: string; arrivesAt: string; durationMinutes: number;
    boarding: string; boardingUrl: string; url: string;
}
export interface BusAlternatives { available: boolean; checkedAt: string; departures: BusDeparture[]; url: string }
const root = 'https://www.chuo-bus.co.jp/airport/timetable/';
const clean = (html: string) => html.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
const minutes = (value: string) => {
    const match = value.match(/^([0-2]?\d):([0-5]\d)$/);
    return match && Number(match[1]) <= 29 ? Number(match[1])*60+Number(match[2]) : null;
};
/** Only the two audited airport route layouts. No generic HTML-to-timetable
 * guessing: schema, season, route title, stop role and column alignment must agree. */
export function parseAirportTimetable(html: string, outbound: boolean, date: string, url: string): BusDeparture[] | null {
    const month = Number(date.slice(5,7));
    const winter = month <= 3 || month === 12;
    if (!/空港連絡バス（札幌都心(?:直行便)?）/.test(html) ||
        (winter ? !html.includes('冬ダイヤ') : !html.includes('夏ダイヤ'))) return null;
    const updated = html.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日更新/);
    if (!updated) return null;
    const published = `${updated[1]}-${updated[2].padStart(2,'0')}-${updated[3].padStart(2,'0')}`;
    if (published > date || Date.parse(date) - Date.parse(published) > 370 * 86400_000) return null;
    const table = html.match(/<table\b[^>]*id=['"]TimeTable['"][^>]*>([\s\S]*?)<\/table>/i)?.[1];
    if (!table || /colspan|rowspan|[☆★◆▲●]|土曜日|日曜日|祝日|平日/.test(table)) return null;
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => match[1]);
    const from = outbound ? '札幌駅前' : '新千歳空港ＡＮＡ前';
    const to = outbound ? '新千歳空港（降車レーン）' : '札幌駅前';
    const stopRow = (name: string, role: string) => rows.filter(row => {
        const headings=[...row.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>clean(m[1]));
        return headings[0] === role && headings[1]?.startsWith(`${name} [`);
    });
    const starts = stopRow(from,'乗'), ends = stopRow(to,'降');
    if (starts.length !== 1 || ends.length !== 1) return null;
    const cells = (row: string) => [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
    const departs=cells(starts[0]), arrives=cells(ends[0]);
    if (!departs.length || departs.length !== arrives.length) return null;
    const link=starts[0].match(/href=['"]([^'"]+)['"]/i)?.[1];
    if (!link) return null;
    const boardingUrl=new URL(link,root).href;
    if (new URL(boardingUrl).hostname !== 'www.chuo-bus.co.jp') return null;
    const midnight=Date.parse(`${date}T00:00:00+09:00`);
    const departures: BusDeparture[]=[];
    for(let i=0;i<departs.length;i++) {
        const start=minutes(departs[i]), end=minutes(arrives[i]);
        // A '-' is a skipped stop, never an invitation to shift columns.
        if(start===null || end===null) continue;
        const duration=end-start;
        if(duration<30 || duration>240) return null;
        departures.push({name:html.includes('空港連絡バス（札幌都心直行便）')?'空港連絡バス・直行便':'空港連絡バス',
            departsAt:new Date(midnight+start*60_000).toISOString(),arrivesAt:new Date(midnight+end*60_000).toISOString(),
            durationMinutes:duration,boarding:from,boardingUrl,url});
    }
    return departures.length ? departures : null;
}
const cache=new Map<string,{expires:number;promise:Promise<string|null>}>();
async function page(url:string) {
    const hit=cache.get(url);if(hit && hit.expires>Date.now()) return hit.promise;
    const promise=(async()=>{
        try {const r=await fetch(url,{next:{revalidate:900},signal:AbortSignal.timeout(5000)});return r.ok ? await r.text() : null;}catch{return null;}
    })();
    cache.set(url,{expires:Date.now()+900_000,promise});
    const result=await promise;if(!result)cache.delete(url);return result;
}
export async function getBusAlternatives(departureId:string,arrivalId:string,date:string,time:string,now=new Date()):Promise<BusAlternatives|undefined> {
    const outbound=departureId==='sapporo' && arrivalId==='shin-chitose-airport';
    const inbound=departureId==='shin-chitose-airport' && arrivalId==='sapporo';
    if(!outbound && !inbound) return undefined;
    const urls=[34,35].map(n=>`${root}?ope=det&n=${n}&o=${outbound?1:2}&t=14`);
    const results=await Promise.all(urls.map(async url=>{const html=await page(url);return html ? parseAirportTimetable(html,outbound,date,url):null;}));
    const cutoff=Math.max(Date.parse(`${date}T${time}:00+09:00`),date===japanDate(now)?now.getTime():0)+15*60_000;
    return {available:results.every(r=>r!==null),checkedAt:now.toISOString(),url:urls[0],
        departures:results.flatMap(r=>r||[]).filter(r=>Date.parse(r.departsAt)>=cutoff)
            .sort((a,b)=>a.departsAt.localeCompare(b.departsAt)).slice(0,3)};
}
