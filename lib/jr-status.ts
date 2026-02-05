// JR北海道 運行情報取得
// 公式サイトからの運行情報をパース

export interface JROperationStatus {
    routeId: string;
    routeName: string;
    status: 'normal' | 'delay' | 'suspended' | 'cancelled';
    statusText: string;
    cause?: string;
    affectedSection?: string;
    expectedRecovery?: string;
    updatedAt: string;
}

// JR北海道の運行情報URL
const JR_HOKKAIDO_STATUS_URL = 'https://www.jrhokkaido.co.jp/';

// 路線IDとの対応マップ
const ROUTE_NAME_MAP: Record<string, string> = {
    '函館本線': 'jr-hokkaido.hakodate-main',
    '千歳線': 'jr-hokkaido.chitose',
    '札沼線': 'jr-hokkaido.gakuentoshi',
    '室蘭本線': 'jr-hokkaido.muroran',
    '石北本線': 'jr-hokkaido.sekihoku',
    '宗谷本線': 'jr-hokkaido.soya',
    '根室本線': 'jr-hokkaido.nemuro',
    '釧網本線': 'jr-hokkaido.senmo',
    '日高本線': 'jr-hokkaido.hidaka',
    '富良野線': 'jr-hokkaido.furano',
};

// ステータス文字列のパース
function parseStatusText(text: string): 'normal' | 'delay' | 'suspended' | 'cancelled' {
    if (text.includes('運休') || text.includes('終日運休')) return 'cancelled';
    if (text.includes('見合わせ') || text.includes('見合せ')) return 'suspended';
    if (text.includes('遅延') || text.includes('遅れ')) return 'delay';
    return 'normal';
}

// JR北海道の公式情報をフェッチ（サーバーサイドでのみ使用）
export async function fetchJRHokkaidoStatus(): Promise<JROperationStatus[]> {
    try {
        // 注意: CORSの制約があるため、本番環境ではAPI Routeを通す必要がある
        // ここではモックデータを返す
        return getMockJRStatus();
    } catch (error) {
        console.error('Failed to fetch JR Hokkaido status:', error);
        return getMockJRStatus();
    }
}

// モック運行情報（実際のAPIが使えない場合のフォールバック）
export function getMockJRStatus(): JROperationStatus[] {
    const now = new Date().toISOString();

    // ランダムに一部の路線に遅延・運休を設定
    const statuses: JROperationStatus[] = [
        {
            routeId: 'jr-hokkaido.hakodate-main',
            routeName: '函館本線',
            status: 'normal',
            statusText: '平常運転',
            updatedAt: now,
        },
        {
            routeId: 'jr-hokkaido.chitose',
            routeName: '千歳線',
            status: 'normal',
            statusText: '平常運転',
            updatedAt: now,
        },
        {
            routeId: 'jr-hokkaido.gakuentoshi',
            routeName: '学園都市線',
            status: 'normal',
            statusText: '平常運転',
            updatedAt: now,
        },
        {
            routeId: 'jr-hokkaido.muroran',
            routeName: '室蘭本線',
            status: 'normal',
            statusText: '平常運転',
            updatedAt: now,
        },
    ];

    // 天候による影響をシミュレート（冬季の北海道らしく）
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 9) {
        // 朝のラッシュ時は遅延が発生しやすい
        statuses[1] = {
            ...statuses[1],
            status: 'delay',
            statusText: '5〜10分程度の遅れ',
            cause: '信号確認のため',
        };
    }

    return statuses;
}

// 路線IDからJR運行情報を取得
export function getJRStatusByRouteId(
    statuses: JROperationStatus[],
    routeId: string
): JROperationStatus | null {
    return statuses.find(s => s.routeId === routeId) || null;
}

// 運行情報を予測に反映するための重み付け
export function getStatusWeight(status: JROperationStatus): number {
    switch (status.status) {
        case 'cancelled': return 100;  // 運休中なら100%
        case 'suspended': return 80;   // 見合わせ中なら80%
        case 'delay': return 15;       // 遅延中なら+15%
        default: return 0;
    }
}
