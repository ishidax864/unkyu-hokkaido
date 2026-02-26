-- 列車別レポート対応: train_id カラム追加
-- 既存の路線レベル報告はtrain_id=NULLで引き続き動作

ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS train_id TEXT;

-- 列車別集計用インデックス
CREATE INDEX IF NOT EXISTS idx_user_reports_train_id
    ON user_reports(route_id, train_id, created_at DESC);
