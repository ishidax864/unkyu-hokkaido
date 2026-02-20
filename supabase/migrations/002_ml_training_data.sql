-- Add content_hash to crawler_logs for deduplication
ALTER TABLE crawler_logs ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_crawler_logs_hash ON crawler_logs(area_id, content_hash);

-- ML Training Data Table
-- 天気 + 運行状態の時系列データセット
-- 用途: 高精度予測のための機械学習、企業向けデータ提供

CREATE TABLE IF NOT EXISTS ml_training_data (
    id BIGSERIAL PRIMARY KEY,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    area_id TEXT NOT NULL,
    route_id TEXT NOT NULL,
    
    -- ラベル（予測対象）
    train_status TEXT NOT NULL DEFAULT 'normal',  -- normal / delayed / suspended
    delay_minutes INTEGER,
    recovery_time TEXT,       -- 再開見込み時刻 (HH:mm)
    cause TEXT,               -- snow / wind / rain / weather
    status_details TEXT,      -- 生の概況テキスト
    
    -- 入力特徴量（天気）
    temperature REAL,         -- 気温 (°C)
    wind_speed REAL,          -- 風速 (km/h)
    wind_gust REAL,           -- 瞬間最大風速 (km/h)
    snowfall REAL,            -- 降雪量 (cm)
    precipitation REAL,       -- 降水量 (mm)
    snow_depth REAL,          -- 積雪深 (cm)
    weather_code INTEGER,     -- WMO天気コード
    wind_direction REAL,      -- 風向 (°)
    pressure_msl REAL,        -- 海面気圧 (hPa)
    visibility REAL,          -- 視程 (m)
    
    -- 時間特徴量
    month INTEGER,
    hour INTEGER,
    day_of_week INTEGER,      -- 0=日, 1=月, ..., 6=土
    
    -- 参照
    crawler_log_id BIGINT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ml_route_date 
    ON ml_training_data(route_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_ml_status 
    ON ml_training_data(train_status);
CREATE INDEX IF NOT EXISTS idx_ml_area_date 
    ON ml_training_data(area_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_ml_cause
    ON ml_training_data(cause);
CREATE INDEX IF NOT EXISTS idx_ml_month_hour
    ON ml_training_data(month, hour);
