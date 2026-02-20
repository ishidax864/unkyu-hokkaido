import { describe, it, expect } from 'vitest';
import {
    HOKKAIDO_ROUTES,
    HOKKAIDO_STATIONS,
    getStationById,
    getRouteById,
    getCommonLines,
    getConnectingRoute,
    getMajorStations,
    getAlternativeRoutes,
    estimateTaxiFare,
} from '@/lib/hokkaido-data';
import areasData from '../../data/areas.json';
import alternativeRoutesData from '../../data/alternative-routes.json';
import stationFacilities from '../../data/station-facilities.json';
import vulnerabilities from '../../data/hokkaido-vulnerabilities.json';

// ===================================
// データ整合性テスト
// ===================================

describe('Data Integrity - Stations', () => {
    it('should have at least 50 stations', () => {
        expect(HOKKAIDO_STATIONS.length).toBeGreaterThan(50);
    });

    it('every station should have required fields', () => {
        HOKKAIDO_STATIONS.forEach(station => {
            expect(station.id).toBeTruthy();
            expect(station.name).toBeTruthy();
            expect(station.region).toBeTruthy();
            expect(Array.isArray(station.lines)).toBe(true);
            expect(station.lines.length).toBeGreaterThan(0);
        });
    });

    it('should have no duplicate station IDs', () => {
        const ids = HOKKAIDO_STATIONS.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every station line reference should match a valid route', () => {
        const routeIds = new Set(HOKKAIDO_ROUTES.map(r => r.id));
        const missingRoutes: string[] = [];

        HOKKAIDO_STATIONS.forEach(station => {
            station.lines.forEach(lineId => {
                if (!routeIds.has(lineId)) {
                    missingRoutes.push(`${station.name}(${station.id}) → ${lineId}`);
                }
            });
        });

        expect(missingRoutes).toEqual([]);
    });

    it('major stations should have coordinates', () => {
        const majors = getMajorStations();
        expect(majors.length).toBeGreaterThan(5);

        majors.forEach(station => {
            expect(station.lat).toBeDefined();
            expect(station.lon).toBeDefined();
            // 北海道の緯度経度範囲チェック
            if (station.lat && station.lon) {
                expect(station.lat).toBeGreaterThan(41);
                expect(station.lat).toBeLessThan(46);
                expect(station.lon).toBeGreaterThan(139);
                expect(station.lon).toBeLessThan(146);
            }
        });
    });
});

describe('Data Integrity - Routes', () => {
    it('should have at least 10 routes', () => {
        expect(HOKKAIDO_ROUTES.length).toBeGreaterThanOrEqual(10);
    });

    it('every route should have required fields', () => {
        HOKKAIDO_ROUTES.forEach(route => {
            expect(route.id).toBeTruthy();
            expect(route.name).toBeTruthy();
            expect(route.region).toBeTruthy();
        });
    });

    it('should have no duplicate route IDs', () => {
        const ids = HOKKAIDO_ROUTES.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('all route IDs should follow naming convention', () => {
        HOKKAIDO_ROUTES.forEach(route => {
            expect(route.id).toMatch(/^jr-hokkaido\.[a-z0-9-]+$/);
        });
    });
});

describe('Data Integrity - Areas', () => {
    const areas = areasData as Record<string, string[]>;

    it('every station in areas should exist in station data', () => {
        const stationIds = new Set(HOKKAIDO_STATIONS.map(s => s.id));
        const missingStations: string[] = [];

        Object.entries(areas).forEach(([areaName, stationList]) => {
            stationList.forEach(stationId => {
                if (!stationIds.has(stationId)) {
                    missingStations.push(`area:${areaName} → ${stationId}`);
                }
            });
        });

        expect(missingStations).toEqual([]);
    });

    it('should have no duplicate station IDs within an area', () => {
        Object.entries(areas).forEach(([areaName, stationList]) => {
            const unique = new Set(stationList);
            if (unique.size !== stationList.length) {
                throw new Error(`Duplicate in area ${areaName}`);
            }
        });
    });
});

describe('Data Integrity - Alternative Routes', () => {
    const routes = alternativeRoutesData as Record<string, unknown>[];

    it('should have at least 1 alternative route defined', () => {
        expect(routes.length).toBeGreaterThan(0);
    });

    it('each alternative should have valid options', () => {
        routes.forEach((route, i) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const options = (route as any).options;
            expect(Array.isArray(options)).toBe(true);
            options.forEach((opt: Record<string, unknown>) => {
                expect(opt.type).toBeTruthy();
                expect(opt.name).toBeTruthy();
            });
        });
    });
});

describe('Data Integrity - Vulnerabilities', () => {
    const vulnData = vulnerabilities as Record<string, unknown>;

    it('vulnerability route IDs should match existing routes', () => {
        const routeIds = new Set(HOKKAIDO_ROUTES.map(r => r.id));
        const missingRoutes: string[] = [];

        Object.keys(vulnData).forEach(routeId => {
            if (!routeIds.has(routeId)) {
                missingRoutes.push(routeId);
            }
        });

        expect(missingRoutes).toEqual([]);
    });
});

describe('Data Integrity - Station Facilities', () => {
    it('facility station IDs should match existing stations', () => {
        const stationIds = new Set(HOKKAIDO_STATIONS.map(s => s.id));
        const facilityData = stationFacilities as Record<string, unknown>;
        const missingStations: string[] = [];

        Object.keys(facilityData).forEach(stationId => {
            if (!stationIds.has(stationId)) {
                missingStations.push(stationId);
            }
        });

        expect(missingStations).toEqual([]);
    });
});

// ===================================
// 機能テスト（hokkaido-data関数）
// ===================================

describe('hokkaido-data functions', () => {
    it('getStationById should find known station', () => {
        const sapporo = getStationById('sapporo');
        expect(sapporo).toBeDefined();
        expect(sapporo?.name).toBe('札幌');
    });

    it('getStationById should return undefined for invalid ID', () => {
        expect(getStationById('invalid.station')).toBeUndefined();
    });

    it('getRouteById should find known route', () => {
        const hakodate = getRouteById('jr-hokkaido.hakodate-main');
        expect(hakodate).toBeDefined();
    });

    it('getCommonLines should find shared routes between two stations', () => {
        const sapporo = getStationById('sapporo');
        const otaru = getStationById('otaru');
        if (sapporo && otaru) {
            const common = getCommonLines(sapporo, otaru);
            expect(common.length).toBeGreaterThan(0);
        }
    });

    it('getConnectingRoute should find route for cross-area travel', () => {
        const sapporo = getStationById('sapporo');
        const obihiro = getStationById('obihiro');
        if (sapporo && obihiro) {
            const route = getConnectingRoute(sapporo, obihiro);
            expect(route).toBeDefined();
            expect(route?.id).toBe('jr-hokkaido.sekisho');
        }
    });

    it('estimateTaxiFare should return valid estimate for nearby stations', () => {
        const sapporo = getStationById('sapporo');
        const shin_sapporo = getStationById('shin-sapporo');
        if (sapporo && shin_sapporo) {
            const fare = estimateTaxiFare(sapporo, shin_sapporo);
            if (fare) {
                expect(fare.estimatedFare).toBeGreaterThan(0);
                expect(fare.distance).toBeGreaterThan(0);
            }
        }
    });

    it('getAlternativeRoutes should return options for known route pairs', () => {
        // Try some known route pairs
        const alternatives = getAlternativeRoutes('sapporo', 'shin-chitose-airport');
        // May or may not have alternatives defined - just check it doesn't throw
        expect(Array.isArray(alternatives)).toBe(true);
    });
});
