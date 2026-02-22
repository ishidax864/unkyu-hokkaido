import { getFeedbackList, getReportsList, getGlobalStats } from '../lib/supabase';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function diagnose() {
    console.log('--- Diagnostic: Admin Data ---');

    console.log('\n1. Global Stats:');
    const stats = await getGlobalStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n2. Recent Reports (First 5):');
    const reports = await getReportsList(5);
    console.log(JSON.stringify(reports, null, 2));

    console.log('\n3. Recent Feedback (First 5):');
    const feedback = await getFeedbackList(5);
    console.log(JSON.stringify(feedback, null, 2));
}

diagnose().catch(console.error);
