
import { predictWithML } from '../lib/prediction-engine/ml-runner';

async function verify() {
    console.log("=== Weather Impact Verification ===");

    // Case A: Strong Wind (Typical Typhoon/Low Pressure)
    // Wind 25m/s (Very strong), but no snow.
    const windInput = {
        routeId: 'jr-hokkaido.chitose',
        month: 2,
        windSpeed: 25,
        windDirection: 0,
        windGust: 35,
        snowfall: 0,
        snowDepth: 0,
        temperature: 5,
        pressure: 990,
        windChange: 0,
        pressureChange: 0
    };

    // Case B: Super Heavy Snow (Blizzard)
    // Wind 10m/s (Moderate), but Extreme Snow (150cm depth, 15cm snowfall)
    const snowInput = {
        routeId: 'jr-hokkaido.chitose',
        month: 2,
        windSpeed: 10,
        windDirection: 0,
        windGust: 15,
        snowfall: 50, // Insane snowfall
        snowDepth: 150, // Deep snow (Score contribution: (150-30)*0.5 = 60)
        temperature: -5,
        pressure: 1000,
        windChange: 0,
        pressureChange: 0
    };

    console.log("\n--- Predicting Case A: Strong Wind (25m/s) ---");
    const windRes = await predictWithML(windInput);
    console.log(`Status: ${windRes.status}`);
    console.log(`Recovery Time: ${windRes.recoveryTime?.toFixed(1)} hours`);

    console.log("\n--- Predicting Case B: Heavy Snow (Depth 80cm) ---");
    const snowRes = await predictWithML(snowInput);
    console.log(`Status: ${snowRes.status}`);
    console.log(`Recovery Time: ${snowRes.recoveryTime?.toFixed(1)} hours`);

    console.log("\n--- Comparison ---");
    if ((snowRes.recoveryTime || 0) > (windRes.recoveryTime || 0)) {
        console.log("✅ RESULT: Snow causes LONGER recovery time than Wind.");
    } else {
        console.log("❌ RESULT: Snow does NOT cause longer recovery time.");
    }
}

verify();
