import { NextResponse } from 'next/server';

// Gemini Flash API設定
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// キャッシュ（30分間有効）
const reasonCache = new Map<string, { reason: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

interface ReasonRequest {
    routeName: string;
    probability: number;
    factors: string[];
    weather?: {
        wind: number;
        snow: number;
        rain: number;
    };
}

// プロンプトテンプレート
function buildPrompt(req: ReasonRequest): string {
    return `あなたはJR北海道の運行情報を分析する専門家です。
以下の情報に基づき、運休リスクの理由を日本語で簡潔に説明してください。

路線: ${req.routeName}
運休確率: ${req.probability}%
検出された要因:
${req.factors.map(f => `- ${f}`).join('\n')}

${req.weather ? `気象情報:
- 風速: ${req.weather.wind}m/s
- 積雪: ${req.weather.snow}cm
- 降水量: ${req.weather.rain}mm` : ''}

【指示】
- 50文字以内で簡潔に
- 専門用語は避ける
- 乗客への影響を含める
- 「です・ます」調で`;
}

// キャッシュキー生成
function getCacheKey(req: ReasonRequest): string {
    return `${req.routeName}-${req.probability}-${req.factors.join(',')}`;
}

// フォールバック理由生成（AI不使用）
function generateFallbackReason(req: ReasonRequest): string {
    if (req.probability >= 70) {
        return `${req.factors[0] || '悪天候'}のため、運休の可能性が高くなっています。`;
    }
    if (req.probability >= 50) {
        return `${req.factors[0] || '気象条件'}により、運転見合わせの可能性があります。`;
    }
    if (req.probability >= 20) {
        return `${req.factors[0] || '天候'}の影響で遅延が発生する可能性があります。`;
    }
    return '現在、運行に支障をきたす要因は検出されていません。';
}

export async function POST(request: Request) {
    try {
        const body: ReasonRequest = await request.json();

        // バリデーション
        if (!body.routeName || typeof body.probability !== 'number') {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        // キャッシュチェック
        const cacheKey = getCacheKey(body);
        const cached = reasonCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({
                reason: cached.reason,
                source: 'cache',
            });
        }

        // API キーチェック
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // APIキーがなければフォールバック
            const fallbackReason = generateFallbackReason(body);
            return NextResponse.json({
                reason: fallbackReason,
                source: 'fallback',
            });
        }

        // Gemini API呼び出し
        const prompt = buildPrompt(body);
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    maxOutputTokens: 100,
                    temperature: 0.3,
                }
            }),
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status);
            const fallbackReason = generateFallbackReason(body);
            return NextResponse.json({
                reason: fallbackReason,
                source: 'fallback',
            });
        }

        const data = await response.json();
        const aiReason = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            || generateFallbackReason(body);

        // キャッシュに保存
        reasonCache.set(cacheKey, {
            reason: aiReason,
            timestamp: Date.now(),
        });

        return NextResponse.json({
            reason: aiReason,
            source: 'gemini',
        });
    } catch (error) {
        console.error('AI reason generation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
