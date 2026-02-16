// JR北海道 運行情報取得
// 公式サイトのJSON APIから直接取得するように改善
import { logger } from './logger';
import { JRStatus } from './types';

// JR北海道公式JSON URL (エリア別)
const JR_JSON_URLS = [
    { id: '01', area: '札幌近郊' },
    { id: '02', area: '道央' },
    { id: '03', area: '道南' },
    { id: '04', area: '道北' },
    { id: '05', area: '道東' }
];

const BASE_URL = 'https://www3.jrhokkaido.co.jp/webunkou/json/area/area_';

// 路線名と判定キーワード
interface RouteDefinition {
    name: string;
    keywords: string[];
    routeId: string;
    validAreas?: string[]; // 🆕 エリアフィルタ (01:札幌, 02:道央, 03:道南, 04:道北, 05:道東)
}

const ROUTE_DEFINITIONS: RouteDefinition[] = [
    // 札幌圏・道央
    {
        name: '千歳線',
        keywords: ['千歳線', 'エアポート', '新千歳空港'],
        routeId: 'jr-hokkaido.chitose',
        validAreas: ['01', '02']
    },
    {
        name: '函館本線',
        keywords: ['函館線', '函館本線', '小樽', '岩見沢', '滝川', 'ライラック', 'カムイ', '倶知安', 'ニセコ', '余市'], // 🆕 山線エリアの駅名を追加
        routeId: 'jr-hokkaido.hakodate-main',
        validAreas: ['01', '02', '04'] // 道南(03)は除外
    },
    {
        name: '学園都市線',
        keywords: ['学園都市線', '札沼線'],
        routeId: 'jr-hokkaido.gakuentoshi',
        validAreas: ['01']
    },
    {
        name: '室蘭本線',
        keywords: ['室蘭線', '室蘭本線', 'すずらん', '苫小牧', '東室蘭', '伊達紋別'],
        routeId: 'jr-hokkaido.muroran-main',
        validAreas: ['02', '03'] // 苫小牧(02)〜室蘭・長万部(03)
    },

    // 道南 (今回の修正対象)
    {
        name: '函館本線（道南）',
        keywords: ['函館線', '函館本線', '長万部', '函館', '新函館北斗', '北斗', '大沼'],
        routeId: 'jr-hokkaido.hakodate-south',
        validAreas: ['03'] // 03:道南 のみ
    },

    // 道北
    {
        name: '宗谷本線',
        keywords: ['宗谷線', '宗谷本線', '名寄', '稚内'],
        routeId: 'jr-hokkaido.soya-main',
        validAreas: ['04']
    },
    {
        name: '石北本線',
        keywords: ['石北線', '石北本線', '北見', '網走'],
        routeId: 'jr-hokkaido.sekihoku-main',
        validAreas: ['04', '05'] // 旭川(04)〜網走(05)
    },
    {
        name: '富良野線',
        keywords: ['富良野線'],
        routeId: 'jr-hokkaido.furano',
        validAreas: ['04']
    },
    {
        name: '留萌本線',
        keywords: ['留萌線', '留萌本線'],
        routeId: 'jr-hokkaido.rumoi',
        validAreas: ['04']
    },

    // 道東
    {
        name: '日高本線',
        keywords: ['日高線', '日高本線'],
        routeId: 'jr-hokkaido.hidaka',
        validAreas: ['02', '05'] // 苫小牧(02)〜様似(05)
    },
    {
        name: '石勝線',
        keywords: ['石勝線', 'おおぞら', 'とかち', '南千歳'],
        routeId: 'jr-hokkaido.sekisho',
        validAreas: ['02', '05']
    },
    {
        name: '根室本線',
        keywords: ['根室線', '根室本線', '帯広', '釧路'],
        routeId: 'jr-hokkaido.nemuro-main',
        validAreas: ['02', '04', '05'] // 🆕 04(道北/富良野エリア)を追加
    },
    {
        name: '釧網本線',
        keywords: ['釧網線', '釧網本線'],
        routeId: 'jr-hokkaido.senmo-main',
        validAreas: ['05']
    },
];

export interface JROperationStatus {
    routeId: string;
    routeName: string;
    status: JRStatus;
    statusText: string;
    cause?: string;
    affectedSection?: string;
    expectedRecovery?: string;
    updatedAt: string;
    rawText?: string; // 🆕 生の概況テキスト
    sourceArea?: string; // 🆕 情報取得元エリアID
}

/**
 * JR北海道の公式JSONから全路線の運行情報を取得
 */
export async function fetchJRHokkaidoStatus(): Promise<JROperationStatus[]> {
    const allItems: JROperationStatus[] = [];
    const now = new Date().toISOString();

    try {
        const results = await Promise.all(
            JR_JSON_URLS.map(async (area) => {
                try {
                    const res = await fetch(`${BASE_URL}${area.id}.json`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        cache: 'no-store'
                    });
                    if (!res.ok) return null;

                    const text = await res.text();
                    const cleanJson = text.replace(/^\uFEFF/, '');
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data = JSON.parse(cleanJson) as any;
                    return { area: area.area, id: area.id, data };
                } catch (e) {
                    logger.error(`Area ${area.area} fetch error:`, e);
                    return null;
                }
            })
        );

        for (const result of results) {
            if (!result || !result.data) continue;
            const { area, id: areaId, data } = result;

            // 概況テキストから運休・遅延を判定
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const gaikyoText = data.today?.gaikyo?.map((g: any) => g.honbun).join(' ') || '';
            const cleanGaikyo = gaikyoText.replace(/<[^>]*>/g, ' ');

            for (const route of ROUTE_DEFINITIONS) {
                // 🆕 エリアフィルタリング
                if (route.validAreas && !route.validAreas.includes(areaId)) {
                    continue;
                }

                let status: JRStatus = 'normal';
                let description = '平常運転';

                // キーワードが含まれているか
                const hasRouteMention = route.keywords.some(k => cleanGaikyo.includes(k));
                if (!hasRouteMention) continue;

                // 運休判定
                if (cleanGaikyo.includes('運休') || cleanGaikyo.includes('運転見合わせ') || cleanGaikyo.includes('運転見合せ')) {
                    status = 'suspended';
                    description = '運休・運転見合わせが発生しています';
                } else if (cleanGaikyo.includes('遅れ') || cleanGaikyo.includes('遅延')) {
                    status = 'delay';
                    description = '遅延が発生しています';
                }

                if (status !== 'normal') {
                    // 重複排除（複数のエリアにまたがる路線の対応）
                    const existing = allItems.find(i => i.routeId === route.routeId);
                    if (!existing || (status === 'suspended' && existing.status !== 'suspended')) {
                        if (existing) {
                            existing.status = status;
                            existing.statusText = description;
                            existing.rawText = cleanGaikyo; // 🆕
                            existing.sourceArea = `${area} (${areaId})`; // 🆕
                        } else {
                            allItems.push({
                                routeId: route.routeId,
                                routeName: route.name,
                                status,
                                statusText: description,
                                updatedAt: now,
                                rawText: cleanGaikyo, // 🆕
                                sourceArea: `${area} (${areaId})` // 🆕
                            });
                        }
                    }
                }
            }
        }

        // 何もなければ平常運転（JR北海道全体として）
        if (allItems.length === 0) {
            allItems.push({
                routeId: 'jr-hokkaido',
                routeName: 'JR北海道',
                status: 'normal',
                statusText: '概ね平常運転です',
                updatedAt: now
            });
        }

        return allItems;
    } catch (error) {
        logger.error('fetchJRHokkaidoStatus major error:', error);
        return getMockJRStatus(); // 最終的なフォールバック
    }
}

// モック運行情報
export function getMockJRStatus(): JROperationStatus[] {
    const now = new Date().toISOString();
    return [
        {
            routeId: 'jr-hokkaido.hakodate-main',
            routeName: '函館本線',
            status: 'normal',
            statusText: '平常運転',
            updatedAt: now,
        }
    ];
}

// 運行情報を予測に反映するための重み付け
export function getJRStatusWeight(status: JRStatus): number {
    switch (status) {
        case 'cancelled': return 100;
        case 'suspended': return 80;
        case 'delay': return 25; // 15 -> 25: 天候リスクと合わせて確実に遅延レベルへ
        default: return 0;
    }
}
