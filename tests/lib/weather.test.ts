import { describe, it, expect } from 'vitest';
import {
    calculateDistance,
    getWeatherName,
    generateWarningsFromHourly,
    getRouteCoordinates,
    findNearestWeatherPoint,
    ROUTE_COORDINATES,
} from '@/lib/weather';

// ===================================
// calculateDistance (Haversine)
// ===================================

describe('calculateDistance', () => {
    it('should return 0 for identical coordinates', () => {
        expect(calculateDistance(43.06, 141.35, 43.06, 141.35)).toBe(0);
    });

    it('should calculate distance between Sapporo and Chitose (~50km)', () => {
        const dist = calculateDistance(43.0621, 141.3544, 42.7752, 141.6922);
        expect(dist).toBeGreaterThan(35);
        expect(dist).toBeLessThan(55);
    });

    it('should calculate distance between Sapporo and Wakkanai (~300km)', () => {
        const dist = calculateDistance(43.0621, 141.3544, 44.9167, 142.0333);
        expect(dist).toBeGreaterThan(200);
        expect(dist).toBeLessThan(400);
    });

    it('should be symmetric', () => {
        const d1 = calculateDistance(43.0, 141.0, 44.0, 142.0);
        const d2 = calculateDistance(44.0, 142.0, 43.0, 141.0);
        expect(d1).toBeCloseTo(d2, 5);
    });
});

// ===================================
// getWeatherName
// ===================================

describe('getWeatherName', () => {
    it('should return 快晴 for code 0', () => {
        expect(getWeatherName(0)).toBe('快晴');
    });

    it('should return 晴れ for codes 1-3', () => {
        expect(getWeatherName(1)).toBe('晴れ');
        expect(getWeatherName(2)).toBe('晴れ');
        expect(getWeatherName(3)).toBe('晴れ');
    });

    it('should return 曇り for codes 4-48', () => {
        expect(getWeatherName(4)).toBe('曇り');
        expect(getWeatherName(45)).toBe('曇り');
        expect(getWeatherName(48)).toBe('曇り');
    });

    it('should return 雨 for codes 49-67', () => {
        expect(getWeatherName(51)).toBe('雨');
        expect(getWeatherName(61)).toBe('雨');
        expect(getWeatherName(67)).toBe('雨');
    });

    it('should return 雪 for codes 68-77', () => {
        expect(getWeatherName(71)).toBe('雪');
        expect(getWeatherName(77)).toBe('雪');
    });

    it('should return 雨 for codes 78-82', () => {
        expect(getWeatherName(80)).toBe('雨');
        expect(getWeatherName(82)).toBe('雨');
    });

    it('should return 雪 for codes 83-86', () => {
        expect(getWeatherName(85)).toBe('雪');
        expect(getWeatherName(86)).toBe('雪');
    });

    it('should return 雷雨 for codes 87-99', () => {
        expect(getWeatherName(95)).toBe('雷雨');
        expect(getWeatherName(99)).toBe('雷雨');
    });

    it('should return 不明 for unknown codes above 99', () => {
        expect(getWeatherName(100)).toBe('不明');
        expect(getWeatherName(999)).toBe('不明');
    });

    it('should handle negative codes as 晴れ (falls through <= 3)', () => {
        expect(getWeatherName(-1)).toBe('晴れ');
    });
});

// ===================================
// generateWarningsFromHourly
// ===================================

describe('generateWarningsFromHourly', () => {
    it('should return no warnings for calm conditions', () => {
        const warnings = generateWarningsFromHourly(0, 5, 0, 10);
        expect(warnings).toHaveLength(0);
    });

    // 暴風警報
    it('should generate 暴風警報 for wind >= 23 m/s', () => {
        const warnings = generateWarningsFromHourly(0, 25, 0, 30);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].type).toBe('暴風警報');
    });

    it('should generate 暴風注意報 for wind >= 16 m/s', () => {
        const warnings = generateWarningsFromHourly(0, 18, 0, 20);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].type).toBe('暴風注意報');
    });

    it('should generate 暴風注意報 for gust >= 35 m/s even with lower wind', () => {
        const warnings = generateWarningsFromHourly(0, 10, 0, 36);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].type).toBe('暴風注意報');
    });

    // 大雨警報
    it('should generate 大雨警報 for precipitation >= 30mm', () => {
        const warnings = generateWarningsFromHourly(35, 5, 0, 10);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].type).toBe('大雨警報');
    });

    it('should generate 大雨注意報 for precipitation >= 10mm', () => {
        const warnings = generateWarningsFromHourly(15, 5, 0, 10);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].type).toBe('大雨注意報');
    });

    // 大雪警報
    it('should generate 大雪警報 for snowfall >= 4 cm/h', () => {
        const warnings = generateWarningsFromHourly(0, 5, 5, 10);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].type).toBe('大雪警報');
    });

    // 複合条件
    it('should generate multiple warnings for compound conditions', () => {
        const warnings = generateWarningsFromHourly(35, 25, 5, 40);
        expect(warnings.length).toBeGreaterThanOrEqual(3);
        const types = warnings.map(w => w.type);
        expect(types).toContain('暴風警報');
        expect(types).toContain('大雨警報');
        expect(types).toContain('大雪警報');
    });

    it('should include area and issuedAt in warnings', () => {
        const warnings = generateWarningsFromHourly(0, 25, 0, 30);
        expect(warnings[0].area).toBe('北海道');
        expect(warnings[0].issuedAt).toBeDefined();
    });
});

// ===================================
// getRouteCoordinates
// ===================================

describe('getRouteCoordinates', () => {
    it('should return provided coordinates when given', () => {
        const coords = getRouteCoordinates('jr-hokkaido.chitose', { lat: 44.0, lon: 143.0 });
        expect(coords.lat).toBe(44.0);
        expect(coords.lon).toBe(143.0);
    });

    it('should return route coordinates for valid routeId', () => {
        const coords = getRouteCoordinates('jr-hokkaido.chitose');
        expect(coords.lat).toBe(ROUTE_COORDINATES['jr-hokkaido.chitose'][0].lat);
        expect(coords.lon).toBe(ROUTE_COORDINATES['jr-hokkaido.chitose'][0].lon);
    });

    it('should return default (Sapporo) for invalid routeId', () => {
        const coords = getRouteCoordinates('nonexistent-route');
        expect(coords.lat).toBe(43.0621);
        expect(coords.lon).toBe(141.3544);
    });

    it('should return default when no arguments', () => {
        const coords = getRouteCoordinates();
        expect(coords.lat).toBe(43.0621);
        expect(coords.lon).toBe(141.3544);
    });
});

// ===================================
// findNearestWeatherPoint
// ===================================

describe('findNearestWeatherPoint', () => {
    it('should find Sapporo (hakodate-main) for coordinates near Sapporo', () => {
        const result = findNearestWeatherPoint(43.06, 141.35);
        expect(result.id).toBe('jr-hokkaido.hakodate-main');
    });

    it('should find Chitose for coordinates near Chitose', () => {
        const result = findNearestWeatherPoint(42.78, 141.69);
        expect(result.id).toBe('jr-hokkaido.chitose');
    });

    it('should find Wakkanai (soya-main) for far-north coordinates', () => {
        const result = findNearestWeatherPoint(45.0, 142.0);
        expect(result.id).toBe('jr-hokkaido.soya-main');
    });

    it('should return an id and name', () => {
        const result = findNearestWeatherPoint(43.0, 141.0);
        expect(result.id).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.name.length).toBeGreaterThan(0);
    });
});
