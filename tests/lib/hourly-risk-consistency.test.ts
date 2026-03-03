import { describe, it, expect } from 'vitest';
import { calculateSuspensionRisk } from '@/lib/prediction-engine';
import type { PredictionInput, WeatherForecast, HourlyRiskData } from '@/lib/types';

/**
 * 時間帯別リスク一貫性テスト
 *
 * 検索時刻を変えても、重複する時間帯のリスク値が一致することを検証する。
 * これはユーザーの「14時に検索→14時=X%」と「15時に検索→14時=X%」が
 * 同じ値になるべきという要件に対応する。
 */

// テスト用の surroundingHours データを生成（12:00〜18:00の7時間分）
function createSurroundingHours(): WeatherForecast[] {
    const hours = [];
    for (let h = 6; h <= 20; h++) {
        const hStr = h.toString().padStart(2, '0');
        hours.push({
            date: '2026-01-20',
            targetTime: `${hStr}:00`,
            weather: h >= 15 ? '雪' : '曇り',
            temperature: -3 + (h - 12) * 0.5,
            tempMax: -3 + (h - 12) * 0.5,
            tempMin: -3 + (h - 12) * 0.5,
            precipitation: h >= 14 ? 2 : 0,
            windSpeed: 8 + h * 0.5,
            snowfall: h >= 15 ? 3 + (h - 15) * 2 : 0,
            snowDepth: 0.15 + h * 0.01,
            snowDepthChange: h >= 15 ? 2.0 : 0,
            windGust: 12 + h * 0.8,
            pressure: 1010 - h * 0.5,
            weatherCode: h >= 15 ? 71 : 3,
            windDirection: 315,
            warnings: [],
        } as WeatherForecast);
    }
    return hours;
}

// buildHourlyRiskTrend と同等のロジックでトレンドを構築するテスト用ヘルパー
function buildTrendForTest(
    targetHour: number,
    surroundingWeather: WeatherForecast[],
    routeId: string = 'jr-hokkaido.muroran-main',
    jrStatus: PredictionInput['jrStatus'] = null,
): HourlyRiskData[] {
    const trend: HourlyRiskData[] = [];

    for (let offset = -2; offset <= 2; offset++) {
        const h = targetHour + offset;
        if (h < 0 || h > 23) continue;

        const hStr = h.toString().padStart(2, '0');
        const checkTime = `${hStr}:00`;
        const isTarget = offset === 0;

        const hourWeather = surroundingWeather.find((sw) => {
            const swHour = sw.targetTime ? parseInt(sw.targetTime.split(':')[0]) : -1;
            return swHour === h;
        }) || null;

        if (!hourWeather) continue;

        const isolatedWeather = { ...hourWeather, surroundingHours: undefined } as WeatherForecast;

        const hourResult = calculateSuspensionRisk({
            weather: isolatedWeather,
            routeId,
            routeName: 'テスト路線',
            targetDate: '2026-01-20',
            targetTime: checkTime,
            jrStatus,
        });

        let icon: HourlyRiskData['weatherIcon'] = 'cloud';
        if ((hourWeather.snowfall ?? 0) > 0) icon = 'snow';
        else if (hourWeather.precipitation && hourWeather.precipitation > 0) icon = 'rain';
        else if (hourWeather.windSpeed >= 15) icon = 'wind';
        else if (hourWeather.weather.includes('晴')) icon = 'sun';

        trend.push({
            time: checkTime,
            risk: Math.floor(hourResult.probability),
            weatherIcon: icon,
            isTarget,
            isCurrent: isTarget,
        });
    }

    return trend;
}

// ===================================
// 検索時刻横断一貫性テスト
// ===================================

describe('Hourly Risk Consistency - Cross-Search-Time', () => {
    const surroundingHours = createSurroundingHours();

    it('同じ時刻は異なる検索時刻でも同じリスク値を返す（14:00検索 vs 15:00検索）', () => {
        const trend14 = buildTrendForTest(14, surroundingHours);
        const trend15 = buildTrendForTest(15, surroundingHours);

        // 14:00検索: 12:00, 13:00, [14:00], 15:00, 16:00
        // 15:00検索: 13:00, 14:00, [15:00], 16:00, 17:00
        // 重複: 13:00, 14:00, 15:00, 16:00

        const overlap13_from14 = trend14.find(t => t.time === '13:00');
        const overlap13_from15 = trend15.find(t => t.time === '13:00');
        expect(overlap13_from14?.risk).toBe(overlap13_from15?.risk);

        const overlap14_from14 = trend14.find(t => t.time === '14:00');
        const overlap14_from15 = trend15.find(t => t.time === '14:00');
        expect(overlap14_from14?.risk).toBe(overlap14_from15?.risk);

        const overlap15_from14 = trend14.find(t => t.time === '15:00');
        const overlap15_from15 = trend15.find(t => t.time === '15:00');
        expect(overlap15_from14?.risk).toBe(overlap15_from15?.risk);

        const overlap16_from14 = trend14.find(t => t.time === '16:00');
        const overlap16_from15 = trend15.find(t => t.time === '16:00');
        expect(overlap16_from14?.risk).toBe(overlap16_from15?.risk);
    });

    it('同じ時刻は異なる検索時刻でも同じリスク値を返す（12:00検索 vs 14:00検索）', () => {
        const trend12 = buildTrendForTest(12, surroundingHours);
        const trend14 = buildTrendForTest(14, surroundingHours);

        // 重複: 13:00, 14:00
        const overlap13_from12 = trend12.find(t => t.time === '13:00');
        const overlap13_from14 = trend14.find(t => t.time === '13:00');
        expect(overlap13_from12?.risk).toBe(overlap13_from14?.risk);

        const overlap14_from12 = trend12.find(t => t.time === '14:00');
        const overlap14_from14 = trend14.find(t => t.time === '14:00');
        expect(overlap14_from12?.risk).toBe(overlap14_from14?.risk);
    });

    it('ターゲット時刻かどうかで値が変わらない', () => {
        const trend14 = buildTrendForTest(14, surroundingHours);
        const trend15 = buildTrendForTest(15, surroundingHours);

        // 14:00は trend14ではターゲット、trend15では非ターゲット
        const hour14_asTarget = trend14.find(t => t.time === '14:00');
        const hour14_asNonTarget = trend15.find(t => t.time === '14:00');

        expect(hour14_asTarget).toBeDefined();
        expect(hour14_asNonTarget).toBeDefined();
        expect(hour14_asTarget!.isTarget).toBe(true);
        expect(hour14_asNonTarget!.isTarget).toBe(false);
        // リスク値は同じであるべき（isTargetフラグのみ異なる）
        expect(hour14_asTarget!.risk).toBe(hour14_asNonTarget!.risk);
    });

    it('3つ以上の検索時刻で全て同じ値を返す', () => {
        const trend13 = buildTrendForTest(13, surroundingHours);
        const trend14 = buildTrendForTest(14, surroundingHours);
        const trend15 = buildTrendForTest(15, surroundingHours);

        // 14:00の値を3つの検索で比較
        const v1 = trend13.find(t => t.time === '14:00')?.risk;
        const v2 = trend14.find(t => t.time === '14:00')?.risk;
        const v3 = trend15.find(t => t.time === '14:00')?.risk;

        expect(v1).toBeDefined();
        expect(v1).toBe(v2);
        expect(v2).toBe(v3);
    });
});

// ===================================
// 積雪シナリオの一貫性テスト
// ===================================

describe('Hourly Risk Consistency - Snow Scenarios', () => {
    it('積雪がある場合でも一貫性を維持する', () => {
        const hours = createSurroundingHours();
        // 全時間で重い積雪を設定
        for (const h of hours) {
            h.snowfall = 8;
            h.snowDepth = 0.50;
            h.snowDepthChange = 5.0;
        }

        const trend14 = buildTrendForTest(14, hours);
        const trend16 = buildTrendForTest(16, hours);

        // 15:00の値が一致することを確認
        const v14 = trend14.find(t => t.time === '15:00')?.risk;
        const v16 = trend16.find(t => t.time === '15:00')?.risk;
        expect(v14).toBe(v16);
    });

    it('snowDepthChange がゼロのシナリオでも一貫性を維持する', () => {
        const hours = createSurroundingHours();
        for (const h of hours) {
            h.snowfall = 0;
            h.snowDepth = 0;
            h.snowDepthChange = 0;
        }

        const trend14 = buildTrendForTest(14, hours);
        const trend15 = buildTrendForTest(15, hours);

        const overlap = ['13:00', '14:00', '15:00', '16:00'];
        for (const time of overlap) {
            const v14 = trend14.find(t => t.time === time)?.risk;
            const v15 = trend15.find(t => t.time === time)?.risk;
            expect(v14).toBe(v15);
        }
    });
});

// ===================================
// 路線別の一貫性テスト
// ===================================

describe('Hourly Risk Consistency - Route Independence', () => {
    const surroundingHours = createSurroundingHours();
    const routes = [
        'jr-hokkaido.hakodate-main',
        'jr-hokkaido.muroran-main',
        'jr-hokkaido.sekisho',
        'jr-hokkaido.soya-main',
    ];

    for (const routeId of routes) {
        it(`${routeId}: 検索時刻が異なっても同じ時刻は同じ値`, () => {
            const trend14 = buildTrendForTest(14, surroundingHours, routeId);
            const trend15 = buildTrendForTest(15, surroundingHours, routeId);

            const overlap15_from14 = trend14.find(t => t.time === '15:00')?.risk;
            const overlap15_from15 = trend15.find(t => t.time === '15:00')?.risk;
            expect(overlap15_from14).toBe(overlap15_from15);
        });
    }
});

// ===================================
// 天気アイコン一貫性テスト
// ===================================

describe('Hourly Risk Consistency - Weather Icons', () => {
    const surroundingHours = createSurroundingHours();

    it('同じ時刻は検索時刻に関わらず同じ天気アイコンを返す', () => {
        const trend14 = buildTrendForTest(14, surroundingHours);
        const trend15 = buildTrendForTest(15, surroundingHours);

        const overlappingTimes = ['13:00', '14:00', '15:00', '16:00'];
        for (const time of overlappingTimes) {
            const icon14 = trend14.find(t => t.time === time)?.weatherIcon;
            const icon15 = trend15.find(t => t.time === time)?.weatherIcon;
            expect(icon14).toBe(icon15);
        }
    });
});

// ===================================
// トレンド構造テスト
// ===================================

describe('Hourly Risk Trend - Structure', () => {
    const surroundingHours = createSurroundingHours();

    it('トレンドは5つの時間帯を返す', () => {
        const trend = buildTrendForTest(14, surroundingHours);
        expect(trend).toHaveLength(5);
    });

    it('isTarget は offset=0 のエントリだけ true', () => {
        const trend = buildTrendForTest(14, surroundingHours);
        const targets = trend.filter(t => t.isTarget);
        expect(targets).toHaveLength(1);
        expect(targets[0].time).toBe('14:00');
    });

    it('全リスク値は 0〜100 の範囲', () => {
        const trend = buildTrendForTest(14, surroundingHours);
        for (const t of trend) {
            expect(t.risk).toBeGreaterThanOrEqual(0);
            expect(t.risk).toBeLessThanOrEqual(100);
        }
    });

    it('時間は昇順', () => {
        const trend = buildTrendForTest(14, surroundingHours);
        for (let i = 1; i < trend.length; i++) {
            expect(trend[i].time > trend[i - 1].time).toBe(true);
        }
    });

    it('0時や23時近くでも範囲外を含まない', () => {
        const earlyHours = createSurroundingHours();
        const trend1 = buildTrendForTest(1, earlyHours);
        // 0時以前は含まないことを確認
        for (const t of trend1) {
            const h = parseInt(t.time.split(':')[0]);
            expect(h).toBeGreaterThanOrEqual(0);
            expect(h).toBeLessThanOrEqual(23);
        }

        const trend23 = buildTrendForTest(23, earlyHours);
        for (const t of trend23) {
            const h = parseInt(t.time.split(':')[0]);
            expect(h).toBeGreaterThanOrEqual(0);
            expect(h).toBeLessThanOrEqual(23);
        }
    });
});
