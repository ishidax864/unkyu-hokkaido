/**
 * 予測の確率と実際の結果を比較し、0-100のスコアを計算する
 * @param probability 予測された運休確率 (0-100)
 * @param actualStatus クローラーから取得した実際の結果
 * @returns 的中スコア (0-100)
 */
export function calculateAccuracyScore(probability: number, actualStatus: string): number {
    const isSuspendedOutcome = (actualStatus === 'suspended' || actualStatus === 'stopped' || actualStatus === 'partial_suspended');
    const isNormalOutcome = (actualStatus === 'normal');
    const isDelayedOutcome = (actualStatus === 'delayed');

    let score = 0;

    if (isSuspendedOutcome) {
        // 運休した場合: 確率が高いほど高スコア、30%以下なら大幅減点
        if (probability >= 50) score = 100;
        else if (probability >= 30) score = 70 + (probability - 30) * 1.5;
        else score = 20;
    } else if (isNormalOutcome) {
        // 平常だった場合: 確率が低いほど高スコア
        if (probability <= 20) score = 100;
        else if (probability <= 50) score = 100 - (probability - 20) * 2;
        else score = 10;
    } else if (isDelayedOutcome) {
        // 遅延だった場合: 30-70% 程度の予測が最も適切
        if (probability >= 30 && probability <= 70) score = 100;
        else if (probability < 30) score = 50 + probability;
        else score = 80; // 高すぎても完全否定はしない
    } else {
        score = 50;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
}
