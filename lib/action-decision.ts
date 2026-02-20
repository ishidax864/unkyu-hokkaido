
import { PredictionResult } from './types';

export type ActionStatusType = 'CRITICAL' | 'HIGH_RISK' | 'CAUTION' | 'NORMAL';

export interface ActionDecision {
    type: ActionStatusType;
    title: string;
    message: string;
    bgColor: string;
    subColor: string;
    iconType: 'x-circle' | 'alert-triangle' | 'check-circle' | 'info';
    nextAction: string;
    resumptionEstimate?: string;
}

/**
 * ユーザーが「一発で判断できる」アクション決定を生成する。
 * 曖昧な「駅で確認してください」ではなく、具体的な行動を提示する。
 */
export function evaluateActionDecision(result: PredictionResult): ActionDecision {
    const recoveryTime = result.estimatedRecoveryTime;
    const recoveryLabel = result.isOfficialOverride ? '公式発表' : 'AI予測';

    // 0. POST-RECOVERY WINDOW: Target time is AFTER predicted recovery
    if (result.isPostRecoveryWindow) {
        const isHighRisk = result.probability >= 40;
        return {
            type: isHighRisk ? 'HIGH_RISK' : 'CAUTION',
            title: isHighRisk ? 'ダイヤ乱れ警戒' : 'ダイヤ乱れ注意',
            message: '運転再開後のため、遅延や一部運休が残る可能性があります',
            bgColor: isHighRisk ? 'bg-orange-500 text-white' : 'bg-amber-400 text-black',
            subColor: isHighRisk ? 'bg-orange-600' : 'bg-amber-500',
            iconType: isHighRisk ? 'alert-triangle' : 'info',
            nextAction: recoveryTime
                ? `${recoveryTime}に運転再開済みですが、ダイヤが乱れています。通常より1本早い列車を目指してください。`
                : 'ダイヤが乱れています。通常より1本早い列車に乗るか、代替手段をご検討ください。',
            resumptionEstimate: recoveryTime ? `【復旧済 / ${recoveryLabel}】${recoveryTime}` : undefined
        };
    }

    // 1. CRITICAL (Red): Very High Probability (>=80%) OR Official Suspension
    if (result.probability >= 80 ||
        result.status === 'suspended' ||
        result.status === 'cancelled' ||
        result.status === '運休' ||
        result.status === '運休中') {
        return {
            type: 'CRITICAL',
            title: '運転見合わせ中',
            message: (() => {
                if (result.suspensionReason) return `原因: ${result.suspensionReason}`;
                return '列車の運行が止まっています';
            })(),
            bgColor: 'bg-red-500 text-white',
            subColor: 'bg-red-600',
            iconType: 'x-circle',
            nextAction: (() => {
                if (recoveryTime?.includes('終日')) {
                    return '本日中の復旧は見込めません。バス・タクシー等の代替手段か、出発を翌日に変更してください。';
                }
                if (recoveryTime) {
                    return `【${recoveryLabel}】${recoveryTime}に運転再開見込みです。それまでカフェ等で待機するか、下記の代替ルートをご検討ください。`;
                }
                return '復旧の目処が立っていません。代替手段（バス・タクシー）をご検討ください。';
            })(),
            resumptionEstimate: (() => {
                if (!recoveryTime) return '復旧見込: 未定';
                return `【復旧見込 / ${recoveryLabel}】${recoveryTime}`;
            })()
        };
    }

    // 2. HIGH RISK (Orange): High Probability (50-79%) OR Partial Suspension
    if (result.probability >= 50 || result.isPartialSuspension) {
        return {
            type: 'HIGH_RISK',
            title: result.isPartialSuspension ? '一部区間で運休中' : '運休リスク高',
            message: result.isPartialSuspension
                ? '一部の列車が運休しています。運行中の列車で移動可能ですが、遅延の可能性があります'
                : '運休が発生する可能性が高い状況です',
            bgColor: 'bg-orange-500 text-white',
            subColor: 'bg-orange-600',
            iconType: 'alert-triangle',
            nextAction: (() => {
                if (result.isPartialSuspension && recoveryTime) {
                    return `【${recoveryLabel}】${recoveryTime}頃に通常ダイヤに戻る見込みです。急ぎの場合は代替手段をご検討ください。`;
                }
                if (result.isPartialSuspension) {
                    return '運行中の列車がありますが、大幅な遅延が予想されます。時間に余裕がない場合は、下記の代替ルートが確実です。';
                }
                return '1本早い列車に乗るか、代替手段の準備をおすすめします。こまめに運行状況を確認してください。';
            })(),
            resumptionEstimate: recoveryTime ? `【復旧見込 / ${recoveryLabel}】${recoveryTime}` : undefined
        };
    }

    // 3. CAUTION (Yellow): Medium Probability (20-49%) OR Chaos Flag
    if (result.isPostResumptionChaos || result.probability >= 20 || result.status === 'delayed' || result.status === '遅延') {
        return {
            type: 'CAUTION',
            title: result.isPostResumptionChaos ? 'ダイヤ乱れ中' : '遅延リスクあり',
            message: result.isPostResumptionChaos
                ? '運転再開後でダイヤが乱れています'
                : '遅延が発生する可能性があります。時間に余裕を持ってください',
            bgColor: 'bg-amber-400 text-black',
            subColor: 'bg-amber-500',
            iconType: 'info',
            nextAction: result.isPostResumptionChaos
                ? '列車は動いていますが、接続に遅れが出ています。乗り継ぎがある場合は1本前の列車をおすすめします。'
                : '通常通り利用できる見込みですが、10〜30分程度の遅れが出る場合があります。余裕を持って出発してください。',
            resumptionEstimate: recoveryTime ? `【再開済み】${recoveryTime}に運転再開` : undefined
        };
    }

    // 4. NORMAL (Green): Low Probability (<20%)
    return {
        type: 'NORMAL',
        title: '平常運転',
        message: '現時点では定刻通りの運行が見込まれます',
        bgColor: 'bg-emerald-500 text-white',
        subColor: 'bg-emerald-600',
        iconType: 'check-circle',
        nextAction: '通常通りご利用いただけます。天候の急変に備え、出発前にもう一度確認すると安心です。'
    };
}
