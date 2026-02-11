/**
 * 予測エンジン用の定数定義
 * マジックナンバーを集約し、メンテナンス性を向上
 */

// =====================
// 確率計算の上限値
// =====================

/** 天気予報のみの場合の予測確率上限（公式情報なし） */
export const MAX_PREDICTION_WITHOUT_OFFICIAL_DATA = 85;

/** JR公式で運休・見合わせ確認済みの場合の上限 */
export const MAX_PREDICTION_WITH_CANCELLATION = 100;

/** JR公式で遅延確認済みの場合の上限 */
export const MAX_PREDICTION_WITH_DELAY = 90;

/** ユーザー報告で運休コンセンサスがある場合の上限 */
export const MAX_PREDICTION_WITH_USER_CONSENSUS = 95;

// =====================
// 冬季リスク設定
// =====================

/** 冬季ベースリスクの最小値（%） */
export const MIN_WINTER_RISK = 5;

/** 冬季ベースリスク計算の係数 */
export const WINTER_RISK_COEFFICIENT = 3;

/** 冬季判定の開始月（11月） */
export const WINTER_START_MONTH = 11;

/** 冬季判定の終了月（3月） */
export const WINTER_END_MONTH = 3;

/** 冬季の最低リスク表示閾値 */
export const WINTER_MIN_DISPLAY_THRESHOLD = 8;

// =====================
// 複合リスク設定
// =====================

/** 複合リスク発動の閾値（風速・積雪が閾値の何%以上で発動） */
export const COMPOUND_RISK_THRESHOLD = 0.7;

/** 複合リスク基本加算値（風速・積雪の両方が閾値70%以上） */
export const COMPOUND_RISK_BASE_SCORE = 20;

/** 複合リスク追加加算値（両方が閾値100%以上） */
export const COMPOUND_RISK_BONUS_SCORE = 25;

/** 複合リスク乗数（デサイシブスコアリング用） */
export const COMPOUND_RISK_MULTIPLIER = 1.5;

// =====================
// 風速関連の閾値
// =====================

/** 軽い風の最小値（m/s） */
export const LIGHT_WIND_MIN = 5;

/** 軽い風の最大値（m/s） */
export const LIGHT_WIND_MAX = 10;

/** 軽い風のリスクスコア */
export const LIGHT_WIND_SCORE = 3;

/** やや強い風の最小値（m/s） (15 -> 13: 遅延検知のため感度向上) */
export const MODERATE_WIND_MIN = 13;

/** やや強い風の基本スコア (5 -> 10: 遅延見逃し防止) */
export const MODERATE_WIND_BASE_SCORE = 10;

/** やや強い風のスコア係数（m/s単位） (0.5 -> 1.5: 18m/sで遅延リスクを出すため) */
export const MODERATE_WIND_COEFFICIENT = 1.5;

/** 強風のベースリスクスコア（60 -> 50に引き下げて過剰反応を防ぐ） */
export const STRONG_WIND_BASE_SCORE = 50;

/** 強風の超過分係数（4 -> 3に引き下げ） */
export const STRONG_WIND_EXCESS_COEFFICIENT = 3;

/** 強風の最大追加スコア */
export const STRONG_WIND_MAX_BONUS = 40;

/** 瞬間風速の危険閾値（m/s） - JR北海道の「早め規制」基準に合わせる */
export const WIND_GUST_DANGER_THRESHOLD = 25;

/** 瞬間風速のベーススコア（重要度再評価：20に戻す） */
export const WIND_GUST_BASE_SCORE = 20;

/** 瞬間風速の最大追加スコア */
export const WIND_GUST_MAX_BONUS = 25;

/** 安全な風向の場合のリスク軽減係数 */
export const SAFE_WIND_DIRECTION_MULTIPLIER = 0.3;


// =====================
// 積雪関連の閾値（時間降雪量 cm/h）
// =====================

/** 軽い積雪の最小値（cm/h）- ちらつく程度 */
export const LIGHT_SNOW_MIN = 0.5;

/** 軽い積雪の最大値（cm/h）- 2cm/hあれば遅延リスクが出始める */
export const LIGHT_SNOW_MAX = 2;

/** 軽い積雪のリスクスコア */
export const LIGHT_SNOW_SCORE = 5;

/** 中程度の積雪の最小値（cm/h） */
export const MODERATE_SNOW_MIN = 2;

/** 中程度の積雪の基本スコア (15 -> 25) */
export const MODERATE_SNOW_BASE_SCORE = 25;

/** 中程度の積雪のスコア係数（cm単位） (10 -> 15) */
export const MODERATE_SNOW_COEFFICIENT = 15;

/** 大雪（閾値以上）のベースリスクスコア (60 -> 65) */
export const HEAVY_SNOW_BASE_SCORE = 65;

/** 大雪の超過分係数（1cm/h増えるごとに加算） */
export const HEAVY_SNOW_EXCESS_COEFFICIENT = 10;

/** 大雪の最大追加スコア */
export const HEAVY_SNOW_MAX_BONUS = 30;

/** 運休判定用の大雪閾値（cm） */
export const SUSPENSION_SNOW_THRESHOLD = 15;

// =====================
// 積雪深（累積）関連の閾値 🆕
// =====================

/** 中程度の積雪深（cm） - 遅延リスク (30 -> 15) */
export const MODERATE_SNOW_DEPTH_THRESHOLD = 15;

/** 中程度の積雪深スコア (13 -> 20) */
export const MODERATE_SNOW_DEPTH_SCORE = 20;

/** 危険な積雪深（cm） - 運休リスク (80 -> 40) */
export const CRITICAL_SNOW_DEPTH_THRESHOLD = 40;

/** 危険な積雪深スコア (40 -> 50) */
export const CRITICAL_SNOW_DEPTH_SCORE = 50;

/** 地吹雪（吹き溜まり）リスクの風速閾値（m/s） */
export const SNOW_DRIFT_WIND_THRESHOLD = 10;


// =====================
// 降水量関連の閾値
// =====================

/** 中程度の雨の最小値（mm） */
export const MODERATE_RAIN_MIN = 10;

/** 中程度の雨の最大値（mm） */
export const MODERATE_RAIN_MAX = 30;

/** 降雪量リスクの基本スコア */
export const SNOWFALL_BASE_SCORE = 2;

/** 中程度の雨の基本スコア */
export const MODERATE_RAIN_BASE_SCORE = 5;

/** 中程度の雨のスコア係数 */
export const MODERATE_RAIN_COEFFICIENT = 0.4;

/** 大雨の閾値（mm） */
export const HEAVY_RAIN_THRESHOLD = 30;

/** 大雨のベーススコア */
export const HEAVY_RAIN_BASE_SCORE = 25;

/** 大雨の超過分係数 */
export const HEAVY_RAIN_EXCESS_COEFFICIENT = 0.5;

/** 大雨の最大追加スコア */
export const HEAVY_RAIN_MAX_BONUS = 20;

// =====================
// 警報のリスクスコア
// =====================

/** 暴風警報のリスクスコア */
export const STORM_WARNING_SCORE = 80;

/** 大雪警報のリスクスコア */
export const HEAVY_SNOW_WARNING_SCORE = 70;

/** 大雨警報のリスクスコア */
export const HEAVY_RAIN_WARNING_SCORE = 60;

/** 雷注意報のリスクスコア */
export const THUNDER_ADVISORY_SCORE = 10;

// =====================
// ユーザー報告関連
// =====================

/** ユーザー報告の最小信頼件数 */
export const MIN_USER_REPORT_COUNT = 3;

/** ユーザー報告で運休の場合のベーススコア */
export const USER_REPORT_STOPPED_SCORE = 35;

/** ユーザー報告で遅延の場合のベーススコア */
export const USER_REPORT_DELAYED_SCORE = 20;

/** ユーザー報告で混雑の場合のベーススコア */
export const USER_REPORT_CROWDED_SCORE = 10;

/** ユーザー報告の件数ボーナス係数 */
export const USER_REPORT_COUNT_BONUS_COEFFICIENT = 2;

/** ユーザー報告の最大ボーナススコア */
export const USER_REPORT_MAX_BONUS = 15;

/** ユーザー報告で運休コンセンサスの最小件数 */
export const USER_CONSENSUS_MIN_REPORTS = 5;

// =====================
// 履歴データ関連
// =====================

/** 履歴データの重み（全体に対する割合） */
export const HISTORICAL_DATA_WEIGHT = 0.25;

/** 運休増加傾向の場合の追加スコア */
export const TREND_INCREASING_BONUS = 3;

/** 運休減少傾向の場合の減算スコア */
export const TREND_DECREASING_PENALTY = 2;

/** 履歴データ表示の最小運休率（%） */
export const HISTORICAL_DISPLAY_MIN_RATE = 20;

// =====================
// 表示制限
// =====================

/** 最大表示理由数 */
export const MAX_DISPLAY_REASONS = 5;

// =====================
// 確率と状態の対応
// =====================

/** 運休判定の最小確率（%）- ユーザー要望により厳格化 (80 -> 70: 大規模検証に基づき微調整) */
export const STATUS_CANCELLED_THRESHOLD = 70;

/** 運転見合わせ判定の最小確率（%） (75 -> 65) */
export const STATUS_SUSPENDED_THRESHOLD = 65;

/** 遅延判定の最小確率（%） (30 -> 25) */
export const STATUS_DELAYED_THRESHOLD = 25;

// =====================
// 天候影響レベルの閾値
// =====================

/** 重大な天候影響の閾値（%） */
export const WEATHER_IMPACT_SEVERE_THRESHOLD = 60;

/** 中程度の天候影響の閾値（%） */
export const WEATHER_IMPACT_MODERATE_THRESHOLD = 30;

/** 軽微な天候影響の閾値（%） */
export const WEATHER_IMPACT_MINOR_THRESHOLD = 10;

// =====================
// 信頼度判定
// =====================

/** 高信頼度の最小要因数 */
export const HIGH_CONFIDENCE_MIN_FACTORS = 3;

/** 高信頼度の最小確率（%） */
export const HIGH_CONFIDENCE_MIN_PROBABILITY = 60;

/** 中信頼度の最小要因数 */
export const MEDIUM_CONFIDENCE_MIN_FACTORS = 1;

/** 中信頼度の最小確率（%） */
export const MEDIUM_CONFIDENCE_MIN_PROBABILITY = 30;

/** リアルタイムデータがある場合の信頼度向上の最小要因数 */
export const REALTIME_DATA_MIN_FACTORS = 2;
