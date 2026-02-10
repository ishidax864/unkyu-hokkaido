// 復旧時間予測アルゴリズム（時間単位）
import { WeatherForecast } from './types';

export interface RecoveryPrediction {
    estimatedHours: number; // 復旧までの推定時間（時間）
    estimatedTime: string; // 具体的な復旧時刻（例：「18:30頃」）
    confidence: 'high' | 'medium' | 'low';
    recommendation: 'wait' | 'monitor' | 'consider-alternative' | 'use-alternative';
    recommendationMessage: string;
    reasoning: string[];
}

export interface WeatherTrend {
    current: WeatherForecast;
    next3Hours: WeatherForecast[];
    windTrend: 'improving' | 'stable' | 'worsening';
    snowTrend: 'improving' | 'stable' | 'worsening';
}

// 天気トレンドを分析
export function analyzeWeatherTrend(
    current: WeatherForecast,
    forecast: WeatherForecast[]
): WeatherTrend {
    const next3Hours = forecast.slice(0, 3);

    if (next3Hours.length === 0) {
        return {
            current,
            next3Hours: [],
            windTrend: 'stable',
            snowTrend: 'stable',
        };
    }

    // 風速トレンド
    const avgCurrentWind = current.windSpeed;
    const avgFutureWind = next3Hours.reduce((sum, w) => sum + (w.windSpeed || 0), 0) / next3Hours.length;

    let windTrend: 'improving' | 'stable' | 'worsening';
    if (avgFutureWind < avgCurrentWind * 0.8) {
        windTrend = 'improving';
    } else if (avgFutureWind > avgCurrentWind * 1.2) {
        windTrend = 'worsening';
    } else {
        windTrend = 'stable';
    }

    // 積雪トレンド
    const currentSnow = current.snowfall || 0;
    const maxFutureSnow = Math.max(...next3Hours.map(w => w.snowfall || 0));

    let snowTrend: 'improving' | 'stable' | 'worsening';
    if (maxFutureSnow < currentSnow * 0.8) {
        snowTrend = 'improving';
    } else if (maxFutureSnow > currentSnow * 1.2) {
        snowTrend = 'worsening';
    } else {
        snowTrend = 'stable';
    }

    return {
        current,
        next3Hours,
        windTrend,
        snowTrend,
    };
}

// 時刻による補正（深夜は復旧が遅い、ラッシュ時は優先的に復旧）
function getTimeOfDayAdjustment(): number {
    const hour = new Date().getHours();

    // 深夜・早朝（0-5時）: +2時間（作業員確保が難しい）
    if (hour >= 0 && hour < 5) return 2;

    // 朝ラッシュ（7-9時）: -1時間（優先復旧）
    if (hour >= 7 && hour < 9) return -1;

    // 夕ラッシュ（17-19時）: -0.5時間（優先復旧）
    if (hour >= 17 && hour < 19) return -0.5;

    // その他: 補正なし
    return 0;
}

// 復旧時間を予測
export function predictRecoveryTime(
    weatherTrend: WeatherTrend,
    suspensionReason: string
): RecoveryPrediction {
    const current = weatherTrend.current;
    const wind = current.windSpeed || 0;
    const snow = current.snowfall || 0;
    const rain = current.precipitation || 0;

    let baseHours = 1; // デフォルト1時間
    const reasons: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'medium';

    // 基本的な復旧時間を算出

    // エゾシカ衝突（理由テキストから判定）
    if (suspensionReason.includes('シカ') || suspensionReason.includes('鹿')) {
        // 標準的な処理時間は1〜2時間
        baseHours = 1.5;
        reasons.push('エゾシカ衝突の場合、車両点検と安全確認に通常1〜2時間を要します');

        // 深夜・早朝はさらに時間がかかる傾向
        const hour = new Date().getHours();
        if (hour >= 20 || hour <= 5) {
            baseHours += 1.0;
            reasons.push('夜間帯のため、現場確認に時間を要する可能性があります');
        }
        confidence = 'medium';
    }
    // 雪（降雪強度に基づく判定）
    else if (snow >= 5) { // 5cm/h以上（猛烈な雪）
        baseHours = 6;
        reasons.push(`猛烈な雪（${snow}cm/h）のため、除雪作業が追いつかず長時間の運休が予想されます`);
        confidence = 'high';
    } else if (snow >= 3) { // 3cm/h以上（強い雪）
        baseHours = 3;
        reasons.push(`強い雪（${snow}cm/h）により、断続的な除雪作業が必要です`);
        confidence = 'medium';
    }
    // 風
    else if (wind >= 30) {
        baseHours = 6;
        reasons.push(`暴風（${wind}m/s）が収まるまで運転再開できません`);
        confidence = 'high';
    } else if (wind >= 25) {
        baseHours = 3;
        reasons.push(`強風（${wind}m/s）のため、風が弱まるのを待ってからの再開となります`);
        confidence = 'medium';
    }
    // 雨
    else if (rain >= 50) {
        baseHours = 4;
        reasons.push(`激しい雨（${rain}mm/h）による線路点検が必要です`);
        confidence = 'high';
    } else if (rain >= 30) {
        baseHours = 2;
        reasons.push(`大雨（${rain}mm/h）による規制値超過のため、安全確認が必要です`);
        confidence = 'low';
    }

    // その他の理由（デフォルト）
    else {
        // 理由が特定できないがリスクが高い場合
        if (wind >= 20 || snow >= 2) {
            baseHours = 1.5;
            reasons.push('気象条件によるダイヤ乱れが予想されます');
        }
    }

    // 天気トレンドによる補正
    if (weatherTrend.windTrend === 'improving' && weatherTrend.snowTrend === 'improving') {
        baseHours *= 0.7; // 30%短縮
        reasons.push('今後3時間で天候が回復傾向にあるため、早期復旧の可能性があります');
        if (confidence === 'low') confidence = 'medium';
    } else if (weatherTrend.windTrend === 'worsening' || weatherTrend.snowTrend === 'worsening') {
        baseHours *= 1.5; // 50%延長
        reasons.push('今後さらに天候が悪化する見込みのため、復旧が遅れる可能性があります');
        confidence = 'low';
    }

    // 時刻補正
    const timeAdjustment = getTimeOfDayAdjustment();
    baseHours += timeAdjustment;

    if (timeAdjustment > 0) {
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 5) {
            reasons.push('深夜・早朝のため、復旧作業に通常より時間がかかる見込みです');
        }
    } else if (timeAdjustment < 0) {
        reasons.push('ラッシュ時間帯のため、優先的に復旧作業が行われる見込みです');
    }

    // 最終的な復旧時間
    const estimatedHours = Math.max(0.5, Math.round(baseHours * 2) / 2); // 0.5時間刻み

    // 具体的な復旧時刻を計算
    const recoveryTime = new Date(Date.now() + estimatedHours * 60 * 60 * 1000);
    const estimatedTime = `${recoveryTime.getHours()}:${recoveryTime.getMinutes().toString().padStart(2, '0')}頃`;

    // 推奨アクション
    let recommendation: 'wait' | 'monitor' | 'consider-alternative' | 'use-alternative';
    let recommendationMessage: string;

    if (estimatedHours >= 12) {
        recommendation = 'use-alternative';
        recommendationMessage = '復旧まで12時間以上かかる見込みです。バスまたはレンタカーのご利用をおすすめします。';
    } else if (estimatedHours >= 6) {
        recommendation = 'consider-alternative';
        recommendationMessage = '復旧まで6時間以上かかる可能性があります。急ぎの場合は代替交通手段をご検討ください。';
    } else if (estimatedHours >= 3) {
        recommendation = 'monitor';
        recommendationMessage = '復旧まで数時間かかる見込みです。30分ごとにJR公式サイトを確認することをおすすめします。';
    } else if (estimatedHours >= 1) {
        recommendation = 'wait';
        recommendationMessage = '1〜3時間程度で復旧する見込みです。しばらくお待ちいただくか、次の運行情報をご確認ください。';
    } else {
        recommendation = 'wait';
        recommendationMessage = 'まもなく復旧する見込みです。JR公式サイトで最新情報をご確認ください。';
    }

    return {
        estimatedHours,
        estimatedTime,
        confidence,
        recommendation,
        recommendationMessage,
        reasoning: reasons,
    };
}

// Alias for compatibility
export const getRoutePrediction = predictRecoveryTime;
