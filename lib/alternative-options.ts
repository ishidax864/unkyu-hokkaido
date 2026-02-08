/**
 * 代替手段の包括的な提案システム
 * 各駅の利用可能な交通手段、滞在施設を定義
 */

import { Station, getStationById, estimateTaxiFare } from './hokkaido-data';

// ===== 駅ごとの利用可能手段 =====

interface StationFacilities {
    hasSubway: boolean;      // 地下鉄あり
    subwayLines?: string[];  // 地下鉄路線名
    hasBusTerminal: boolean; // バスターミナルあり
    hasRentalCar: boolean;   // レンタカー店あり
    hasTaxi: boolean;        // タクシー乗り場あり
    hasHotel: boolean;       // 近隣ホテルあり
    hasCafe: boolean;        // カフェ・待合場所あり
}

// 主要駅の施設情報
export const STATION_FACILITIES: Record<string, StationFacilities> = {
    // 札幌エリア（地下鉄あり）
    'sapporo': {
        hasSubway: true,
        subwayLines: ['南北線', '東西線', '東豊線'],
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },
    'shin-sapporo': {
        hasSubway: true,
        subwayLines: ['東西線'],
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },
    'kotoni': {
        hasSubway: true,
        subwayLines: ['東西線'],
        hasBusTerminal: false,
        hasRentalCar: false,
        hasTaxi: true,
        hasHotel: false,
        hasCafe: true,
    },
    'teine': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: false,
        hasTaxi: true,
        hasHotel: false,
        hasCafe: true,
    },

    // 空港
    'shin-chitose-airport': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },

    // 小樽エリア
    'otaru': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },

    // 旭川エリア
    'asahikawa': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },

    // 苫小牧・室蘭エリア
    'tomakomai': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },
    'higashi-muroran': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },

    // 函館エリア
    'hakodate': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },
    'shin-hakodate-hokuto': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: false,
        hasCafe: true,
    },

    // 道東エリア
    'obihiro': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },
    'kushiro': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },

    // 道北エリア
    'wakkanai': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },
    'abashiri': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },
    'kitami': {
        hasSubway: false,
        hasBusTerminal: true,
        hasRentalCar: true,
        hasTaxi: true,
        hasHotel: true,
        hasCafe: true,
    },
};

// デフォルト施設（小規模駅）
const DEFAULT_FACILITIES: StationFacilities = {
    hasSubway: false,
    hasBusTerminal: false,
    hasRentalCar: false,
    hasTaxi: true,  // タクシーはほぼどこでも呼べる
    hasHotel: false,
    hasCafe: false,
};

export function getStationFacilities(stationId: string): StationFacilities {
    return STATION_FACILITIES[stationId] || DEFAULT_FACILITIES;
}

// ===== 代替手段の提案 =====

export interface AlternativeOption {
    type: 'subway' | 'bus' | 'taxi' | 'rental' | 'hotel' | 'cafe';
    icon: string;
    name: string;
    description: string;
    time?: string;      // 所要時間
    cost?: string;      // 概算料金
    note?: string;      // 注意事項
    url?: string;       // リンク
    priority: number;   // 表示優先度（低いほど優先）
}

/**
 * 出発駅・到着駅に基づいて利用可能な代替手段を取得
 */
export function getAvailableAlternatives(
    departureId: string,
    arrivalId: string,
    estimatedRecoveryHours?: number
): AlternativeOption[] {
    const departure = getStationById(departureId);
    const arrival = getStationById(arrivalId);
    const facilities = getStationFacilities(departureId);
    const options: AlternativeOption[] = [];

    // 1. 地下鉄（利用可能な場合のみ）
    if (facilities.hasSubway && facilities.subwayLines) {
        options.push({
            type: 'subway',
            icon: '🚇',
            name: `地下鉄（${facilities.subwayLines.join('・')}）`,
            description: '地下鉄は雪・風の影響を受けず運行',
            note: '札幌市内の移動は地下鉄が最も確実',
            priority: 1,
        });
    }

    // 2. バス（バスターミナルがある場合）
    if (facilities.hasBusTerminal) {
        options.push({
            type: 'bus',
            icon: '🚌',
            name: '高速・路線バス',
            description: '都市間高速バスまたは路線バス',
            note: '悪天候時は遅延の可能性あり',
            url: 'https://www.chuo-bus.co.jp/',
            priority: 2,
        });
    }

    // 3. タクシー（ほぼ全駅で利用可能）
    if (facilities.hasTaxi && departure && arrival) {
        const fare = estimateTaxiFare(departureId, arrivalId);
        const distanceKm = calculateTaxiDistance(departure, arrival);
        const timeMin = distanceKm ? Math.round(distanceKm * 2.5) : null; // 約24km/h平均

        options.push({
            type: 'taxi',
            icon: '🚕',
            name: 'タクシー',
            description: fare ? `概算: ¥${fare.toLocaleString()}〜` : '料金は距離による',
            time: timeMin ? `約${timeMin}分` : undefined,
            note: '悪天候時は渋滞・料金増加の可能性あり',
            priority: 3,
        });
    }

    // 4. レンタカー（店舗がある場合）
    if (facilities.hasRentalCar) {
        options.push({
            type: 'rental',
            icon: '🚗',
            name: 'レンタカー',
            description: '主要レンタカー会社あり',
            note: '冬道運転に注意。スタッドレス装備確認必須',
            priority: 4,
        });
    }

    // 5. 長期化する場合のみ: ホテル・カフェ提案
    if (estimatedRecoveryHours && estimatedRecoveryHours >= 2) {
        if (facilities.hasHotel) {
            options.push({
                type: 'hotel',
                icon: '🏨',
                name: '近隣ホテル',
                description: '復旧まで2時間以上の見込み。宿泊も検討を',
                note: '駅周辺のホテルで待機が快適',
                priority: 5,
            });
        }
        if (facilities.hasCafe) {
            options.push({
                type: 'cafe',
                icon: '☕',
                name: 'カフェ・待合施設',
                description: '駅構内または周辺で待機可能',
                note: '電源・Wi-Fiが使える店舗も',
                priority: 6,
            });
        }
    }

    // 優先度順にソート
    return options.sort((a, b) => a.priority - b.priority);
}

/**
 * タクシーの距離を計算
 */
function calculateTaxiDistance(station1: Station, station2: Station): number | null {
    if (!station1.lat || !station1.lon || !station2.lat || !station2.lon) {
        return null;
    }

    // Haversine formula
    const R = 6371;
    const dLat = (station2.lat - station1.lat) * Math.PI / 180;
    const dLon = (station2.lon - station1.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(station1.lat * Math.PI / 180) * Math.cos(station2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
