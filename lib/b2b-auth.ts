import { getAdminSupabaseClient } from '@/lib/repos/client';
import { createHash } from 'crypto';

/**
 * APIキーを検証し、パートナー情報を返す
 */
export async function validateApiKey(apiKey: string | null) {
    if (!apiKey) return { authorized: false, error: 'API key is required' };

    // キーの形式チェック (例: uk_abc123...)
    if (!apiKey.startsWith('uk_')) {
        return { authorized: false, error: 'Invalid API key format' };
    }

    const supabase = getAdminSupabaseClient();
    if (!supabase) {
        return { authorized: false, error: 'Database not configured' };
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

    // 使用履歴の更新 (非同期、失敗しても無視)
    void supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

    return {
        authorized: true,
        partner: (data.partners as unknown) as { name: string;[key: string]: unknown } | null,
        rateLimit: data.rate_limit_per_min
    };
}
