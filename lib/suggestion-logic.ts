import { PredictionResult, HourlyRiskData } from '@/lib/types';
import { getAffiliatesByType } from '@/lib/affiliates';

// アドバイスの型定義
export interface Advice {
    type: 'critical' | 'warning' | 'info' | 'alert';
    title: string;
    message: string;
    actionLink?: string;
    actionLabel?: string;
}

// 交通リスク情報の型定義
export interface TrafficRiskInfo {
    multiplier: number;
    warning: string | null;
}

// 代替手段のフィルタリング結果
export interface AlternativeAvailability {
    showSubways: boolean;
    showBuses: boolean;
    warningMessage: string | null;
}

/**
 * 予測結果に基づいて、戦略的なアドバイスを生成する
 */
export function generateStrategicAdvice(
    predictionResult: PredictionResult,
    futureRisks: HourlyRiskData[] = [],
    currentTimeShiftTime: string = '00:00' // timeShiftSuggestion.time
): Advice | null {
    const { probability, status, estimatedRecoveryHours } = predictionResult;
    const isSuspended = status === '運休' || status === '運休中' || status === '運転見合わせ' || estimatedRecoveryHours === '終日運休';

    // 未来のリスク評価 (今後3時間)
    // 時間シフト提案がある場合は、その時間以降のリスクを見る
    const futureHighRisk = futureRisks
        .filter(r => !r.isTarget && r.time > currentTimeShiftTime)
        .slice(0, 3)
        .some(r => r.risk >= 50);

    // 1. 運休中の場合
    if (isSuspended) {
        // "終日運休" という文字列が入っている場合
        if (estimatedRecoveryHours === '終日運休') {
            return {
                type: 'alert',
                title: '移動手段の変更を検討してください',
                message: '本日の運転再開見込みはありません（終日運休）。代替ルートの利用を強くおすすめします。'
            };
        }

        const recoveryHours = typeof estimatedRecoveryHours === 'number' ? estimatedRecoveryHours : 0;

        // 短時間復旧見込みだが、その後も高リスクが続く場合
        if (futureHighRisk && recoveryHours > 0 && recoveryHours <= 2) {
            return {
                type: 'critical',
                title: '復旧しても再運休のリスク大',
                message: `一時的に運転再開する可能性がありますが、その後も悪天候（高リスク）が続く予報です。再運休に巻き込まれる前に、地下鉄やバスでの移動を強く推奨します。`
            };
        }

        if (recoveryHours >= 4) {
            return {
                type: 'critical',
                title: '長期戦の様相です',
                message: `復旧まで${recoveryHours}時間以上かかる見込みです。待たずに地下鉄やバスなど、動いている移動手段への切り替えを強く推奨します。`
            };
        } else if (recoveryHours > 0 && recoveryHours <= 4) {
            // 30分未満なら「少し待つ」
            if (recoveryHours < 0.5) {
                return {
                    type: 'info',
                    title: 'まもなく運転再開の見込み',
                    message: `30分程度で復旧する見込みです。移動手段を変えるより、駅構内で少し様子を見るのが賢明かもしれません。`
                };
            }

            // 30分〜4時間なら「カフェ」
            const cafeUrl = getAffiliatesByType('cafe')[0]?.webUrl;
            const recoveryTimeStr = recoveryHours < 1
                ? `${Math.round(recoveryHours * 60)}分後`
                : `${Math.round(recoveryHours * 10) / 10}時間後`;

            return {
                type: 'warning',
                title: '運転再開までカフェで待機',
                message: `${recoveryTimeStr}くらいに解消する見込みです。寒い駅で待つより、近くのカフェで暖を取ることをおすすめします。`,
                actionLink: cafeUrl,
                actionLabel: '駅周辺のカフェを探す'
            };
        } else {
            // recoveryHours不明 または 0
            return {
                type: 'alert',
                title: '移動手段の変更を検討してください',
                message: '運転再開の目処が立っていません。代替ルートの利用をおすすめします。'
            };
        }
    }

    // 2. 運行中だがリスクが高い場合 (50%以上)
    if (probability >= 70) {
        // 今後もずっと高リスクなら「移動延期」も視野に
        const persistentRisk = futureRisks.slice(0, 3).every(r => r.risk >= 70);
        const recoveryHours = typeof estimatedRecoveryHours === 'number' ? estimatedRecoveryHours : 0;
        const longSuspensionRisk = recoveryHours >= 4;

        return {
            type: 'critical',
            title: '運休リスクが非常に高いです',
            message: (longSuspensionRisk || persistentRisk)
                ? `まもなく運転見合わせになる見込みです。悪天候が長時間続く予報のため、今のうちに移動手段を変更するか、移動自体の延期を検討してください。`
                : 'まもなく運転見合わせになる見込みです。今のうちに地下鉄などの代替手段で移動するか、移動自体の延期を検討してください。'
        };
    } else if (probability >= 50) {
        // 遅延・部分運休リスク
        const recoveryHours = typeof estimatedRecoveryHours === 'number' ? estimatedRecoveryHours : 0;
        const shortSuspensionLikely = recoveryHours > 0 && recoveryHours <= 2;

        if (shortSuspensionLikely) {
            const cafeUrl = getAffiliatesByType('cafe')[0]?.webUrl;
            return {
                type: 'warning',
                title: '短時間の運休・遅延に注意',
                message: `天候が悪化していますが、${Math.round(recoveryHours * 10) / 10}時間程度で回復する可能性があります。駅周辺のカフェ等で少し様子を見るのも手です。`,
                actionLink: cafeUrl,
                actionLabel: '駅周辺のカフェを探す'
            };
        }

        return {
            type: 'warning',
            title: '遅延や急な運休に注意',
            message: '天候が悪化しています。「1本早い列車に乗る」など、早めの行動を心がけてください。余裕があれば地下鉄利用が確実です。'
        };
    } else if (probability >= 30) {
        return {
            type: 'info',
            title: '遅延見込み',
            message: '多少の遅れが発生する見込みです。時間に余裕を持って行動してください。'
        };
    }

    return null;
}

/**
 * 道路交通（バス・タクシー）のリスクと警告メッセージを計算
 */
export function calculateTrafficRisk(predictionResult: PredictionResult): TrafficRiskInfo {
    const { reasons } = predictionResult;
    const reasonsText = reasons.join('');
    let multiplier = 1;

    if (reasonsText.includes('猛烈な雪') || reasonsText.includes('40cm')) {
        multiplier = 2.0; // 猛吹雪は倍かかる
    } else if (reasons.some(r => r.includes('雪') && !r.includes('小雪'))) {
        multiplier = 1.5; // 普通の雪でも1.5倍
    } else if (reasonsText.includes('路面凍結')) {
        multiplier = 1.3;
    }

    const warning = multiplier > 1.0
        ? `雪道のため、バス・タクシーも通常より時間 (${multiplier}倍程度) がかかる恐れがあります`
        : null;

    return { multiplier, warning };
}

/**
 * 代替手段（地下鉄・バス）の利用可能性を判定
 */
export function checkAlternativeAvailability(
    routeId: string,
    predictionResult: PredictionResult | undefined,
    hasSpecificAlternatives: boolean,
    isSapporoArea: boolean
): AlternativeAvailability {
    if (hasSpecificAlternatives) {
        // 具体的な推奨ルートがある場合の判定
        const reasons = predictionResult?.reasons.join('') || '';
        const isHeavySnow = reasons.includes('猛烈な雪') || reasons.includes('積雪40cm');
        const isStorm = reasons.includes('暴風') || reasons.includes('風速30m/s');

        return {
            showSubways: false, // UnifiedAlternativesCardに任せるためfalse
            showBuses: false,   // UnifiedAlternativesCardに任せるためfalse
            warningMessage: isHeavySnow
                ? '猛烈な雪のため、バスやタクシーも大幅な遅延・運休の可能性があります'
                : isStorm
                    ? '暴風のため、徒歩移動は危険です'
                    : null
        };
    }

    // 汎用的な判定
    const reasons = predictionResult?.reasons.join('') || '';
    const isHeavySnow = reasons.includes('猛烈な雪') || reasons.includes('積雪40cm');
    const isStorm = reasons.includes('暴風') || reasons.includes('風速30m/s');

    return {
        showSubways: isSapporoArea,
        showBuses: !isHeavySnow,
        warningMessage: isHeavySnow
            ? '猛烈な雪のため、バスやタクシーも大幅な遅延・運休の可能性があります'
            : isStorm
                ? '暴風のため、徒歩移動は危険です'
                : null
    };
}

/**
 * 汎用的な地下鉄提案を表示すべきか判定
 * 条件: 出発・到着ともに地下鉄エリア、かつSpecific推奨に含まれていない
 */
export function shouldShowGenericSubway(
    hasDepSubway: boolean,
    hasArrSubway: boolean,
    hasSpecificSubway: boolean
): boolean {
    if (!hasDepSubway) return false;
    if (hasSpecificSubway) return false; // 重複防止
    if (hasArrSubway) return true; // 到着地も地下鉄エリアならOK

    // 将来的には「札幌駅発」などの特例を追加可能
    return false;
}

/**
 * 復旧時間と現在時刻から、表示用メッセージを生成
 */
export function getRecoveryMessage(recoveryHours: number, currentTimeStr: string): string {
    const currentHour = parseInt(currentTimeStr.split(':')[0]);
    const remainingHours = 24 - currentHour;

    if (recoveryHours >= remainingHours || recoveryHours > 10) {
        return '終日運休の恐れあり';
    } else if (recoveryHours > 0) {
        const h = Math.round(recoveryHours);
        return `${h}時間後に運転再開の見込み`;
    } else {
        return 'まもなく運転再開の見込み';
    }
}
