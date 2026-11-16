-- Public readers use /api/community, which never returns sender hashes.
-- Only the server service role can access this table directly.
create table if not exists public.user_reports (
    id uuid primary key default gen_random_uuid(),
    route_id text not null,
    report_type text not null check (report_type in ('normal', 'stopped', 'delayed', 'crowded')),
    comment text check (char_length(comment) <= 500),
    ip_hash text not null check (char_length(ip_hash) = 64),
    created_at timestamptz not null default now()
);
create index if not exists user_reports_route_recent on public.user_reports(route_id, created_at desc);
create index if not exists user_reports_sender_recent on public.user_reports(ip_hash, created_at desc);
alter table public.user_reports enable row level security;
revoke all on public.user_reports from anon, authenticated;
grant select, insert on public.user_reports to service_role;

-- Serialize checks per sender so simultaneous requests cannot bypass the limit.
create or replace function public.guard_user_report_rate() returns trigger
language plpgsql set search_path = public as $$
begin
    perform pg_advisory_xact_lock(hashtextextended(new.ip_hash, 0));
    if exists (select 1 from public.user_reports where ip_hash = new.ip_hash
               and created_at > now() - interval '1 minute') then
        raise exception 'Too many reports';
    end if;
    new.created_at := now();
    return new;
end;
$$;
drop trigger if exists user_report_rate on public.user_reports;
create trigger user_report_rate before insert on public.user_reports
for each row execute function public.guard_user_report_rate();
