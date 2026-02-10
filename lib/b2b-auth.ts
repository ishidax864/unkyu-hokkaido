import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 管理用キーを使用
);

/**
 * APIキーを検証し、パートナー情報を返す
 */
export async function validateApiKey(apiKey: string | null) {
    if (!apiKey) return { authorized: false, error: 'API key is required' };

    // キーの形式チェック (例: uk_abc123...)
    if (!apiKey.startsWith('uk_')) {
        return { authorized: false, error: 'Invalid API key format' };
    }

    // ハッシュ化して比較 (DBにはハッシュを保存)
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const { data, error } = await supabase
        .from('api_keys')
        .select('id, partner_id, is_active, rate_limit_per_min, partners(*)')
        .eq('key_hash', keyHash)
        .single();

    if (error || !data) {
        return { authorized: false, error: 'Invalid API key' };
    }

    if (!data.is_active) {
        return { authorized: false, error: 'API key is inactive' };
    }

    // 使用履歴の更新 (非同期)
    supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id)
        .then();

    return {
        authorized: true,
        partner: data.partners as any,
        rateLimit: data.rate_limit_per_min
    };
}
