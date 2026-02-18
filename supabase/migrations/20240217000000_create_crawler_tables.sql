-- Create table for storing raw crawler logs
create table if not exists crawler_logs (
  id uuid default gen_random_uuid() primary key,
  fetched_at timestamptz default now() not null,
  area_id text not null, -- '01', '02', '03', '04', '05'
  raw_json jsonb not null,
  status text default 'success', -- 'success', 'error'
  error_message text
);

-- Create table for storing parsed route status history
create table if not exists route_status_history (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  time time not null,
  timestamp timestamptz generated always as (date + time) stored,
  route_id text not null, -- 'jr-hokkaido.chitose', etc.
  status text not null, -- 'normal', 'delayed', 'suspended', 'partial_suspended'
  cause text, -- 'snow', 'wind', 'blizzard', 'deer', 'human_accident', etc.
  details text, -- Raw details from JR text
  crawler_log_id uuid references crawler_logs(id),
  created_at timestamptz default now() not null
);

-- Indexes for efficient querying
create index if not exists idx_route_status_history_route_date on route_status_history(route_id, date);
create index if not exists idx_crawler_logs_fetched_at on crawler_logs(fetched_at);
