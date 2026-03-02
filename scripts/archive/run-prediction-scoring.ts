import { matchPredictionsWithActualOutcomes } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function runScoring() {
    console.log('🎯 Starting Prediction Accuracy Scoring Loop...\n');

    try {
        const result = await matchPredictionsWithActualOutcomes();

        if (result.success) {
            console.log(`✅ Success! Processed ${result.data.processedCount} predictions.`);
            if (result.data.processedCount === 0) {
                console.log('ℹ️ No pending predictions found in the target window (2h to 12h ago).');
            }
        } else {
            console.log(`❌ Error: ${result.error}`);
        }
    } catch (e) {
        console.error('❌ Failed to run scoring loop:', e);
    }
}

runScoring();
