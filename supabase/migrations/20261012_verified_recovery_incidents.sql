-- No legacy expected recovery times are backfilled as actual outcomes.
-- Review against archived official notices before setting verified = true.
create table if not exists public.verified_recovery_incidents (
    id uuid primary key default gen_random_uuid(),
    route_id text not null,
    cause text not null,
    started_at timestamptz not null,
    resumed_at timestamptz,
    start_source_url text not null,
    resumption_source_url text,
    verified boolean not null default false,
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    unique(route_id, started_at),
    check (resumed_at is null or resumed_at > started_at),
    check (not verified or verified_at is not null),
    check (not verified or resumed_at is null or resumption_source_url is not null)
);
create index if not exists verified_recovery_route on public.verified_recovery_incidents(route_id, started_at desc);
alter table public.verified_recovery_incidents enable row level security;
-- Read and verification writes are server/service-role only.
