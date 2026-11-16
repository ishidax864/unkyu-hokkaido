-- Training evidence is internal. Browser clients must use the authenticated
-- /api/admin/ml-stats endpoint rather than reading raw rows with the anon key.
alter table public.ml_training_data enable row level security;
revoke all on table public.ml_training_data from public, anon, authenticated;
grant select, insert, update, delete on table public.ml_training_data to service_role;
do $$
declare sequence_name text;
begin
  sequence_name := pg_get_serial_sequence('public.ml_training_data', 'id');
  if sequence_name is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', sequence_name);
    execute format('grant usage, select on sequence %s to service_role', sequence_name);
  end if;
end;
$$;
-- No public policies: service_role is intentionally the only application reader/writer.
