-- Supabase テーブル定義
-- Supabase Dashboard > SQL Editor で実行

-- ユーザー報告テーブル
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('stopped', 'delayed', 'crowded', 'normal')),
    comment TEXT,
    ip_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_reports_route_id ON user_reports(route_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_user_reports_route_created ON user_reports(route_id, created_at DESC);

-- RLS（Row Level Security）を有効化
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーは挿入のみ許可
CREATE POLICY "Allow anonymous insert" ON user_reports
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- 匿名ユーザーは直近24時間のデータのみ読み取り可能
CREATE POLICY "Allow read recent reports" ON user_reports
    FOR SELECT
    TO anon
    USING (created_at >= NOW() - INTERVAL '24 hours');

-- 予測履歴テーブル
CREATE TABLE IF NOT EXISTS prediction_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id TEXT NOT NULL,
    route_name TEXT NOT NULL,
    probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100),
    status TEXT NOT NULL,
    weather_factors TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_prediction_history_route_id ON prediction_history(route_id);
CREATE INDEX IF NOT EXISTS idx_prediction_history_created_at ON prediction_history(created_at);

-- RLS
ALTER TABLE prediction_history ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーは挿入のみ
CREATE POLICY "Allow anonymous insert predictions" ON prediction_history
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- 古いデータの自動削除（30日以上前）
-- 注意: この関数はSupabase Edge Functionsまたはcronジョブで定期実行
CREATE OR REPLACE FUNCTION cleanup_old_reports()
RETURNS void AS $$
BEGIN
    DELETE FROM user_reports WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM prediction_history WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- スパム防止: 同一IPからの連続投稿を制限
CREATE OR REPLACE FUNCTION check_spam_report()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM user_reports
        WHERE ip_hash = NEW.ip_hash
        AND route_id = NEW.route_id
        AND created_at > NOW() - INTERVAL '5 minutes'
    ) THEN
        RAISE EXCEPTION 'Too many reports from same source';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_spam_reports
    BEFORE INSERT ON user_reports
    FOR EACH ROW
    EXECUTE FUNCTION check_spam_report();
