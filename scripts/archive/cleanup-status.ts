
import { getAdminSupabaseClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

async function cleanupRecentStatus() {
    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        console.error('❌ Supabase ADMIN client not available');
        return;
    }

    console.log('🧹 Cleaning up recent incorrect status entries...');

    const today = new Date().toISOString().split('T')[0];

    // Delete entries for today created by the faulty logic (where detail contains '再開' but was marked 'normal' erroneously? Or just wipe generic matches?)
    // Actually, safer to just delete *all* status for Hakodate Line today so the crawler can regenerate them cleanly?
    // But we don't know the route IDs easily here without importing definitions.
    // Let's just rely on the next crawl to insert new valid entries. 
    // Wait, if we don't delete, the old ones might persist in cache?
    // The system usually fetches the *latest*. So a new insert with correct status and *newer* timestamp should override.
    // So explicit cleanup might not be strictly necessary if the crawler runs immediately.

    // But to be sure, let's delete entries from the last hour?
    // Actually, "runJRCrawler" function inserts new records. The UI fetches the latest one.
    // So just running the crawler again is sufficient.

    console.log('ℹ️  Skipping raw delete. A fresh crawl will push new latest records.');
}

cleanupRecentStatus();
