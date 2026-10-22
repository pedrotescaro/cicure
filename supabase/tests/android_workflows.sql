-- All fixtures and test rows are rolled back. Run via a privileged SQL connection.
begin;
create temporary table workflow_fixture as select gen_random_uuid() user_a,gen_random_uuid() user_b,
  gen_random_uuid() patient,gen_random_uuid() wound,gen_random_uuid() visit,gen_random_uuid() item,
  gen_random_uuid() lot,gen_random_uuid() entry,gen_random_uuid() consumption,gen_random_uuid() consent,gen_random_uuid() prescription;
create temporary table workflow_test_results(name text primary key);
grant select on workflow_fixture to authenticated;
grant select,insert on workflow_test_results to authenticated;
insert into auth.users(id,aud,role,email,created_at,updated_at)
  select user_a,'authenticated','authenticated','workflow-a-'||user_a::text||'@example.invalid',now(),now() from workflow_fixture
  union all select user_b,'authenticated','authenticated','workflow-b-'||user_b::text||'@example.invalid',now(),now() from workflow_fixture;
select set_config('request.jwt.claim.sub',(select user_a::text from workflow_fixture),true);
set local role authenticated;
do $$
declare f record; p jsonb; result jsonb; v_count integer;
begin
  select * into f from pg_temp.workflow_fixture;
  perform public.save_record('patients',f.patient,jsonb_build_object('id',f.patient,'name','Paciente sintético'),1,0);
  perform public.save_record('wounds',f.wound,jsonb_build_object('id',f.wound,'patientId',f.patient,'location','Local sintético'),1,0);
  p:=jsonb_build_object('id',f.visit,'patientId',f.patient,'woundId',f.wound,'state','Rascunho','date','2026-10-22','authorUserId',f.user_a,'photos','[]'::jsonb,'amendments','[]'::jsonb);
  perform public.save_record('visits',f.visit,p,1,0);
  if (select count(*) from public.pull_records())<>3 then raise exception 'round trip failed'; end if;
  insert into pg_temp.workflow_test_results values('patient/wound/visit roundtrip');

  begin perform public.save_record('profiles',f.user_b,jsonb_build_object('id',f.user_b,'name','forged'),1,0); raise exception 'profile spoof accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin update public.app_records set owner_id=f.user_b,version=2 where id=f.patient; raise exception 'owner reassignment accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  insert into pg_temp.workflow_test_results values('profile identity and owner reassignment rejected');

  p:=p||jsonb_build_object('state','Concluído','length','2','width','3','plan','Conduta sintética documentada','completedAt',now(),'completedBy',jsonb_build_object('userId',f.user_a,'name','Profissional de teste','council','Conselho','registration','TESTE'));
  perform public.save_record('visits',f.visit,p,2,1);
  begin perform public.save_record('visits',f.visit,p||jsonb_build_object('plan','reescrito'),3,2); raise exception 'completed content was rewritten' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin update public.app_records set payload=payload||jsonb_build_object('state','Rascunho'),version=3 where id=f.visit; raise exception 'direct completed rewrite accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  insert into pg_temp.workflow_test_results values('completed visit protected through RPC and direct DML');

  p:=p||jsonb_build_object('amendments',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'text','Adendo sintético','createdAt',now(),'author',jsonb_build_object('userId',f.user_a,'name','Profissional de teste','council','Conselho','registration','TESTE'))));
  perform public.save_record('visits',f.visit,p,3,2);
  begin perform public.save_record('visits',f.visit,p||jsonb_build_object('amendments','[]'::jsonb),4,3); raise exception 'amendment deletion accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  p:=p||jsonb_build_object('reminderStatus','scheduled','reminderId','local-notification');
  perform public.save_record('visits',f.visit,p,4,3);
  insert into pg_temp.workflow_test_results values('append-only amendment and mutable reminder metadata');

  begin perform public.save_record('patients',f.patient,jsonb_build_object('id',f.patient,'name','stale'),2,0); raise exception 'stale write accepted' using errcode='XX000'; exception when serialization_failure then null; end;
  insert into pg_temp.workflow_test_results values('optimistic concurrency rejects stale version');

  perform public.save_record('inventory_items',f.item,jsonb_build_object('id',f.item,'name','Material sintético','currentStock',0,'minStock',1,'lots','[]'::jsonb,'createdBy',f.user_a),1,0);
  p:=jsonb_build_object('id',f.entry,'itemId',f.item,'lotId',f.lot,'lotNumber','LOTE-TESTE','expiryDate','2030-12-31','type','entrada','quantity',5,'createdBy',f.user_a,'createdAt',now());
  perform public.save_record('inventory_movements',f.entry,p,1,0);
  perform public.save_record('inventory_movements',f.consumption,p||jsonb_build_object('id',f.consumption,'type','saida_atendimento','quantity',4,'visitId',f.visit,'patientId',f.patient,'referenceId','test-idempotent'),1,0);
  result:=public.save_record('inventory_movements',f.consumption,p||jsonb_build_object('id',f.consumption,'type','saida_atendimento','quantity',4,'visitId',f.visit,'patientId',f.patient,'referenceId','test-idempotent'),1,0);
  if result->>'id'<>f.consumption::text then raise exception 'idempotency failure'; end if;
  begin perform public.save_record('inventory_movements',gen_random_uuid(),jsonb_build_object('id','00000000-0000-0000-0000-000000000000'),1,0); raise exception 'bad id accepted' using errcode='XX000'; exception when invalid_parameter_value then null; end;
  begin
    p:=p||jsonb_build_object('id',gen_random_uuid(),'type','saida_descarte','quantity',2,'notes','Teste de falta de saldo');
    perform public.save_record('inventory_movements',(p->>'id')::uuid,p,1,0);
    raise exception 'overdraw accepted' using errcode='XX000';
  exception when check_violation then null; end;
  begin update public.app_records set payload=payload||jsonb_build_object('quantity',999),version=2 where id=f.entry; raise exception 'movement rewrite accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  insert into pg_temp.workflow_test_results values('stock lot balance and retry idempotency enforced by database');

  p:=jsonb_build_object('id',f.consent,'patientId',f.patient,'type','registro_fotografico','status','ativo','evidence','Termo sintético arquivado para teste','acceptedBy','Paciente de teste','createdBy',f.user_a);
  perform public.save_record('consents',f.consent,p,1,0);
  begin perform public.save_record('consents',f.consent,p||jsonb_build_object('acceptedBy','outro'),2,1); raise exception 'consent evidence changed' using errcode='XX000'; exception when insufficient_privilege then null; end;
  perform public.save_record('consents',f.consent,p||jsonb_build_object('status','revogado','revokedBy',f.user_a,'revokedAt',now(),'revocationReason','Solicitação sintética'),2,1);
  insert into pg_temp.workflow_test_results values('consent evidence preserved and explicit revocation accepted');

  p:=jsonb_build_object('id',f.prescription,'patientId',f.patient,'woundId',f.wound,'createdBy',f.user_a,'status','reviewed','professional',jsonb_build_object('name','Profissional de teste','council','Conselho','registration','TESTE'),'primaryCoverage','Registro sintético','changeFrequency','Informada pelo profissional','expectedDuration','Informada pelo profissional','reviewedAt',now());
  perform public.save_record('prescriptions',f.prescription,p,1,0);
  begin perform public.save_record('prescriptions',f.prescription,p||jsonb_build_object('primaryCoverage','reescrito'),2,1); raise exception 'reviewed prescription changed' using errcode='XX000'; exception when insufficient_privilege then null; end;
  insert into pg_temp.workflow_test_results values('reviewed prescription immutable');

  p:=jsonb_build_object('id',gen_random_uuid(),'name','Modelo sintético','scope','personal','createdBy',f.user_a,'content',jsonb_build_object('text','Texto sintético'));
  perform public.save_record('clinical_templates',(p->>'id')::uuid,p,1,0);
  p:=jsonb_build_object('id',gen_random_uuid(),'patientId',f.patient,'woundId',f.wound,'createdBy',f.user_a);
  perform public.save_record('care_plans',(p->>'id')::uuid,p,1,0);
  p:=jsonb_build_object('id',gen_random_uuid(),'patientId',f.patient,'createdBy',f.user_a);
  perform public.save_record('referrals',(p->>'id')::uuid,p,1,0);
  p:=jsonb_build_object('id',gen_random_uuid(),'patientId',f.patient,'createdBy',f.user_a,'storagePath',f.user_a::text||'/'||f.patient::text||'/documents/test.pdf');
  perform public.save_record('documents',(p->>'id')::uuid,p,1,0);
  insert into pg_temp.workflow_test_results values('new supporting kinds persist through actual RPC');

  if (select count(*) from public.list_record_revisions(f.visit))<>4 then raise exception 'revision history not complete'; end if;
  if not exists(select 1 from public.list_activity_events() where action='visit_amend' and user_id=f.user_a) then raise exception 'server amendment audit missing'; end if;
  begin insert into public.record_activity_events(owner_id,user_id,kind,record_id,action,version) values(f.user_a,f.user_b,'patients',f.patient,'record_create',99); raise exception 'audit forgery accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin update public.record_revisions set payload='{}'::jsonb where record_id=f.visit; raise exception 'history rewrite accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin truncate public.app_records; raise exception 'truncate accepted' using errcode='XX000'; exception when insufficient_privilege then null; end;
  insert into pg_temp.workflow_test_results values('authoritative server audit, history, and no truncate privilege');
end;
$$;
select set_config('request.jwt.claim.sub',(select user_b::text from workflow_fixture),true);
do $$
declare f record; p jsonb;
begin
  select * into f from pg_temp.workflow_fixture;
  if (select count(*) from public.pull_records())<>0 or (select count(*) from public.list_activity_events())<>0 or (select count(*) from public.list_record_revisions(f.visit))<>0 then raise exception 'cross-account leak'; end if;
  p:=jsonb_build_object('id',gen_random_uuid(),'patientId',f.patient);
  begin perform public.save_record('wounds',(p->>'id')::uuid,p,1,0); raise exception 'cross account write accepted' using errcode='XX000'; exception when foreign_key_violation then null; end;
  insert into pg_temp.workflow_test_results values('account B cannot read account A records, history or audit');
end;
$$;
reset role;
select jsonb_build_object('passed',count(*),'tests',jsonb_agg(name order by name)) as verification from workflow_test_results;
rollback;

