// Provider pages checked 2026-10-13. These are access/hours references, never
// live vacancy or open-status claims. Expired hours are not used to rank a cafe.
export function stationPlaces(stationId: string, at: Date, checkedAt = new Date()) {
    at = new Date(Math.max(at.getTime(), checkedAt.getTime()));
    const date = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(at);
    const hour = Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Tokyo',hour:'numeric',hourCycle:'h23'}).format(at));
    const fresh = checkedAt.getTime() >= Date.parse('2026-10-13T00:00:00+09:00') && checkedAt.getTime() < Date.parse('2026-11-13T00:00:00+09:00') && date < '2026-11-13';
    return {
        cafe: stationId === 'sapporo' && fresh && hour >= 10 && hour < 21 ? {
            name:'タリーズ 札幌ステラプレイス店',detail:'EAST 6F · 通常10:00〜22:00',url:'https://shop.tullys.co.jp/detail/1320105',
        } : null,
        hotel: stationId === 'sapporo' ? {name:'JRタワーホテル日航札幌',detail:'札幌駅直結 · 空室を確認',url:'https://www.jrhotels.co.jp/tower/'} :
            stationId === 'shin-chitose-airport' ? {name:'エアターミナルホテル',detail:'国内線ターミナル内 · 空室を確認',url:'https://www.air-terminal-hotel.jp/'} : null,
    };
}
