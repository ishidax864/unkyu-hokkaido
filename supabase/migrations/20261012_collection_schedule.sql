-- Collection runs in Supabase, independent of the web host's daily cron limit.
-- The secret is generated in Vault and never embedded in code or cron text.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table if not exists public.rail_collection_runs (
 id uuid primary key default gen_random_uuid(),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null check (status in ('running','success','error')),
 summary jsonb
);
alter table public.rail_collection_runs enable row level security;
revoke all on public.rail_collection_runs from anon, authenticated;
grant select, insert, update on public.rail_collection_runs to service_role;
create index if not exists rail_runs_latest on public.rail_collection_runs(started_at desc);
do $$ begin
 if not exists(select 1 from vault.secrets where name='rail_collector_secret') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'rail_collector_secret','Private scheduled rail collector authentication');
 end if;
end $$;
create or replace function public.claim_rail_collection(provided_secret text) returns text
language plpgsql security definer set search_path='' as $$
declare expected_secret text; new_id uuid;
begin
 select decrypted_secret into expected_secret from vault.decrypted_secrets where name='rail_collector_secret';
 if expected_secret is null or provided_secret is null or
    extensions.digest(provided_secret,'sha256') <> extensions.digest(expected_secret,'sha256') then
  return 'unauthorized';
 end if;
 perform pg_advisory_xact_lock(718419326);
 if exists(select 1 from public.rail_collection_runs where started_at>now()-interval '10 minutes') then
  return 'busy';
 end if;
 insert into public.rail_collection_runs(status) values('running') returning id into new_id;
 return new_id::text;
end $$;
revoke all on function public.claim_rail_collection(text) from public, anon, authenticated;
grant execute on function public.claim_rail_collection(text) to service_role;
-- The application host is fixed to this project's own endpoint. No public invoker RPC.
select cron.schedule('rail-observations-every-15-minutes','*/15 * * * *', $job$
 select net.http_post(
  url:='https://odbrttexoreltltojodn.supabase.co/functions/v1/collect-rail',
  headers:=jsonb_build_object('Content-Type','application/json','x-collector-key',
   (select decrypted_secret from vault.decrypted_secrets where name='rail_collector_secret')),
  body:='{}'::jsonb, timeout_milliseconds:=55000
 );
$job$);
