/**
 * 気象庁（JMA）警報・注意報データ取得モジュール
 *
 * 気象庁の防災情報JSON APIから北海道各地域の警報・注意報を取得し、
 * JR路線ごとに関連する警報をマッピングする。
 *
 * API: https://www.jma.go.jp/bosai/warning/data/warning/{AREA_CODE}.json
 * フォールバック: 取得失敗時は既存の generateWarningsFromHourly() を使用
 */

import { WeatherWarning } from './types';
import jmaAreaMapping from '../data/jma-area-mapping.json';

// 気象庁の警報JSON URL
const JMA_WARNING_BASE_URL = 'https://www.jma.go.jp/bosai/warning/data/warning';

// キャッシュ（同一リクエストの重複防止）
const warningCache = new Map<string, { data: JMAWarningData | null; fetchedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10分キャッシュ

// 気象庁APIの警報レベル
type JMAWarningLevel = 'warning' | 'advisory' | 'watch'; // 警報 | 注意報 | 特別警報

// 気象庁JSONの型（主要フィールドのみ）
interface JMAWarningAreaItem {
    code: string;
    name: string;
    warnings: JMAWarningEntry[];
}

interface JMAWarningEntry {
    code: string;
    status: string; // '発表', '継続', '解除', etc.
    name: string;   // e.g. '暴風警報', '大雪注意報'
}

interface JMAWarningData {
    areaTypes: {
        areas: JMAWarningAreaItem[];
    }[];
    publishingOffice: string;
    reportDatetime: string;
}

/**
 * 気象庁APIから指定エリアの警報データを取得
 */
async function fetchJMAWarnings(areaCode: string): Promise<JMAWarningData | null> {
    // キャッシュチェック
    const cached = warningCache.get(areaCode);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.data;
    }

    try {
        const url = `${JMA_WARNING_BASE_URL}/${areaCode}.json`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'UnkyuAI/1.0 (weather-prediction-service)' },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            console.warn(`[JMA] ${areaCode} fetch failed: ${response.status}`);
            warningCache.set(areaCode, { data: null, fetchedAt: Date.now() });
            return null;
        }

        const data = await response.json() as JMAWarningData;
        warningCache.set(areaCode, { data, fetchedAt: Date.now() });
        return data;
    } catch (error) {
        console.warn(`[JMA] ${areaCode} fetch error:`, error instanceof Error ? error.message : error);
        warningCache.set(areaCode, { data: null, fetchedAt: Date.now() });
        return null;
    }
}

/**
 * JMA警報名を WeatherWarning.type にマッピング
 */
function mapJMAWarningType(jmaName: string): WeatherWarning['type'] | null {
    const mapping: Record<string, WeatherWarning['type']> = {
        '暴風警報': '暴風警報',
        '暴風雪警報': '暴風雪警報',
        '大雪警報': '大雪警報',
        '大雨警報': '大雨警報',
        '暴風注意報': '暴風注意報',
        '強風注意報': '暴風注意報', // 強風注意報→暴風注意報にマッピング
        '大雪注意報': '大雪注意報',
        '大雨注意報': '大雨注意報',
        '雷注意報': '雷注意報',
        '風雪注意報': '暴風注意報', // 風雪→暴風注意報にマッピング
    };

    return mapping[jmaName] ?? null;
}

/**
 * JMAの警報データからアクティブな警報を抽出
 */
function extractActiveWarnings(data: JMAWarningData, reportDatetime: string): WeatherWarning[] {
    const warnings: WeatherWarning[] = [];
    const seenTypes = new Set<string>();

    for (const areaType of data.areaTypes) {
        for (const area of areaType.areas) {
            for (const w of area.warnings) {
                // 「解除」ステータスはスキップ
                if (w.status === '解除') continue;

                const mappedType = mapJMAWarningType(w.name);
                if (!mappedType) continue;

                // 同一タイプの重複を避ける
                const key = `${mappedType}:${area.name}`;
                if (seenTypes.has(key)) continue;
                seenTypes.add(key);

                warnings.push({
                    type: mappedType,
                    area: area.name,
                    issuedAt: reportDatetime,
                    source: 'jma',
                });
            }
        }
    }

    return warnings;
}

/**
 * 指定路線に関連する気象庁の警報・注意報を取得
 *
 * @returns 警報の配列。取得失敗時は null（フォールバック用）
 */
export async function getJMAWarningsForRoute(routeId: string): Promise<WeatherWarning[] | null> {
    const routeConfig = (jmaAreaMapping.routes as Record<string, { areaCodes: string[]; areaNames: string[] }>)[routeId];
    if (!routeConfig) {
        console.warn(`[JMA] Unknown route: ${routeId}`);
        return null;
    }

    const allWarnings: WeatherWarning[] = [];

    // 路線に関連する全エリアの警報を並列取得
    const results = await Promise.allSettled(
        routeConfig.areaCodes.map(code => fetchJMAWarnings(code))
    );

    let anySuccess = false;

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
            anySuccess = true;
            const warnings = extractActiveWarnings(result.value, result.value.reportDatetime);
            allWarnings.push(...warnings);
        }
    }

    // 全エリア取得失敗ならフォールバック
    if (!anySuccess) return null;

    // 重複除去（type + area の組み合わせ）
    const unique = new Map<string, WeatherWarning>();
    for (const w of allWarnings) {
        const key = `${w.type}:${w.area}`;
        if (!unique.has(key)) {
            unique.set(key, w);
        }
    }

    return Array.from(unique.values());
}

/**
 * キャッシュをクリア（テスト・デバッグ用）
 */
export function clearJMACache(): void {
    warningCache.clear();
}
