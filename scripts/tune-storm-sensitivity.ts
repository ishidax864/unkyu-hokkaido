import * as fs from 'fs';

function tuneSensitivity() {
    const helpersPath = '/Users/shota/運休AI/lib/prediction-engine/helpers.ts';
    let helpers = fs.readFileSync(helpersPath, 'utf-8');

    // Make gusts more decisive: WindGust >= 20m/s should never be considered "weak weather"
    // Already did this in applyConfidenceFilter: windGust < 20.

    // Let's increase the base score for gusts in risk-factors.ts instead if needed, 
    // but first let's check constants.ts again.

    // Actually, I'll update evaluateRiskFactors or similar to give more weight to gusts even if wind speed is low.

    console.log('Tuning sensitivity via constants and helpers...');

    // Reduce the suppression even more if gusts are present
    helpers = helpers.replace(
        /const suppressionRatio = isOfficialNormal \? 0.7 : 0.8;/g,
        "// Gusts > 18m/s (even if < 20) should have even less suppression\n        const hasSignificantGust = windGust >= 18;\n        const suppressionRatio = isOfficialNormal ? (hasSignificantGust ? 0.85 : 0.7) : 0.8;"
    );

    fs.writeFileSync(helpersPath, helpers);
    console.log('✅ lib/prediction-engine/helpers.ts tuned');
}

tuneSensitivity();
