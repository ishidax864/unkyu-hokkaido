import type { CORE_VERSION } from './core';
import type { JRStatus, WeatherForecast } from '@/lib/types';
import type { RecoveryEstimate } from './recovery';
import type { WinterCase } from './historical';
import type { WarningSnapshot } from '@/lib/jma-warnings';
import type { ObservedSnow } from './observed-snow';
import type { BusAlternatives } from './alternatives';

export type RiskLevel = 'low' | 'watch' | 'high' | 'severe' | 'unknown';
export interface WeatherPoint { name: string; lat: number; lon: number }
export interface PointForecast { point: WeatherPoint; hours: WeatherForecast[]; fetchedAt: string }
export interface RiskAssessment {
    level: RiskLevel;
    score: number | null;
    reasons: string[];
    location: string | null;
    weather: WeatherForecast | null;
    coverage: { available: number; total: number };
}
export interface ForecastSlot extends RiskAssessment { date: string; time: string }
export interface JourneyForecast {
    modelVersion: typeof CORE_VERSION;
    calibrated: false;
    generatedAt: string;
    request: { departureId: string; arrivalId: string; date: string; time: string };
    route: { id: string; name: string; scope: string; points: string[]; lines: { id: string; name: string }[] };
    current: RiskAssessment;
    hourly: ForecastSlot[];
    daily: ForecastSlot[];
    official: {
        status: JRStatus | 'unknown';
        text: string;
        checkedAt: string | null;
        publishedAt: string | null;
        url: string;
    };
    sources: { weatherFetchedAt: string | null; forecastHoursAhead: number };
    recovery: RecoveryEstimate;
    historyAvailable: boolean;
    winterCases: WinterCase[];
    warnings?: WarningSnapshot;
    observedSnow?: ObservedSnow;
    buses?: BusAlternatives;
}
