/**
 * 天気アイコン取得（標準版）
 * @param weather 天気文字列（例: "雪", "雨", "晴れ"）
 * @returns 絵文字アイコン
 */
export function getWeatherIcon(weather: string): string {
    if (!weather) return '☀️';
    if (weather.includes('吹雪') || weather.includes('大雪')) return '🌨️';
    if (weather.includes('雪')) return '❄️';
    if (weather.includes('豪雨') || weather.includes('大雨')) return '⛈️';
    if (weather.includes('雨')) return '🌧️';
    if (weather.includes('曇')) return '☁️';
    if (weather.includes('風')) return '💨';
    return '☀️';
}
