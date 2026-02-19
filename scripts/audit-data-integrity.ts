import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function auditIntegrity() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🛡️ Starting Production Data Integrity Audit...');

    const tables = [
        'crawler_logs',
        'route_status_history',
        'prediction_history',
        'user_reports',
        'monitoring_logs'
    ];

    for (const table of tables) {
        process.stdout.write(`🔍 Checking table [${table}]... `);
        const { error } = await supabase.from(table).select('count').limit(1);
        if (error) {
            console.log('❌ FAIL');
            console.error(`   Error: ${error.message} (Code: ${error.code})`);
            if (table === 'prediction_history') {
                console.log('   👉 Note: This table may need restoration using scripts/restore-db-schema.sql');
            }
        } else {
            console.log('✅ OK');
        }
    }

    console.log('\n🏁 Audit complete.');
}

auditIntegrity();
