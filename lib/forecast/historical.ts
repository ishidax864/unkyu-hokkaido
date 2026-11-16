import catalog from '@/data/historical/winter-events.json';

export type WinterEvent = typeof catalog.events[number];
export interface WinterCase {
    id: string; stormId: string; section: string; startDate: string; resumedDate: string;
    label: string; hoursToPartialResumption: number | null; sourceUrl: string;
}

// These selected severe storms are context, not a representative training set.
// In particular, date-only outcomes and rescue trains never become hour labels.
export function exactRecoveryHours(event: WinterEvent): number | null {
    if (event.outcome !== 'actual' || !['limited', 'resumed'].includes(event.serviceLevel) || !event.startedAt || !event.resumedAt) return null;
    const hours = (Date.parse(event.resumedAt) - Date.parse(event.startedAt)) / 3_600_000;
    return Number.isFinite(hours) && hours > 0 ? hours : null;
}

export function winterCaseReferences(routeIds: string[], asOf = new Date()): WinterCase[] {
    return catalog.events.filter(event => routeIds.includes(event.routeId) && event.outcome === 'actual' && ['limited', 'resumed'].includes(event.serviceLevel))
        .filter(event => {
            const source = catalog.sources.find(source => source.id === event.sourceId);
            return source && Date.parse(`${source.publishedAt}T23:59:59+09:00`) < asOf.getTime();
        })
        .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id))
        .map(event => ({ id: event.id, stormId: event.stormId, section: event.section, startDate: event.startDate,
            resumedDate: event.resumedDate, label: event.resumptionLabel, hoursToPartialResumption: exactRecoveryHours(event),
            sourceUrl: `${catalog.sources.find(source => source.id === event.sourceId)!.url}#page=${event.sourcePage}` }));
}

export function winterCatalogSummary() {
    return { records: catalog.events.length, storms: new Set(catalog.events.map(event => event.stormId)).size,
        actualSegmentReopenings: catalog.events.filter(event => event.outcome === 'actual' && ['limited', 'resumed'].includes(event.serviceLevel)).length,
        exactDurationRows: catalog.events.filter(event => exactRecoveryHours(event) !== null).length,
        exactDurationStorms: new Set(catalog.events.filter(event => exactRecoveryHours(event) !== null).map(event => event.stormId)).size,
        plannedExcluded: catalog.events.filter(event => event.outcome === 'planned').length,
        rescueExcluded: catalog.events.filter(event => event.serviceLevel === 'rescue').length };
}
