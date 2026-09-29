-- Run against a disposable database or through a single transaction-capable
-- connection. The final ROLLBACK leaves no test users or clinical records.
begin;

insert into auth.users (id, instance_id, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select public.save_record(
  'patients', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","name":"Temporary test"}'::jsonb,
  1, 0
);

do $$
begin
  if (select count(*) from public.app_records where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1 then
    raise exception 'owner cannot read own record';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.app_records where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 0 then
    raise exception 'another user can read the record';
  end if;
  update public.app_records set updated_at = now() where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'another user can update the record'; end if;

  begin
    perform public.save_record(
      'patients', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","name":"Spoof"}'::jsonb,
      2, 1
    );
    raise exception 'another user can write through RPC';
  exception when serialization_failure then null;
  end;

  begin
    perform public.save_record(
      'wounds', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '{"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","patientId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'::jsonb,
      1, 0
    );
    raise exception 'another user can link an owner patient';
  exception when foreign_key_violation then null;
  end;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  begin
    perform public.save_record(
      'patients', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}'::jsonb,
      1, 0
    );
    raise exception 'anonymous role can execute save_record';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select 'owner_isolation_passed' as result;
rollback;
