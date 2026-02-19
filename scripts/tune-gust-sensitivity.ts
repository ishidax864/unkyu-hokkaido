import * as fs from 'fs';

function tuneGustSensitivity() {
    // 1. Update constants.ts
    const constantsPath = '/Users/shota/運休AI/lib/prediction-engine/constants.ts';
    let constants = fs.readFileSync(constantsPath, 'utf-8');

    // Lower gust threshold for proactive risk
    constants = constants.replace(
        /export const WIND_GUST_DANGER_THRESHOLD = 25;/g,
        "export const WIND_GUST_DANGER_THRESHOLD = 18; // 25 -> 18: 更に早期の規制リスク検知のため"
    );

    fs.writeFileSync(constantsPath, constants);
    console.log('✅ constants.ts updated');

    // 2. Update helpers.ts (isWeakWeather check should already catch 18 as not weak since 18 < 20)
    // Actually, I'll make isWeakWeather even stricter for gusts.
    const helpersPath = '/Users/shota/運休AI/lib/prediction-engine/helpers.ts';
    let helpers = fs.readFileSync(helpersPath, 'utf-8');

    helpers = helpers.replace(
        /const isWeakWeather = windSpeed < 15 && windGust < 20 && snowfall < 1.0;/g,
        "const isWeakWeather = windSpeed < 12 && windGust < 15 && snowfall < 0.5;"
    );

    fs.writeFileSync(helpersPath, helpers);
    console.log('✅ helpers.ts updated');
}

tuneGustSensitivity();

