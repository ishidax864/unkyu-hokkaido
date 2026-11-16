'use client';
import { JourneyCommunity } from '@/components/journey-community';
import type { JRStatus } from '@/lib/types';

/** 現地の声(利用者の未確認報告)。段階7で新しいデザインに置き換えるまで旧部品を使う。 */
export function CommunityIsland(props: { routeId: string; routeName: string; officialStatus: JRStatus | 'unknown'; departureId: string; arrivalId: string }) {
    return <div className="journey-app" style={{ background: 'transparent', minHeight: 0 }}>
        <JourneyCommunity {...props} onSignal={() => {}} />
    </div>;
}
