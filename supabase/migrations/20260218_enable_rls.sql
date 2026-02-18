-- Enable RLS for crawler_logs
ALTER TABLE crawler_logs ENABLE ROW LEVEL SECURITY;

-- Crawler logs: No public access allowed (Service role / Admin only)
-- No policy needed for service_role as it bypasses RLS by default.
-- Explicitly denying anon access by NOT adding a policy for anon.


-- Enable RLS for route_status_history
ALTER TABLE route_status_history ENABLE ROW LEVEL SECURITY;

-- Route status history: Public read access
CREATE POLICY "Allow public read access" ON route_status_history
    FOR SELECT
    TO anon
    USING (true);

-- Route status history: Write access restricted to service_role only (no anon policy)
