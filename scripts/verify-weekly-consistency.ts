
import { calculateWeeklyForecast } from '../lib/prediction-engine';
import { WeatherForecast } from '../lib/types';

// Use a fixed date for testing "Today"
const today = new Date();
const todayStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).format(today);

// Mock Weekly Weather (Today + 1 day)
const weeklyFood: WeatherForecast[] = [
    {
        date: todayStr,
        weather: 'Sunny',
        tempMax: 10,
        tempMin: 0,
        precipitation: 0,
        windSpeed: 2.0, // Mild
        snowfall: 0,
        windGust: 4.0,
        weatherCode: 0,
        windDirection: 0,
        pressure: 1013,
        warnings: [],
        surroundingHours: []
    },
    {
        date: '2099-12-31', // Future date
        weather: 'Sunny',
        tempMax: 10,
        tempMin: 0,
        precipitation: 0,
        windSpeed: 2.0,
        snowfall: 0,
        windGust: 4.0,
        weatherCode: 0,
        windDirection: 0,
        pressure: 1013,
        warnings: [],
        surroundingHours: []
    }
];

// Mock JR Status (Suspended)
const jrStatus = {
    status: 'suspended' as const,
    statusText: '終日運休',
    rawText: '終日運休',
    updatedAt: new Date().toISOString()
};

console.log(`--- Test: Weekly Forecast Consistency (Today=${todayStr}) ---`);
const results = calculateWeeklyForecast(
    'jr-hokkaido.test',
    'Test Line',
    weeklyFood,
    jrStatus,
    null,
    null,
    null
);

const todayResult = results[0];
console.log(`Today's Risk: ${todayResult.probability}%`);
console.log(`Today's Status: ${todayResult.status}`);
console.log(`Is Currently Suspended: ${todayResult.isCurrentlySuspended}`);

if (todayResult.probability === 100 && todayResult.isCurrentlySuspended) {
    console.log('✅ Success: Today\'s weekly forecast is locked to 100% due to suspension.');
} else {
    console.log('❌ Failed: Today\'s weekly forecast did not reflect suspension.');
    console.log('Expected: 100%, Got:', todayResult.probability);
    process.exit(1);
}
