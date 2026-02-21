
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
 * 状況に応じた12パターン以上のきめ細かい行動提案を行う。
 */
export function evaluateActionDecision(result: PredictionResult): ActionDecision {
    const recoveryTime = result.estimatedRecoveryTime;
    const recoveryLabel = result.isOfficialOverride ? '公式発表' : 'AI予測';
    const recoveryHours = typeof result.estimatedRecoveryHours === 'number'
        ? result.estimatedRecoveryHours
        : undefined;

    // ユーザー報告によるコンテキスト追加
    const crowd = result.crowdStats;
    let crowdPrefix = '';
    if (crowd) {
        if (crowd.last15minStopped >= 3) {
            crowdPrefix = `⚡ ユーザー${crowd.last15minStopped}人が「止まっている」と報告。`;
        } else if (crowd.last15minDelayed >= 3) {
            crowdPrefix = `⚡ ユーザー${crowd.last15minDelayed}人が「遅延」を報告。`;
        }
    }

    const withCrowd = (text: string) => crowdPrefix ? `${crowdPrefix}${text}` : text;

    // ─── 0. POST-RECOVERY WINDOW ───
    if (result.isPostRecoveryWindow) {
        // 復旧から1時間以上経過
        if (recoveryHours !== undefined && recoveryHours >= 1) {
            return {
                type: 'CAUTION',
                title: 'ほぼ通常ダイヤに回復',
                message: '運転再開からしばらく経過し、ダイヤは正常に戻りつつあります',
                bgColor: 'bg-amber-400 text-black',
                subColor: 'bg-amber-500',
                iconType: 'info',
                nextAction: withCrowd('通常通りご利用いただけますが、一部の列車に若干の遅れが残る可能性があります。時間に余裕を持って出発してください。'),
                resumptionEstimate: recoveryTime ? `【復旧済 / ${recoveryLabel}】${recoveryTime}` : undefined
            };
        }
        // 復旧直後
        const isHighRisk = result.probability >= 40;
        return {
            type: isHighRisk ? 'HIGH_RISK' : 'CAUTION',
            title: isHighRisk ? 'ダイヤ乱れ警戒' : 'ダイヤ乱れ注意',
            message: '運転再開直後のため、遅延や運休が残っています',
            bgColor: isHighRisk ? 'bg-orange-500 text-white' : 'bg-amber-400 text-black',
            subColor: isHighRisk ? 'bg-orange-600' : 'bg-amber-500',
            iconType: isHighRisk ? 'alert-triangle' : 'info',
            nextAction: withCrowd(
                recoveryTime
                    ? `${recoveryTime}に運転再開済みですが、ダイヤが乱れています。乗り継ぎがある場合は通常より1本早い列車を目指してください。`
                    : '列車は動いていますが接続に遅れが出ています。乗り継ぎがある場合は1本早い列車がおすすめです。'
            ),
            resumptionEstimate: recoveryTime ? `【復旧済 / ${recoveryLabel}】${recoveryTime}` : undefined
        };
    }

    // ─── 1. CRITICAL (≥80% or Official Suspension) ───
    if (result.probability >= 80 ||
        result.status === 'suspended' ||
        result.status === 'cancelled' ||
        result.status === '運休' ||
        result.status === '運休中') {

        const reasonMsg = result.suspensionReason ? `原因: ${result.suspensionReason}` : '列車の運行が止まっています';

        // 1a. 終日運休
        if (recoveryTime?.includes('終日')) {
            return {
                type: 'CRITICAL',
                title: '終日運休',
                message: reasonMsg,
                bgColor: 'bg-red-500 text-white',
                subColor: 'bg-red-600',
                iconType: 'x-circle',
                nextAction: withCrowd('本日中の復旧は見込めません。バス・タクシー等の代替手段で移動するか、予定を翌日へ変更してください。'),
                resumptionEstimate: `【${recoveryLabel}】終日運休`
            };
        }

        // 1b. 復旧30分以内
        if (recoveryHours !== undefined && recoveryHours <= 0.5) {
            return {
                type: 'CRITICAL',
                title: 'まもなく復旧見込み',
                message: reasonMsg,
                bgColor: 'bg-red-500 text-white',
                subColor: 'bg-red-600',
                iconType: 'x-circle',
                nextAction: withCrowd(`【${recoveryLabel}】${recoveryTime}頃に運転再開見込みです。駅の待合室やホームでお待ちいただくのが最も効率的です。`),
                resumptionEstimate: `【復旧見込 / ${recoveryLabel}】${recoveryTime}`
            };
        }

        // 1c. 復旧1〜2時間以内
        if (recoveryHours !== undefined && recoveryHours <= 2) {
            return {
                type: 'CRITICAL',
                title: '運転見合わせ中',
                message: reasonMsg,
                bgColor: 'bg-red-500 text-white',
                subColor: 'bg-red-600',
                iconType: 'x-circle',
                nextAction: withCrowd(`【${recoveryLabel}】${recoveryTime}頃に再開見込みです。近くのカフェや待合室で待機するか、急ぎの場合は代替ルートをご検討ください。`),
                resumptionEstimate: `【復旧見込 / ${recoveryLabel}】${recoveryTime}`
            };
        }

        // 1d. 復旧2時間以上 or 不明
        return {
            type: 'CRITICAL',
            title: '運転見合わせ中',
            message: reasonMsg,
            bgColor: 'bg-red-500 text-white',
            subColor: 'bg-red-600',
            iconType: 'x-circle',
            nextAction: withCrowd(
                recoveryTime
                    ? `【${recoveryLabel}】${recoveryTime}に運転再開見込みですが、長時間の待機が必要です。バス・タクシー等の代替手段をおすすめします。`
                    : '復旧の目処が立っていません。バス・タクシー等の代替手段をおすすめします。'
            ),
            resumptionEstimate: recoveryTime ? `【復旧見込 / ${recoveryLabel}】${recoveryTime}` : '復旧見込: 未定'
        };
    }

    // ─── 2. HIGH RISK (50-79%) or Partial Suspension ───
    if (result.probability >= 50 || result.isPartialSuspension) {

        // 2a. 部分運休 + 復旧見込あり
        if (result.isPartialSuspension && recoveryTime) {
            return {
                type: 'HIGH_RISK',
                title: '一部区間で運休中',
                message: '一部の列車が運休しています。運行中の便で移動は可能です',
                bgColor: 'bg-orange-500 text-white',
                subColor: 'bg-orange-600',
                iconType: 'alert-triangle',
                nextAction: withCrowd(`一部列車が動いています。【${recoveryLabel}】${recoveryTime}頃から通常ダイヤに戻る見込みです。時刻表通りでない可能性が高いので、余裕を持って駅へ向かってください。`),
                resumptionEstimate: `【復旧見込 / ${recoveryLabel}】${recoveryTime}`
            };
        }

        // 2b. 部分運休 + 復旧不明
        if (result.isPartialSuspension) {
            return {
                type: 'HIGH_RISK',
                title: '一部区間で運休中',
                message: '一部の列車が運休しており、大幅な遅延が予想されます',
                bgColor: 'bg-orange-500 text-white',
                subColor: 'bg-orange-600',
                iconType: 'alert-triangle',
                nextAction: withCrowd('運行中の列車がありますが時刻表通りではありません。時間に余裕がない場合は、代替ルート（バス・タクシー）が確実です。'),
                resumptionEstimate: undefined
            };
        }

        // 2c. 高リスク（部分運休ではない）
        return {
            type: 'HIGH_RISK',
            title: '運休リスク高',
            message: '運休が発生する可能性が高い状況です',
            bgColor: 'bg-orange-500 text-white',
            subColor: 'bg-orange-600',
            iconType: 'alert-triangle',
            nextAction: withCrowd('1本早い列車に乗ることを強くおすすめします。到着を急ぐ場合は、代替手段の準備もしておくと安心です。'),
            resumptionEstimate: recoveryTime ? `【復旧見込 / ${recoveryLabel}】${recoveryTime}` : undefined
        };
    }

    // ─── 3. CAUTION (20-49%) ───
    if (result.isPostResumptionChaos || result.probability >= 20 || result.status === 'delayed' || result.status === '遅延') {

        // 3a. 復旧後のダイヤ乱れ
        if (result.isPostResumptionChaos) {
            return {
                type: 'CAUTION',
                title: 'ダイヤ乱れ中',
                message: '運転再開後でダイヤが乱れています',
                bgColor: 'bg-amber-400 text-black',
                subColor: 'bg-amber-500',
                iconType: 'info',
                nextAction: withCrowd('列車は動いていますが、接続に遅れが出ています。乗り継ぎがある場合は1本前の列車がおすすめです。'),
                resumptionEstimate: recoveryTime ? `【再開済み】${recoveryTime}に運転再開` : undefined
            };
        }

        // 3b. 中リスク（30%以上）
        if (result.probability >= 30) {
            return {
                type: 'CAUTION',
                title: '遅延・運休に注意',
                message: '天候の影響で遅延や一部運休が発生する可能性があります',
                bgColor: 'bg-amber-400 text-black',
                subColor: 'bg-amber-500',
                iconType: 'info',
                nextAction: withCrowd('通常より1本早い列車に乗ることをおすすめします。出発前にもう一度運行状況を確認してください。'),
                resumptionEstimate: undefined
            };
        }

        // 3c. 低〜中リスク（20-29%）
        return {
            type: 'CAUTION',
            title: '遅延の可能性あり',
            message: '10〜30分程度の遅延が発生する可能性があります',
            bgColor: 'bg-amber-400 text-black',
            subColor: 'bg-amber-500',
            iconType: 'info',
            nextAction: withCrowd('通常通り利用できる見込みですが、余裕を持って出発してください。天候の急変に注意です。'),
            resumptionEstimate: undefined
        };
    }

    // ─── 4. NORMAL (<20%) ───

    // 4a. ごく低リスク（10-19%） — 念のため注意
    if (result.probability >= 10) {
        return {
            type: 'NORMAL',
            title: '平常運転',
            message: '通常通りの運行が見込まれます',
            bgColor: 'bg-emerald-500 text-white',
            subColor: 'bg-emerald-600',
            iconType: 'check-circle',
            nextAction: '通常通りご利用いただけます。天候の変化に備え、出発前にもう一度確認すると安心です。'
        };
    }

    // 4b. リスクなし（0-9%）
    return {
        type: 'NORMAL',
        title: '平常運転',
        message: '運休のリスクは非常に低く、安心してご利用いただけます',
        bgColor: 'bg-emerald-500 text-white',
        subColor: 'bg-emerald-600',
        iconType: 'check-circle',
        nextAction: '安心してご利用ください。快適な旅をお楽しみください！'
    };
}
