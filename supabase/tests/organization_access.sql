-- Uses the existing confirmed account only inside a rolled-back transaction.
-- No auth.users/auth.sessions changes and no clinical fixtures are retained.
begin;
create temporary table org_fixture as select
  (select id from auth.users where email_confirmed_at is not null order by created_at limit 1) user_id,
  gen_random_uuid() outsider, null::uuid org_id, null::uuid other_org,
  gen_random_uuid() patient,gen_random_uuid() wound,gen_random_uuid() visit,gen_random_uuid() photo_id,
  null::text invite_token;
create temporary table org_test_results(name text primary key);
grant select,update on org_fixture to authenticated;
grant select,insert on org_test_results to authenticated;
select set_config('request.jwt.claim.sub',(select user_id::text from org_fixture),true);
set local role authenticated;
do $$
declare f record; result jsonb; p jsonb; inv jsonb;
begin
  select * into f from pg_temp.org_fixture;
  result:=public.create_organization('Clínica sintética de teste',null,null);
  update pg_temp.org_fixture set org_id=(result->>'id')::uuid;
  select * into f from pg_temp.org_fixture;
  if result->>'role'<>'Administrador' or (result->>'patientsCount')::integer<>0 then raise exception 'new clinic not empty/admin'; end if;
  if public.get_organization_access(f.org_id)->>'status'<>'active' then raise exception 'active membership missing'; end if;
  insert into pg_temp.org_test_results values('clinic created empty with authenticated administrator');
  perform public.save_record('patients',f.patient,jsonb_build_object('id',f.patient,'organizationId',f.org_id,'name','Paciente sintético'),1,0);
  perform public.save_record('wounds',f.wound,jsonb_build_object('id',f.wound,'organizationId',f.org_id,'patientId',f.patient,'location','Local sintético'),1,0);
  p:=jsonb_build_object('id',f.visit,'organizationId',f.org_id,'patientId',f.patient,'woundId',f.wound,'state','Rascunho','date','2026-10-22','authorUserId',f.user_id,'photos','[]'::jsonb,'amendments','[]'::jsonb);
  perform public.save_record('visits',f.visit,p,1,0);
  if not exists(select 1 from public.pull_records(f.org_id,null,200) where id=f.visit) then raise exception 'group pull failed'; end if;
  if exists(select 1 from public.pull_records(null,null,200) where id=f.visit) then raise exception 'group leaked into individual'; end if;
  if (select count(*) from public.pull_records(f.org_id,null,1))<>1 then raise exception 'pagination failed'; end if;
  insert into pg_temp.org_test_results values('group roundtrip, individual separation and bounded pagination');
  p:=p||jsonb_build_object('state','Concluído','length','2','width','3','plan','Conduta sintética','completedAt',now(),'completedBy',jsonb_build_object('userId',f.user_id,'name','Profissional de teste','council','Conselho','registration','TESTE'));
  perform public.save_record('visits',f.visit,p,2,1);
  begin perform public.save_record('visits',f.visit,p||jsonb_build_object('plan','reescrito'),3,2); raise exception 'final group rewrite accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  p:=p||jsonb_build_object('amendments',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'text','Adendo sintético','createdAt',now(),'author',jsonb_build_object('userId',f.user_id,'name','Profissional de teste','council','Conselho','registration','TESTE'))));
  perform public.save_record('visits',f.visit,p,3,2);
  if (select count(*) from public.list_record_revisions(f.visit))<>3 then raise exception 'group revisions missing'; end if;
  if not exists(select 1 from public.list_activity_events(f.org_id) where action='visit_amend' and record_id=f.visit) then raise exception 'group audit missing'; end if;
  insert into pg_temp.org_test_results values('immutable completion, append-only amendment and group server audit');
  result:=public.create_organization('Outra clínica sintética',null,null); update pg_temp.org_fixture set other_org=(result->>'id')::uuid;
  begin
    p:=jsonb_build_object('id',gen_random_uuid(),'organizationId',result->>'id','patientId',f.patient,'location','Inválido');
    perform public.save_record('wounds',(p->>'id')::uuid,p,1,0); raise exception 'cross-clinic parent accepted' using errcode='XX000';
  exception when foreign_key_violation then null; end;
  begin perform public.save_record('patients',f.patient,jsonb_build_object('id',f.patient,'organizationId',result->>'id','name','Moved'),2,1); raise exception 'clinic reassignment accepted' using errcode='XX000'; exception when serialization_failure then null; end;
  begin perform public.set_organization_member(f.org_id,f.user_id,'Somente leitura','active'); raise exception 'last admin lost' using errcode='XX000'; exception when check_violation then null; end;
  insert into pg_temp.org_test_results values('cross-clinic references, context moves and last-admin removal rejected');
  inv:=public.create_organization_invitation(f.org_id,'Convidado sintético','different@example.invalid','Profissional');
  update pg_temp.org_fixture set invite_token=inv->>'token';
  if length(inv->>'token')<>64 then raise exception 'invalid secure token'; end if;
  begin perform public.accept_organization_invitation(inv->>'token'); raise exception 'wrong email accepted invitation' using errcode='XX000'; exception when invalid_parameter_value then null; end;
  perform public.revoke_organization_invitation((inv->>'id')::uuid);
  begin perform public.accept_organization_invitation(inv->>'token'); raise exception 'revoked invite accepted' using errcode='XX000'; exception when invalid_parameter_value then null; end;
  insert into pg_temp.org_test_results values('cryptographic email-bound invitation and revocation');
end;
$$;
reset role;
update public.organization_memberships set role='Assistente' where organization_id=(select org_id from org_fixture) and user_id=(select user_id from org_fixture);
set local role authenticated;
do $$
declare f record; p jsonb;
begin
  select * into f from pg_temp.org_fixture;
  perform public.save_record('patients',f.patient,jsonb_build_object('id',f.patient,'organizationId',f.org_id,'name','Cadastro atualizado pelo assistente'),2,1);
  p:=jsonb_build_object('id',gen_random_uuid(),'organizationId',f.org_id,'patientId',f.patient,'woundId',f.wound,'state','Rascunho');
  begin perform public.save_record('visits',(p->>'id')::uuid,p,1,0); raise exception 'assistant wrote clinical draft' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin perform public.create_organization_invitation(f.org_id,'Inválido','another@example.invalid','Administrador'); raise exception 'assistant managed members' using errcode='XX000'; exception when insufficient_privilege then null; end;
  insert into pg_temp.org_test_results values('assistant can register patients but cannot write clinical care or manage team');
end;
$$;
reset role;
update public.organization_memberships set role='Somente leitura' where organization_id=(select org_id from org_fixture) and user_id=(select user_id from org_fixture);
set local role authenticated;
do $$
declare f record;
begin
  select * into f from pg_temp.org_fixture;
  if not exists(select 1 from public.pull_records(f.org_id,null,200) where id=f.patient) then raise exception 'reader cannot read'; end if;
  begin perform public.save_record('patients',f.patient,jsonb_build_object('id',f.patient,'organizationId',f.org_id,'name','forged'),3,2); raise exception 'reader wrote' using errcode='XX000'; exception when insufficient_privilege then null; end;
  insert into pg_temp.org_test_results values('read-only member cannot mutate records');
end;
$$;
reset role;
update public.organization_memberships set status='suspended' where organization_id=(select org_id from org_fixture) and user_id=(select user_id from org_fixture);
set local role authenticated;
do $$
declare f record;
begin
  select * into f from pg_temp.org_fixture;
  begin perform public.get_organization_access(f.org_id); raise exception 'suspended access accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  if exists(select 1 from public.app_records where organization_id=f.org_id) then raise exception 'suspended creator bypassed RLS'; end if;
  if exists(select 1 from public.record_revisions where record_id=f.visit) then raise exception 'suspended creator read history'; end if;
  insert into pg_temp.org_test_results values('revocation immediately denies even original creator and revision history');
end;
$$;
select set_config('request.jwt.claim.sub',(select outsider::text from org_fixture),true);
do $$
declare f record;
begin
  select * into f from pg_temp.org_fixture;
  if exists(select 1 from public.organizations where id=f.org_id) or exists(select 1 from public.app_records where id=f.patient) then raise exception 'outsider can read group'; end if;
  begin perform public.list_organization_members(f.org_id); raise exception 'outsider listed team' using errcode='XX000'; exception when insufficient_privilege then null; end;
  insert into pg_temp.org_test_results values('unrelated identity cannot read clinic, patient or team');
end;
$$;
reset role;
select name from org_test_results order by name;
rollback;

