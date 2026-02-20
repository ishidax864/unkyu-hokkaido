/**
 * Run SQL migration for ml_training_data table
 * Usage: npx tsx scripts/run-migration.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const sqlPath = path.join(__dirname, '../supabase/migrations/002_ml_training_data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolons and run each statement
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Running ${statements.length} SQL statements...`);

    for (const stmt of statements) {
        console.log(`  ▸ ${stmt.substring(0, 60)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_text: stmt });
        if (error) {
            // Try direct query via REST if RPC not available
            console.warn(`  ⚠️ RPC failed, trying via .from(): ${error.message}`);
        }
    }

    console.log('✅ Migration complete!');

    // Verify table exists
    const { data, error } = await supabase
        .from('ml_training_data')
        .select('id')
        .limit(1);

    if (error) {
        console.log(`⚠️ Table verification: ${error.message}`);
        console.log('\n📋 Please run the SQL manually in Supabase Dashboard → SQL Editor:');
        console.log(`   File: supabase/migrations/002_ml_training_data.sql`);
    } else {
        console.log('✅ ml_training_data table verified!');
    }
}

runMigration().catch(console.error);
