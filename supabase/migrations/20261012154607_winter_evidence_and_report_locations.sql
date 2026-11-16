-- Additive changes only. Existing reports and training observations stay intact.
alter table public.verified_recovery_incidents add column if not exists storm_id text;
alter table public.user_reports add column if not exists station_id text;
alter table public.user_reports add column if not exists direction_station_id text;
comment on column public.verified_recovery_incidents.storm_id is 'Reviewed independent weather event; null is excluded from empirical recovery estimates.';
comment on column public.user_reports.station_id is 'User-selected station ID; never inferred from geolocation.';
comment on column public.user_reports.direction_station_id is 'User-selected destination direction on the reported line.';
