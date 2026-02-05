import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import path from 'path';

// Load environment variables (supports .env, .env.local, etc.)
loadEnvConfig(path.resolve(__dirname, '../'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseIntegrity() {
    console.log('🔍 Starting database integrity check...');
    let issuesFound = 0;

    // 1. Check user_reports table
    console.log('\nChecking table: user_reports');
    const { count: reportCount, error: reportError } = await supabase
        .from('user_reports')
        .select('*', { count: 'exact', head: true });

    if (reportError) {
        console.error('❌ Failed to access user_reports:', reportError.message);
        issuesFound++;
    } else {
        console.log(`✅ Table exists (Total rows: ${reportCount})`);
    }

    // 2. Check for orphaned reports (invalid route_ids) if we had a routes table
    // For now, checks simplistic "orphaned" by looking for obviously bad data
    // Assuming route_ids should be strings with certain prefix
    const { data: badReports, error: badReportsError } = await supabase
        .from('user_reports')
        .select('id, route_id')
        .not('route_id', 'like', 'jr-hokkaido.%')
        .limit(10);

    if (badReportsError) {
        console.error('❌ Failed to check for bad route_ids:', badReportsError.message);
    } else if (badReports && badReports.length > 0) {
        console.warn(`⚠️ Found ${badReports.length} reports with suspicious route_ids (not starting with 'jr-hokkaido.'):`);
        badReports.forEach(r => console.log(`   - ID: ${r.id}, Route: ${r.route_id}`));
        issuesFound++;
    } else {
        console.log('✅ No obviously invalid route_ids found');
    }

    // 3. Check prediction_history table
    console.log('\nChecking table: prediction_history');
    const { count: predCount, error: predError } = await supabase
        .from('prediction_history')
        .select('*', { count: 'exact', head: true });

    if (predError) {
        console.error('❌ Failed to access prediction_history:', predError.message);
        issuesFound++;
    } else {
        console.log(`✅ Table exists (Total rows: ${predCount})`);
    }

    // 4. Check for invalid probabilities
    const { data: invalidProbs, error: invalidProbsError } = await supabase
        .from('prediction_history')
        .select('id, probability')
        .or('probability.lt.0,probability.gt.100')
        .limit(10);

    if (invalidProbsError) {
        console.error('❌ Failed to check for invalid probabilities:', invalidProbsError.message);
    } else if (invalidProbs && invalidProbs.length > 0) {
        console.error(`❌ Found ${invalidProbs.length} predictions with invalid probability (must be 0-100):`);
        invalidProbs.forEach(p => console.log(`   - ID: ${p.id}, Prob: ${p.probability}`));
        issuesFound++;
    } else {
        console.log('✅ All probability values are within valid range (0-100)');
    }

    // Summary
    console.log('\n' + '='.repeat(30));
    if (issuesFound === 0) {
        console.log('✅ INTEGRITY CHECK PASSED: No issues found.');
    } else {
        console.error(`❌ INTEGRITY CHECK FAILED: Found ${issuesFound} potential issues.`);
        process.exit(1);
    }
}

checkDatabaseIntegrity().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
