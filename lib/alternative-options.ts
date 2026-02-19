import { getStationById, estimateTaxiFare } from './hokkaido-data';
import stationFacilitiesData from '../data/station-facilities.json';

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

// 主要駅の施設情報 (JSONから読込)
export const STATION_FACILITIES: Record<string, StationFacilities> = stationFacilitiesData as Record<string, StationFacilities>;

// デフォルト施設（小規模駅）
const DEFAULT_FACILITIES: StationFacilities = {
    hasSubway: false,
    hasBusTerminal: false,
    hasRentalCar: false,
    hasTaxi: true,  // タクシーはほぼどこでも呼べる
    hasHotel: false,
    hasCafe: false,
};

/**
 * 駅の生の施設情報を取得（StationFacilitiesオブジェクト）
 * 他の関数から使用される正規の関数
 */
export function getStationFacilities(stationId: string): StationFacilities {
    return STATION_FACILITIES[stationId] || DEFAULT_FACILITIES;
}

/**
 * 駅の施設情報を配列形式で取得（UI表示用）
 * テストスクリプトやUI表示で使用
 */
export function getStationFacilitiesList(stationId: string): { type: string; name: string; description?: string }[] {
    const facilities = getStationFacilities(stationId);
    const result: { type: string; name: string; description?: string }[] = [];

    if (facilities.hasSubway && facilities.subwayLines) {
        result.push({
            type: '地下鉄',
            name: facilities.subwayLines.join('・'),
            description: '雪・風の影響を受けず運行'
        });
    }

    if (facilities.hasBusTerminal) {
        result.push({
            type: 'バスターミナル',
            name: '高速・路線バス',
            description: '都市間バスが利用可能'
        });
    }

    if (facilities.hasTaxi) {
        result.push({
            type: 'タクシー',
            name: 'タクシー乗り場',
        });
    }

    if (facilities.hasRentalCar) {
        result.push({
            type: 'レンタカー',
            name: 'レンタカー店舗',
            description: 'スタッドレス装備確認必須'
        });
    }

    if (facilities.hasHotel) {
        result.push({
            type: 'ホテル',
            name: '近隣宿泊施設',
        });
    }

    if (facilities.hasCafe) {
        result.push({
            type: 'カフェ・待合',
            name: '待機場所',
        });
    }

    return result;
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
        const taxiInfo = estimateTaxiFare(departure, arrival);

        options.push({
            type: 'taxi',
            icon: '🚕',
            name: 'タクシー',
            description: taxiInfo ? `概算: ¥${taxiInfo.estimatedFare.toLocaleString()}〜` : '料金は距離による',
            time: taxiInfo?.duration,
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
