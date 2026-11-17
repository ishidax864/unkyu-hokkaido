import { notFound, permanentRedirect } from 'next/navigation';
import { LEGACY_ROUTE_TO_SLUG } from '@/lib/registry/lines';

/** 旧URL /route/<旧ID> は新しい路線ページへ */
export default async function LegacyRoutePage({ params }: { params: Promise<{ routeId: string }> }) {
    const slug = LEGACY_ROUTE_TO_SLUG[(await params).routeId];
    if (!slug) notFound();
    permanentRedirect(`/line/${slug}`);
}
