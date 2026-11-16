-- The legacy ID column is bigint although crawler_logs.id is UUID.
-- Refuse conversion if any non-null legacy numeric links exist; never discard them.
do $$
begin
    if exists (select 1 from information_schema.columns where table_schema = 'public'
               and table_name = 'ml_training_data' and column_name = 'crawler_log_id' and data_type = 'bigint') then
        if exists (select 1 from public.ml_training_data where crawler_log_id is not null) then
            raise exception 'Review existing numeric crawler links before conversion';
        end if;
        alter table public.ml_training_data alter column crawler_log_id type uuid using crawler_log_id::text::uuid;
    end if;
end $$;
alter table public.crawler_logs add column if not exists weather_snapshot jsonb;
alter table public.crawler_logs add column if not exists collector_version text;
alter table public.crawler_logs add column if not exists source_url text;
create index if not exists ml_training_source_log on public.ml_training_data(crawler_log_id);
