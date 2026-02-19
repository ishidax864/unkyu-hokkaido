
// =====================
// 運休AI 型定義
// =====================

// 運行状況レベル
export type OperationStatus = '平常運転' | '遅延' | '運転見合わせ' | '運休' | '運休中' | 'normal' | 'delayed' | 'suspended' | 'cancelled';

// 予測信頼度
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// 天気影響度
export type WeatherImpact = 'なし' | '軽微' | '中程度' | '重大';

// 報告タイプ
export type ReportType = 'stopped' | 'delayed' | 'crowded' | 'normal' | 'resumed';

// JRステータス
export type JRStatus = 'normal' | 'delay' | 'suspended' | 'cancelled' | 'partial';

// 予測モード
export type PredictionMode = 'risk' | 'recovery';  // risk: 運休リスク予測, recovery: 復旧予測

// =====================
// 路線・駅情報
// =====================

export interface Route {
  id: string;
  name: string;
  company: string;
  region: string;
  color?: string;
}

export interface Station {
  id: string;
  name: string;
  kana: string;
  lines: string[];
  region: '道央' | '道北' | '道東' | '道南';
  isMajor?: boolean;
  lat?: number;
  lon?: number;
}

// =====================
// 気象情報
// =====================

export interface WeatherWarning {
  type: '暴風警報' | '大雨警報' | '大雪警報' | '暴風雪警報' | '暴風注意報' | '大雨注意報' | '大雪注意報' | '雷注意報';
  area: string;
  issuedAt: string;
}

export interface WeatherForecast {
  date: string;
  weather: string;
  temperature?: number; // 🆕 現在気温(時間単位用)
  tempMax: number;
  tempMin: number;
  precipitation: number;
  windSpeed: number;
  windDirection?: number; // 🆕 風向 (0-360)
  snowfall?: number;
  snowDepth?: number;
  snowDepthChange?: number; // 🆕 前時間からの積雪増加量(cm)
  windGust?: number;
  pressure?: number; // 🆕 気圧 (hPa)
  weatherCode?: number;
  warnings: WeatherWarning[];
  targetTime?: string; // HH:MM
  surroundingHours?: WeatherForecast[]; // 前後数時間の予報
}

// =====================
// 予測結果
// =====================

export interface PredictionResult {
  routeId: string;
  targetDate: string;
  probability: number;
  status: OperationStatus;
  confidence: ConfidenceLevel;
  level?: ConfidenceLevel; // API V2 compatibility
  reasons: string[];
  weatherImpact: WeatherImpact;
  updatedAt: string;
  aiReason?: string;  // AI生成の理由文

  // 🆕 時間帯別トレンド
  trend?: HourlyRiskData[];

  // 復旧予測モード用
  mode: PredictionMode;
  isCurrentlySuspended: boolean;
  estimatedRecoveryTime?: string;  // 例: "13:00頃", "18:30頃"
  estimatedRecoveryHours?: number | string; // 🆕 時間単位（0.5, 1, 3, 6, 12）または '終日運休'
  suspensionScale?: 'small' | 'medium' | 'large' | 'all-day'; // 🆕 運休規模（ユーザーへの直感的な伝達用）
  recoveryRecommendation?: string; // 🆕 代替手段提案メッセージ
  suspensionReason?: string;  // 運休の原因
  crowdStats?: {
    last15minReportCount: number;
    last15minStopped: number;
    last15minDelayed: number; // 🆕
    last15minCrowded: number; // 🆕
    last15minResumed: number;
  };
  comparisonData?: { // 🆕 For Route Comparison
    wind: number;
    snow: number;
  };
  isOfficialOverride?: boolean; // 🆕 公式情報によるオーバーライドかどうか
  isOfficialInfluenced?: boolean; // 🆕 クローラー等の公的情報が予測に影響を与えたか
  officialStatus?: {
    status: JRStatus;
    statusText?: string;
    updatedAt?: string;
    rawText?: string;
    sourceArea?: string;
  } | null; // 🆕 公式運行情報 (実データ)
}

// =====================
// 検索・入力
// =====================

export interface SearchInput {
  routeId: string;
  date: string;
  time: string;
}

export interface SearchParams {
  departureId: string;
  arrivalId: string;
  date: string;
  time: string;
}

// =====================
// API関連
// =====================

export interface APIResponse<T> {
  data?: T;
  error?: string;
  source?: 'api' | 'cache' | 'fallback';
}

export interface JRStatusResponse {
  items: JRStatusItem[];
  fetchedAt: string;
  source: string;
  hasAlerts: boolean;
}

export interface JRStatusItem {
  routeId?: string;
  routeName: string;
  status: JRStatus;
  description: string;
  statusText?: string; // 🆕 Added for consistency
  updatedAt: string;
  source: 'official' | 'rss' | 'mock';
  rawText?: string;
  sourceArea?: string; // 🆕
}

export interface AIReasonRequest {
  routeName: string;
  probability: number;
  factors: string[];
  weather?: {
    wind: number;
    snow: number;
    rain: number;
  };
}

export interface AIReasonResponse {
  reason: string;
  source: 'gemini' | 'cache' | 'fallback';
}

// =====================
// 外部API（ODPT等）
// =====================

export interface ODPTTrainInfo {
  id: string;
  operator: string;
  railway: string;
  trainInformationStatus?: string;
  trainInformationText?: string;
}

// =====================
// 予測エンジン内部型
// =====================

export interface PredictionInput {
  routeId: string;
  routeName: string;
  targetDate: string;
  targetTime?: string;
  weather: WeatherForecast | null;
  currentDelay?: boolean;
  jrStatus?: {
    status: JRStatus;
    statusText?: string;
    updatedAt?: string;
    rawText?: string; // 🆕
  } | null;
  crowdsourcedStatus?: {
    consensusStatus: ReportType | 'unknown';
    reportCount: number;
    last15minCounts?: {
      stopped: number;
      delayed: number;
      crowded: number;
      resumed: number;
      total: number;
    };
  } | null;
  historicalData?: {
    suspensionRate: number;
    avgSuspensionsPerWeek: number;
    recentTrend: 'increasing' | 'decreasing' | 'stable';
    totalReports: number;
  } | null;
  officialHistory?: {
    status: string;
    cause: string;
    date: string;
    time: string;
    details?: string;
    delay_minutes?: number;
    recovery_time?: string;
  }[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historicalMatch?: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timetableTrain?: any;
}

export interface RiskFactor {
  condition: (input: PredictionInput, vuln: VulnerabilityData) => boolean;
  weight: (input: PredictionInput, vuln: VulnerabilityData) => number;
  reason: (input: PredictionInput) => string;
  overrideWeight?: (input: PredictionInput, vuln: VulnerabilityData) => number | null; // 🆕 過去事例に基づく強制的な重み付け
  priority: number; // 表示優先度（低い方が上）
}

export interface VulnerabilityData {
  windThreshold: number;
  snowThreshold: number;
  vulnerabilityScore: number;
  description: string;
  hasDeerRisk?: boolean; // エゾシカ衝突リスクの高い路線か
  safeWindDirections?: number[][]; // 安全な風向範囲 [[min, max], ...]
}

// =====================
// ユーティリティ型
// =====================

// Partial but with required keys
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// =====================
// グラフ用データ型
// =====================

export interface HourlyRiskData {
  time: string;
  risk: number;
  weatherIcon: 'snow' | 'rain' | 'wind' | 'cloud' | 'sun';
  isTarget: boolean; // 検索対象の時刻かどうか
  isCurrent?: boolean; // isTargetと重複するが、明確化のため
}
