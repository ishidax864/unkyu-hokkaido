// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseAirportTimetable } from '@/lib/forecast/alternatives';
import { stationPlaces } from '@/lib/forecast/places';
import { summarizeReports } from '@/lib/forecast/community';
import { validReportLocation } from '@/lib/forecast/report-location';

// Reduced real provider layout: retain stop role, skipped stops and column order.
const row=(role:string,stop:string,times:string[])=>`<tr><th>${role}</th><th>${stop} [<a href='index.cgi?ope=map&n=8039,89'>MAP</a>]</th>${times.map(t=>`<td>${t}</td>`).join('')}</tr>`;
const source=`空港連絡バス（札幌都心）2026年4月1日更新（夏ダイヤ）<table id='TimeTable'>${row('乗','札幌駅前',['5:15','-','5:40'])}${row('降','新千歳空港（降車レーン）',['6:32','6:37','6:57'])}</table>`;
const url='https://www.chuo-bus.co.jp/airport/timetable/?ope=det&n=34&o=1&t=14';
describe('Official timetable boundaries',()=>{
    it('pairs the same columns and does not shift after a skipped stop',()=>{
        const result=parseAirportTimetable(source,true,'2026-10-13',url)!;
        expect(result).toHaveLength(2);expect(result[0]).toMatchObject({durationMinutes:77,departsAt:'2026-10-12T20:15:00.000Z',arrivesAt:'2026-10-12T21:32:00.000Z'});
        expect(result[1].departsAt).toBe('2026-10-12T20:40:00.000Z');
    });
    it('rejects a summer timetable in winter, future schedule, changed route or opposite direction',()=>{
        expect(parseAirportTimetable(source,true,'2026-12-01',url)).toBeNull();
        expect(parseAirportTimetable(source,true,'2025-10-13',url)).toBeNull();
        expect(parseAirportTimetable(source.replace('空港連絡バス（札幌都心）','高速あさひかわ号'),true,'2026-10-13',url)).toBeNull();
        expect(parseAirportTimetable(source,false,'2026-10-13',url)).toBeNull();
    });
    it('rejects unknown weekday restrictions, merged columns and non-provider links',()=>{
        for(const changed of [source.replace('<td>','<td colspan="2">'),source.replace('5:15','5:15☆'),source.replace('index.cgi?ope=map&n=8039,89','https://evil.example/map')]) expect(parseAirportTimetable(changed,true,'2026-10-13',url)).toBeNull();
    });
});
describe('Hours and specific passenger reports',()=>{
    it('never recommends the cafe outside its normal hours or after hours verification expires',()=>{
        const checked=new Date('2026-10-13T00:00:00Z');
        expect(stationPlaces('sapporo',new Date('2026-10-13T03:00:00Z'),checked).cafe).not.toBeNull();
        expect(stationPlaces('sapporo',new Date('2026-10-13T13:00:00Z'),checked).cafe).toBeNull();
        expect(stationPlaces('sapporo',new Date('2026-10-13T03:00:00Z'),new Date('2026-10-13T13:00:00Z')).cafe).toBeNull();
        expect(stationPlaces('sapporo',new Date('2026-12-13T03:00:00Z'),new Date('2026-12-13T00:00:00Z')).cafe).toBeNull();
    });
    it('validates stations on the line and rejects the same location and direction',()=>{
        expect(validReportLocation('jr-hokkaido.chitose','sapporo','shin-chitose-airport')).toBe(true);
        expect(validReportLocation('jr-hokkaido.chitose','sapporo','otaru')).toBe(false);
        expect(validReportLocation('jr-hokkaido.chitose','sapporo','sapporo')).toBe(false);
        expect(validReportLocation('jr-hokkaido.chitose',{},null)).toBe(false);
    });
    it('does not count a different station, direction or unspecified location as corroboration',()=>{
        const now=new Date('2026-10-13T03:00:00Z');
        const report={route_id:'line',report_type:'normal',created_at:now.toISOString(),station_id:'sapporo',direction_station_id:'airport'};
        const rows=[{...report,ip_hash:'a'},{...report,ip_hash:'b',station_id:'other'},{...report,ip_hash:'c',direction_station_id:'other'},{...report,ip_hash:'d',station_id:null}];
        expect(summarizeReports(rows,now,{stationId:'sapporo',directionStationId:'airport'})).toMatchObject({total:1,signal:'insufficient'});
    });
});
