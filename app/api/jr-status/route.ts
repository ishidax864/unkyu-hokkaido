import { NextResponse } from 'next/server';

// JR北海道運行情報の型定義
export interface JRStatusItem {
    routeName: string;
    status: 'normal' | 'delay' | 'suspended' | 'partial';
    description: string;
    updatedAt: string;
    source: 'official' | 'mock';
    area?: string;  // どのエリアから取得したか
}

export interface JRStatusResponse {
    items: JRStatusItem[];
    fetchedAt: string;
    source: string;
    hasAlerts: boolean;
}

// キャッシュ（3分間有効）
let cachedStatus: JRStatusResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3 * 60 * 1000;

// JR北海道公式ページURL（各エリア）
const JR_AREA_URLS: Record<string, { url: string; routes: string[] }> = {
    '札幌近郊': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_spo.html',
        routes: ['千歳線', '函館本線', '学園都市線'],
    },
    '道央': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_doo.html',
        routes: ['室蘭本線', '日高本線'],
    },
    '道北': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_dohoku.html',
        routes: ['宗谷本線', '石北本線'],
    },
    '道東': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_doto.html',
        routes: ['根室本線', '釧網本線', '石勝線'],
    },
    '道南': {
        url: 'https://www3.jrhokkaido.co.jp/webunkou/area_donan.html',
        routes: ['函館本線（道南）'],
    },
};

// 路線名とキーワードのマッピング
const ROUTE_KEYWORDS: Record<string, string[]> = {
    '千歳線': ['千歳線', 'エアポート', '快速エアポート', '新千歳空港', '空港'],
    '函館本線': ['函館本線', '函館線', 'ライラック', 'カムイ'],
    '学園都市線': ['学園都市線', '札沼線'],
    '室蘭本線': ['室蘭本線', '室蘭線', 'すずらん'],
    '日高本線': ['日高本線', '日高線'],
    '宗谷本線': ['宗谷本線', '宗谷線', 'サロベツ', '稚内'],
    '石北本線': ['石北本線', '石北線', 'オホーツク', '大雪'],
    '根室本線': ['根室本線', '根室線', 'おおぞら', '帯広', '釧路'],
    '釧網本線': ['釧網本線', '釧網線'],
    '石勝線': ['石勝線', 'おおぞら', 'とかち'],
    '函館本線（道南）': ['函館', '長万部', '小樽'],
};

// 1つのエリアをスクレイピング
async function fetchAreaStatus(areaName: string, areaInfo: { url: string; routes: string[] }): Promise<JRStatusItem[]> {
    const items: JRStatusItem[] = [];
    const now = new Date().toISOString();

    try {
        const response = await fetch(areaInfo.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; UnkyuAI/1.0)',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'ja',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`[${areaName}] fetch failed: ${response.status}`);
            return [];
        }

        const html = await response.text();
        const textContent = html
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ');

        // 運休・遅延キーワード
        const suspensionKeywords = ['運休', '見合わせ', '見合せ', '終日運休', '全区間運休', '部分運休'];

        // このエリアに運休があるか
        const hasSuspension = suspensionKeywords.some(k => textContent.includes(k));
        const hasDelay = /遅[れ延]|約\d+分/.test(textContent);

        // このエリアの各路線をチェック
        for (const routeName of areaInfo.routes) {
            const keywords = ROUTE_KEYWORDS[routeName] || [routeName];
            let routeStatus: 'normal' | 'delay' | 'suspended' = 'normal';
            let description = '平常運転';

            for (const keyword of keywords) {
                const keywordIndex = textContent.indexOf(keyword);
                if (keywordIndex === -1) continue;

                // 運休チェック（200文字以内に運休ワードがあるか）
                for (const suspension of suspensionKeywords) {
                    const suspIdx = textContent.indexOf(suspension);
                    if (suspIdx !== -1 && Math.abs(keywordIndex - suspIdx) < 200) {
                        routeStatus = 'suspended';
                        description = '運休・運転見合わせ中';
                        break;
                    }
                }
                if (routeStatus === 'suspended') break;

                // 遅延チェック
                const nearby = textContent.substring(
                    Math.max(0, keywordIndex - 100),
                    Math.min(textContent.length, keywordIndex + 100)
                );
                if (/遅[れ延]|約\d+分/.test(nearby)) {
                    routeStatus = 'delay';
                    description = '遅延が発生しています';
                }
            }

            // 🔧 削除: エリア全体の誤検知を防ぐため、明示的な記述がある場合のみ運休とする
            // 以前のロジック: エリアに運休があり、路線名が含まれていれば全て運休扱い
            // → これが原因で全路線が運休になっていた

            if (routeStatus !== 'normal') {
                items.push({
                    routeName,
                    status: routeStatus,
                    description,
                    updatedAt: now,
                    source: 'official',
                    area: areaName,
                });
            }
        }

        // 🔧 削除: エリア全体のステータス報告を無効化
        // 個別の路線ステータスのみを報告することで誤検知を防ぐ
        // 以前: エリアに「運休」という文字があれば、エリア全体を運休扱い
        // → これが全路線を運休にしていた原因

        // if (hasSuspension) {
        //     items.push({
        //         routeName: `JR北海道（${areaName}）`,
        //         status: 'suspended',
        //         description: `${areaName}エリアで運休が発生しています`,
        //         updatedAt: now,
        //         source: 'official',
        //         area: areaName,
        //     });
        // } else if (hasDelay) {
        //     items.push({
        //         routeName: `JR北海道（${areaName}）`,
        //         status: 'delay',
        //         description: `${areaName}エリアで遅延が発生しています`,
        //         updatedAt: now,
        //         source: 'official',
        //         area: areaName,
        //     });
        // }

        return items;
    } catch (error) {
        console.error(`[${areaName}] error:`, error);
        return [];
    }
}

// 全エリアをスクレイピング
async function fetchAllAreas(): Promise<JRStatusItem[]> {
    const allItems: JRStatusItem[] = [];

    // 並列で全エリアを取得
    const results = await Promise.all(
        Object.entries(JR_AREA_URLS).map(([areaName, areaInfo]) =>
            fetchAreaStatus(areaName, areaInfo)
        )
    );

    for (const items of results) {
        allItems.push(...items);
    }

    // 全体の統合ステータス
    const hasSuspendedRoutes = allItems.some(i => i.status === 'suspended');
    const hasDelayedRoutes = allItems.some(i => i.status === 'delay');

    if (hasSuspendedRoutes) {
        allItems.push({
            routeName: 'JR北海道',
            status: 'suspended',
            description: '一部路線で運休が発生しています',
            updatedAt: new Date().toISOString(),
            source: 'official',
        });
    } else if (hasDelayedRoutes) {
        allItems.push({
            routeName: 'JR北海道',
            status: 'delay',
            description: '一部路線で遅延が発生しています',
            updatedAt: new Date().toISOString(),
            source: 'official',
        });
    }

    return allItems;
}

export async function GET() {
    // キャッシュチェック
    if (cachedStatus && Date.now() - cacheTimestamp < CACHE_TTL) {
        return NextResponse.json(cachedStatus);
    }

    let items: JRStatusItem[] = [];

    try {
        items = await fetchAllAreas();
    } catch (error) {
        console.error('JR fetch failed:', error);
    }

    const hasAlerts = items.some(i => i.status !== 'normal');

    // データがなければ平常運転
    if (items.length === 0) {
        items = [{
            routeName: 'JR北海道',
            status: 'normal',
            description: '概ね平常運転です',
            updatedAt: new Date().toISOString(),
            source: 'official',
        }];
    }

    const response: JRStatusResponse = {
        items,
        fetchedAt: new Date().toISOString(),
        source: 'official',
        hasAlerts,
    };

    // キャッシュ更新
    cachedStatus = response;
    cacheTimestamp = Date.now();

    return NextResponse.json(response, {
        headers: {
            'Cache-Control': 'public, max-age=180',
        },
    });
}
