/** 予報を取得・保存する全地点(路線ボードの地点 + 区間検索が使う旧路線の代表地点)。収集とサイトで共有 */
import { LINES } from './registry/lines';
import { ROUTE_COORDINATES } from './weather';

export function allWeatherPoints(): { lat: number; lon: number }[] {
    const all = [...LINES.flatMap(l => l.weatherPoints), ...Object.values(ROUTE_COORDINATES).flat()];
    return all.filter((p, i) => all.findIndex(q => q.lat === p.lat && q.lon === p.lon) === i).map(p => ({ lat: p.lat, lon: p.lon }));
}
