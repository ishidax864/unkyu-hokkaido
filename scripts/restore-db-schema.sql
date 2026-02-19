-- Create prediction_history table
CREATE TABLE IF NOT EXISTS public.prediction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id TEXT NOT NULL,
    route_name TEXT NOT NULL,
    probability INTEGER NOT NULL,
    status TEXT NOT NULL,
    weather_factors TEXT[] DEFAULT '{}',
    is_official_influenced BOOLEAN DEFAULT FALSE,
    actual_status TEXT,
    accuracy_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and service_role to insert/select
CREATE POLICY "Allow service role all" ON public.prediction_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow public select" ON public.prediction_history FOR SELECT TO public USING (true);
