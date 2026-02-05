export interface StationTime {
    stationId: string;
    arrivalTime?: string;   // HH:mm
    departureTime?: string; // HH:mm
}

export interface Timetable {
    id: string; // train number
    type: 'rapid' | 'special-rapid' | 'local';
    name: string; // e.g. "Rapid Airport 100"
    boundFor: string;
    stations: StationTime[];
}

// 簡易的な駅IDマッピング
// 実際には hokkaido-data.ts の定義に合わせる
export const STATION_IDS = {
    SAPPORO: 'sapporo',
    SHIN_SAPPORO: 'shin-sapporo',
    KITA_HIROSHIMA: 'kita-hiroshima',
    ENIWA: 'eniwa',
    CHITOSE: 'chitose',
    MINAMI_CHITOSE: 'minami-chitose',
    NEW_CHITOSE_AIRPORT: 'new-chitose-airport',
    OTARU: 'otaru',
} as const;

// 快速エアポート（標準的な所要時間パターン）
// 札幌-新千歳空港: 快速37-38分 / 特別快速33-36分

// 代表的なダイヤパターン生成用ヘルパー
function generateAirportSchedule(
    startHour: number,
    endHour: number,
    direction: 'to_airport' | 'from_airport'
): Timetable[] {
    const schedules: Timetable[] = [];
    let trainIdCounter = 100;

    for (let hour = startHour; hour <= endHour; hour++) {
        const hourStr = hour.toString().padStart(2, '0');

        // 標準パターン: 毎時 00, 12, 24, 36, 48 分発 (概算)
        // 特別快速: 毎時 50分発 (一部時間帯)

        const minutes = [0, 12, 24, 36, 48];

        minutes.forEach((minute, index) => {
            const departureTime = `${hourStr}:${minute.toString().padStart(2, '0')}`;
            const isSpecial = (hour >= 9 && hour <= 16 && index === 4); // 日中特別快速想定

            // 所要時間（分）
            const duration = isSpecial ? 35 : 38;

            // 到着時刻計算
            const depDate = new Date(`2000-01-01T${departureTime}:00`);
            const arrDate = new Date(depDate.getTime() + duration * 60000);
            const arrivalTime = `${arrDate.getHours().toString().padStart(2, '0')}:${arrDate.getMinutes().toString().padStart(2, '0')}`;

            const trainId = `${trainIdCounter++}M`;
            const name = isSpecial ? `特別快速エアポート ${trainId}` : `快速エアポート ${trainId}`;

            if (direction === 'to_airport') {
                schedules.push({
                    id: trainId,
                    type: isSpecial ? 'special-rapid' : 'rapid',
                    name,
                    boundFor: '新千歳空港',
                    stations: [
                        { stationId: STATION_IDS.SAPPORO, departureTime: departureTime },
                        { stationId: STATION_IDS.SHIN_SAPPORO, arrivalTime: addMinutes(departureTime, 9) }, // +9分
                        { stationId: STATION_IDS.KITA_HIROSHIMA, arrivalTime: addMinutes(departureTime, 17) }, // +17分
                        { stationId: STATION_IDS.ENIWA, arrivalTime: addMinutes(departureTime, 24) }, // +24分
                        { stationId: STATION_IDS.CHITOSE, arrivalTime: addMinutes(departureTime, 30) }, // +30分
                        { stationId: STATION_IDS.MINAMI_CHITOSE, arrivalTime: addMinutes(departureTime, 34) }, // +34分
                        { stationId: STATION_IDS.NEW_CHITOSE_AIRPORT, arrivalTime: arrivalTime },
                    ]
                });
            } else {
                schedules.push({
                    id: trainId,
                    type: isSpecial ? 'special-rapid' : 'rapid',
                    name,
                    boundFor: '札幌・小樽',
                    stations: [
                        { stationId: STATION_IDS.NEW_CHITOSE_AIRPORT, departureTime: departureTime },
                        { stationId: STATION_IDS.MINAMI_CHITOSE, arrivalTime: addMinutes(departureTime, 3) },
                        { stationId: STATION_IDS.CHITOSE, arrivalTime: addMinutes(departureTime, 7) },
                        { stationId: STATION_IDS.ENIWA, arrivalTime: addMinutes(departureTime, 13) },
                        { stationId: STATION_IDS.KITA_HIROSHIMA, arrivalTime: addMinutes(departureTime, 20) },
                        { stationId: STATION_IDS.SHIN_SAPPORO, arrivalTime: addMinutes(departureTime, 28) },
                        { stationId: STATION_IDS.SAPPORO, arrivalTime: arrivalTime },
                    ]
                });
            }
        });
    }
    return schedules;
}

function addMinutes(time: string, minutes: number): string {
    const d = new Date(`2000-01-01T${time}:00`);
    const newD = new Date(d.getTime() + minutes * 60000);
    return `${newD.getHours().toString().padStart(2, '0')}:${newD.getMinutes().toString().padStart(2, '0')}`;
}

// データ生成
export const SUPPORTED_TIMETABLES: Timetable[] = [
    // 札幌発 -> 新千歳空港行 (06:00 - 22:00)
    ...generateAirportSchedule(6, 22, 'to_airport'),

    // 新千歳空港発 -> 札幌行 (07:00 - 23:00)
    ...generateAirportSchedule(7, 23, 'from_airport'),
];

// 時刻表検索関数

/**
 * 指定された出発駅・到着駅・時刻に基づいて、最適な列車を検索する
 * @param depStationId 出発駅ID
 * @param arrStationId 到着駅ID
 * @param time 基準時刻 "HH:mm"
 * @param type "departure" | "arrival" (出発時刻指定か、到着時刻指定か)
 */
export function findTrain(
    depStationId: string,
    arrStationId: string,
    time: string,
    type: 'departure' | 'arrival' = 'departure'
): { train: Timetable; departureTime: string; arrivalTime: string } | null {

    // 候補列車をフィルタリング
    const candidates = SUPPORTED_TIMETABLES.filter(train => {
        const depIndex = train.stations.findIndex(s => s.stationId === depStationId);
        const arrIndex = train.stations.findIndex(s => s.stationId === arrStationId);

        // 両方の駅が存在し、かつ出発駅が到着駅より前にあること
        return depIndex !== -1 && arrIndex !== -1 && depIndex < arrIndex;
    });

    if (candidates.length === 0) return null;

    if (type === 'departure') {
        // 出発時刻指定: 指定時刻以降で最も早い列車
        // ソートして検索
        const sorted = candidates.map(train => {
            const depInfo = train.stations.find(s => s.stationId === depStationId)!;
            const arrInfo = train.stations.find(s => s.stationId === arrStationId)!;
            return {
                train,
                departureTime: depInfo.departureTime || depInfo.arrivalTime || '',
                arrivalTime: arrInfo.arrivalTime || arrInfo.departureTime || ''
            };
        }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));

        return sorted.find(item => item.departureTime >= time) || null;

    } else {
        // 到着時刻指定: 指定時刻以前に到着する最も遅い列車
        const sorted = candidates.map(train => {
            const depInfo = train.stations.find(s => s.stationId === depStationId)!;
            const arrInfo = train.stations.find(s => s.stationId === arrStationId)!;
            return {
                train,
                departureTime: depInfo.departureTime || depInfo.arrivalTime || '',
                arrivalTime: arrInfo.arrivalTime || arrInfo.departureTime || ''
            };
        }).sort((a, b) => b.arrivalTime.localeCompare(a.arrivalTime)); // 降順

        return sorted.find(item => item.arrivalTime <= time) || null;
    }
}
