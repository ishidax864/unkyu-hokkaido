import type { JourneyForecast, RiskAssessment } from '@/lib/forecast/types';
import { japanDate, japanTime } from '@/lib/forecast/time';

/** Synthetic UI scenarios only. Never used by the prediction API or stored in the database. */
export function journeyDesignFixture(scenario: 'normal' | 'official' | 'unknown' | 'all-day' | 'unavailable', now = new Date()): JourneyForecast {
    const date = japanDate(now);
    const time = japanTime(now);
    const normal = scenario === 'normal';
    const unavailable = scenario === 'unavailable';
    const current: RiskAssessment = {
        level: unavailable ? 'unknown' : normal ? 'low' : 'high',
        score: unavailable ? null : normal ? 0 : 65,
        location: '札幌', reasons: ['画面確認用の架空データ'], coverage: { available: unavailable ? 0 : 2, total: 2 },
        weather: unavailable ? null : { date, targetTime: time.slice(0, 2) + ':00', weather: normal ? '晴れ' : '雪',
            tempMin: -5, tempMax: -5, windSpeed: normal ? 2.8 : 14.2, windGust: normal ? 4 : 22, snowfall: normal ? 0 : 3.8, precipitation: normal ? 0 : 2.7, warnings: [] },
    };
    const expected = new Date(now.getTime() + 90 * 60_000).toISOString();
    return {
        modelVersion: 'risk-core-1.1', calibrated: false, generatedAt: now.toISOString(),
        request: { departureId: 'sapporo', arrivalId: 'shin-chitose-airport', date, time },
        route: { id: 'jr-hokkaido.chitose', name: '千歳線', scope: '画面確認用', points: ['札幌', '千歳'], lines: [{ id: 'jr-hokkaido.chitose', name: '千歳線' }] },
        current,
        hourly: Array.from({ length: 7 }, (_, index) => ({ ...current, date, time: `${String(9 + index).padStart(2, '0')}:00` })),
        daily: [],
        official: {
            status: unavailable ? 'unknown' : normal ? 'normal' : 'suspended',
            text: normal ? '【画面確認用】遅れに関する情報はありません。' : scenario === 'all-day' ? '【画面確認用】大雪のため、札幌〜新千歳空港間は終日運休します。' : '【画面確認用】大雪のため、札幌〜新千歳空港間で運転を見合わせています。',
            checkedAt: now.toISOString(), publishedAt: unavailable ? null : now.toISOString(), url: 'https://www3.jrhokkaido.co.jp/webunkou/area_spo.html',
        },
        sources: { weatherFetchedAt: now.toISOString(), forecastHoursAhead: 0 },
        recovery: {
            kind: normal ? 'not-disrupted' : scenario === 'official' ? 'official' : scenario === 'all-day' ? 'all-day' : 'unknown',
            label: '画面確認用', detail: scenario === 'official' ? '画面確認用の架空の再開予定です。' : '時刻を推定できる情報が不足しています。',
            earliest: scenario === 'official' ? expected : null, latest: scenario === 'official' ? expected : null,
            remainingMinutes: scenario === 'official' ? { lower: 90, upper: 90 } : null, sampleCount: 0,
        },
        historyAvailable: false, winterCases: [],
    };
}
