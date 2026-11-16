-- Run against a prepared database. Everything below is rolled back.
begin;
set local role anon;
do $$
declare statement text;
begin
  foreach statement in array array[
    'select id from public.ml_training_data limit 1',
    'insert into public.ml_training_data(area_id,route_id) values (''validation'',''validation'')',
    'update public.ml_training_data set route_id=route_id where id=-1',
    'delete from public.ml_training_data where id=-1'
  ] loop
    begin
      execute statement;
      raise exception 'Expected insufficient_privilege: %', statement;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;
set local role authenticated;
do $$
declare statement text;
begin
  foreach statement in array array[
    'select id from public.ml_training_data limit 1',
    'insert into public.ml_training_data(area_id,route_id) values (''validation'',''validation'')',
    'update public.ml_training_data set route_id=route_id where id=-1',
    'delete from public.ml_training_data where id=-1'
  ] loop
    begin
      execute statement;
      raise exception 'Expected insufficient_privilege: %', statement;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;
set local role service_role;
do $$
declare saved_id bigint;
begin
  insert into public.ml_training_data(area_id,route_id,status_details) values ('validation','validation','transactional-access-validation-20261012') returning id into saved_id;
  if not exists(select 1 from public.ml_training_data where id=saved_id) then raise exception 'Service read failed'; end if;
end;
$$;
rollback;
select jsonb_build_object('access_checks_passed',true,'test_rows_remaining',(select count(*) from public.ml_training_data where status_details='transactional-access-validation-20261012'),'rows',(select count(*) from public.ml_training_data));
