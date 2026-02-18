-- Add numerical fields for ML data reinforcement
-- Table: route_status_history
ALTER TABLE route_status_history ADD COLUMN IF NOT EXISTS delay_minutes INTEGER;
ALTER TABLE route_status_history ADD COLUMN IF NOT EXISTS recovery_time TEXT;

-- Table: monitoring_logs
ALTER TABLE monitoring_logs ADD COLUMN IF NOT EXISTS delay_minutes INTEGER;
ALTER TABLE monitoring_logs ADD COLUMN IF NOT EXISTS recovery_time TEXT;

COMMENT ON COLUMN route_status_history.delay_minutes IS 'Extracted delay in minutes (ML feature)';
COMMENT ON COLUMN route_status_history.recovery_time IS 'Extracted expected recovery time HH:mm (ML feature)';
COMMENT ON COLUMN monitoring_logs.delay_minutes IS 'Extracted actual delay in minutes (Ground truth)';
COMMENT ON COLUMN monitoring_logs.recovery_time IS 'Extracted actual recovery time HH:mm (Ground truth)';
