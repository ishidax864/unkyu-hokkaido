import { getBoard, type Board } from '@/lib/engine/board';
import { HomeView } from '@/components/home/home-view';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
    let board: Board | null = null;
    try { board = await getBoard(); }
    catch (error) { logger.error('Home board unavailable', error); }
    return <HomeView initialBoard={board} />;
}
