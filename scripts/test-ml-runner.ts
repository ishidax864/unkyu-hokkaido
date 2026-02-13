
import { predictWithML } from '../lib/prediction-engine/ml-runner';

async function test() {
    console.log("Testing ML Runner...");

    // Test Case 1: High Risk (Blizzard)
    const inputHigh = {
        routeId: 'jr-hokkaido.sekihoku',
        month: 2,
        windSpeed: 25, // Strong wind
        windDirection: 270, // West wind (Crosswind for some, but generic here)
        windGust: 35,
        snowfall: 10,   // Heavy snow
        snowDepth: 100,
        temperature: -10,
        pressure: 990,
        windChange: 5,
        pressureChange: -2
    };

    console.log("Input High Risk:", inputHigh);
    const resHigh = await predictWithML(inputHigh);
    console.log("Result High:", resHigh);

    // Test Case 2: Low Risk (Sunny)
    const inputLow = {
        routeId: 'jr-hokkaido.chitose',
        month: 5,
        windSpeed: 2,
        windDirection: 180, // South wind
        windGust: 5,
        snowfall: 0,
        snowDepth: 0,
        temperature: 15,
        pressure: 1015,
        windChange: 0,
        pressureChange: 0
    };

    console.log("\nInput Low Risk:", inputLow);
    const resLow = await predictWithML(inputLow);
    console.log("Result Low:", resLow);
}

test();
