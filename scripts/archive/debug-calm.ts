
import { calculateSuspensionRisk } from '../lib/prediction-engine';
import { evaluateRiskFactors } from '../lib/prediction-engine/helpers';
import { RISK_FACTORS, ROUTE_VULNERABILITY } from '../lib/prediction-engine/risk-factors';
import { PredictionInput, WeatherForecast } from '../lib/types';

// Mock Weather for Calm
const calmWeather: WeatherForecast = {
    date: '2025-02-01',
    weather: 'sunny',
    tempMax: 0,
    tempMin: -5,
    precipitation: 0,
    windSpeed: 3,
    windDirection: 270,
    snowfall: 0,
    snowDepth: 20,
    weatherCode: 3,
    warnings: [],
    targetTime: '18:00',
    snowDepthChange: 0
};

const input: PredictionInput = {
    routeId: 'jr-hokkaido.soya',
    routeName: 'Soya Line',
    targetDate: '2025-02-01',
    targetTime: '18:00',
    weather: calmWeather,
    jrStatus: null,
    crowdsourcedStatus: null
};

// Check Factors Manually
const vuln = ROUTE_VULNERABILITY['jr-hokkaido.soya'];
console.log(`Vulnerability:`, vuln);

console.log('--- Evaluating Risk Factors ---');
const result = evaluateRiskFactors(input, vuln, RISK_FACTORS);

console.log(`Total Score: ${result.totalScore}`);
console.log('Factors Triggered:');
result.reasonsWithPriority.forEach(r => {
    console.log(`- [Priority ${r.priority}] ${r.reason}`);
});

console.log('--- Full Calculation ---');
const fullResult = calculateSuspensionRisk(input);
console.log(`Final Probability: ${fullResult.probability}%`);
console.log(`Final Status: ${fullResult.status}`);
console.log(`Reasons:`, fullResult.reasons);
