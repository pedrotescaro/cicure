-- Android workflows: real entity kinds, database-enforced history and authorship.
-- save_record remains SECURITY INVOKER; direct table writes obey the same guard.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.app_records drop constraint app_records_kind_check;
alter table public.app_records add constraint app_records_kind_check check (kind in (
  'profiles','patients','wounds','visits','reports','products','care_plans',
  'prescriptions','consents','documents','referrals','appointments','inventory','templates',
  'inventory_items','inventory_movements','clinical_templates'
));
revoke all on public.app_records from anon;
revoke delete, truncate, references, trigger on public.app_records from authenticated;
grant select, insert, update on public.app_records to authenticated;

create table public.record_revisions (
  record_id uuid not null,
  owner_id uuid not null,
  kind text not null,
  version bigint not null check (version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  actor_id uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (record_id, version)
);
create index record_revisions_owner_record_idx on public.record_revisions(owner_id, record_id, version desc);
alter table public.record_revisions enable row level security;
create policy record_revisions_read_own on public.record_revisions for select to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.record_revisions from public, anon, authenticated, service_role;
grant select on public.record_revisions to authenticated;

create table public.record_activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  user_id uuid not null,
  kind text not null,
  record_id uuid not null,
  action text not null check (action in ('record_create','record_edit','visit_complete','visit_amend','consent_revoke')),
  version bigint not null,
  created_at timestamptz not null default clock_timestamp()
);
create index record_activity_events_owner_date_idx on public.record_activity_events(owner_id, created_at desc, id);
alter table public.record_activity_events enable row level security;
create policy record_activity_events_read_own on public.record_activity_events for select to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.record_activity_events from public, anon, authenticated, service_role;
grant select on public.record_activity_events to authenticated;

create or replace function private.guard_app_record()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_patient uuid;
  v_parent public.app_records%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_photos_before jsonb;
  v_photos_after jsonb;
  v_amendment jsonb;
  v_before_count integer;
  v_index integer;
  v_quantity numeric;
  v_balance numeric;
  v_lot_balance numeric;
  v_expiry text;
  v_lot_number text;
  v_event_day date;
  v_baseline_lot jsonb;
  v_entry jsonb;
begin
  if tg_op = 'DELETE' then raise exception 'clinical records use logical deletion' using errcode='42501'; end if;
  if v_user is null or new.owner_id <> v_user then raise exception 'record ownership required' using errcode='42501'; end if;
  if new.payload->>'id' is distinct from new.id::text then raise exception 'record id mismatch' using errcode='22023'; end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.owner_id <> old.owner_id or new.kind <> old.kind then raise exception 'record identity is immutable' using errcode='42501'; end if;
    if new.version <= old.version then raise exception 'version must advance' using errcode='40001'; end if;
    if new.payload->>'patientId' is distinct from old.payload->>'patientId' then raise exception 'patient link is immutable' using errcode='42501'; end if;
    if old.payload ? 'createdBy' and new.payload->>'createdBy' is distinct from old.payload->>'createdBy' then raise exception 'original author is immutable' using errcode='42501'; end if;
    new.created_at := old.created_at;
  else
    new.created_at := clock_timestamp();
    if new.payload ? 'createdBy' and new.payload->>'createdBy' is distinct from v_user::text then raise exception 'author mismatch' using errcode='42501'; end if;
  end if;
  new.updated_at := clock_timestamp();
  -- Soft deletion remains in payload, allowing another device to receive the tombstone.
  new.deleted_at := null;
  if new.kind = 'profiles' and new.id <> v_user then raise exception 'profile id mismatch' using errcode='42501'; end if;
  if new.kind in ('wounds','visits','reports','care_plans','prescriptions','consents','documents','referrals','appointments')
     and nullif(new.payload->>'patientId','') is null then raise exception 'patient required' using errcode='23502'; end if;
  v_patient := nullif(new.payload->>'patientId','')::uuid;
  if v_patient is not null and not exists (
    select 1 from public.app_records r where r.id=v_patient and r.owner_id=new.owner_id
      and r.kind='patients' and r.deleted_at is null and nullif(r.payload->>'deletedAt','') is null
  ) then raise exception 'patient unavailable' using errcode='23503'; end if;
  new.patient_id := v_patient;
  if new.kind in ('visits','care_plans','prescriptions') or (new.kind='referrals' and nullif(new.payload->>'woundId','') is not null) then
    if not exists (select 1 from public.app_records r where r.id=(new.payload->>'woundId')::uuid
      and r.owner_id=new.owner_id and r.kind='wounds' and r.patient_id=v_patient
      and r.deleted_at is null and nullif(r.payload->>'deletedAt','') is null)
    then raise exception 'wound unavailable' using errcode='23503'; end if;
    if tg_op='UPDATE' and new.payload->>'woundId' is distinct from old.payload->>'woundId' then raise exception 'wound link is immutable' using errcode='42501'; end if;
  end if;
  if new.kind='documents' and (new.payload->>'storagePath' is null or not starts_with(new.payload->>'storagePath',new.owner_id::text||'/'||v_patient::text||'/documents/'))
    then raise exception 'private document path mismatch' using errcode='42501'; end if;

  if new.kind='visits' then
    if coalesce(new.payload->>'state','') not in ('Agendado','Rascunho','Concluído') then raise exception 'invalid visit state' using errcode='22023'; end if;
    if tg_op='INSERT' and new.payload ? 'authorUserId' and new.payload->>'authorUserId' <> v_user::text then raise exception 'visit author mismatch' using errcode='42501'; end if;
    if tg_op='UPDATE' and old.payload ? 'authorUserId' and new.payload->>'authorUserId' is distinct from old.payload->>'authorUserId' then raise exception 'visit author immutable' using errcode='42501'; end if;
    if new.payload->>'state'='Concluído' then
      if new.payload->'completedBy'->>'userId' is null or nullif(trim(new.payload->'completedBy'->>'name'),'') is null
         or nullif(trim(new.payload->'completedBy'->>'council'),'') is null or nullif(trim(new.payload->'completedBy'->>'registration'),'') is null
         or nullif(new.payload->>'completedAt','') is null then raise exception 'professional completion required' using errcode='23502'; end if;
      if (tg_op='INSERT' or old.payload->>'state' is distinct from 'Concluído') and new.payload->'completedBy'->>'userId' <> v_user::text then raise exception 'completion author mismatch' using errcode='42501'; end if;
      perform (new.payload->>'completedAt')::timestamptz;
      if nullif(trim(new.payload->>'plan'),'') is null or coalesce(new.payload->>'length','') !~ '^\d+([.,]\d+)?$'
         or coalesce(new.payload->>'width','') !~ '^\d+([.,]\d+)?$' then raise exception 'completion needs measures and care plan' using errcode='22023'; end if;
      if replace(new.payload->>'length',',','.')::numeric not between 0.00001 and 200 or replace(new.payload->>'width',',','.')::numeric not between 0.00001 and 200 then raise exception 'invalid completed measures' using errcode='22023'; end if;
    end if;
    if tg_op='UPDATE' and old.payload->>'state'='Concluído' then
      v_before := old.payload - array['amendments','reminderId','reminderStatus','photos'];
      v_after := new.payload - array['amendments','reminderId','reminderStatus','photos'];
      select coalesce(jsonb_agg(photo - array['uri','storagePath'] order by ordinal),'[]'::jsonb) into v_photos_before
        from jsonb_array_elements(coalesce(old.payload->'photos','[]'::jsonb)) with ordinality p(photo,ordinal);
      select coalesce(jsonb_agg(photo - array['uri','storagePath'] order by ordinal),'[]'::jsonb) into v_photos_after
        from jsonb_array_elements(coalesce(new.payload->'photos','[]'::jsonb)) with ordinality p(photo,ordinal);
      if v_before is distinct from v_after or v_photos_before is distinct from v_photos_after then raise exception 'completed visit is immutable; append an amendment' using errcode='42501'; end if;
      if jsonb_typeof(coalesce(new.payload->'amendments','[]'::jsonb)) <> 'array' then raise exception 'invalid amendments' using errcode='22023'; end if;
      v_before_count := jsonb_array_length(coalesce(old.payload->'amendments','[]'::jsonb));
      if jsonb_array_length(coalesce(new.payload->'amendments','[]'::jsonb)) < v_before_count then raise exception 'amendments are append only' using errcode='42501'; end if;
      if v_before_count>0 then for v_index in 0..v_before_count-1 loop
        if old.payload->'amendments'->v_index is distinct from new.payload->'amendments'->v_index then raise exception 'original amendment is immutable' using errcode='42501'; end if;
      end loop; end if;
      for v_amendment in select value from jsonb_array_elements(coalesce(new.payload->'amendments','[]'::jsonb)) with ordinality a(value,ordinal) where ordinal>v_before_count loop
        if nullif(v_amendment->>'id','') is null or nullif(trim(v_amendment->>'text'),'') is null
          or v_amendment->'author'->>'userId' is distinct from v_user::text
          or nullif(trim(v_amendment->'author'->>'name'),'') is null
          or nullif(trim(v_amendment->'author'->>'council'),'') is null
          or nullif(trim(v_amendment->'author'->>'registration'),'') is null
          or nullif(v_amendment->>'createdAt','') is null then raise exception 'amendment author and text required' using errcode='42501'; end if;
        perform (v_amendment->>'createdAt')::timestamptz;
        if (select count(*) from jsonb_array_elements(new.payload->'amendments') a where a->>'id'=v_amendment->>'id') <> 1 then raise exception 'duplicate amendment id' using errcode='23505'; end if;
      end loop;
    end if;
    for v_entry in select value from jsonb_array_elements(coalesce(new.payload->'photos','[]'::jsonb)) loop
      if nullif(v_entry->>'storagePath','') is not null and v_entry->>'storagePath' not in (
        new.owner_id::text||'/'||v_patient::text||'/'||(new.payload->>'woundId')||'/'||new.id::text||'/'||(v_entry->>'id')||'.jpg',
        new.owner_id::text||'/'||v_patient::text||'/'||(new.payload->>'woundId')||'/'||new.id::text||'/'||(v_entry->>'id')||'.png'
      ) then raise exception 'private photo path mismatch' using errcode='42501'; end if;
      if tg_op='UPDATE' and old.payload->>'state'='Concluído' and exists (
        select 1 from jsonb_array_elements(coalesce(old.payload->'photos','[]'::jsonb)) p
          where p->>'id'=v_entry->>'id' and nullif(p->>'storagePath','') is not null and p->>'storagePath' is distinct from v_entry->>'storagePath'
      ) then raise exception 'original photo path is immutable' using errcode='42501'; end if;
    end loop;
    if new.payload->>'state'='Concluído' and (tg_op='INSERT' or old.payload->>'state' is distinct from 'Concluído') then
      for v_amendment in select value from jsonb_array_elements(coalesce(new.payload->'amendments','[]'::jsonb)) loop
        if nullif(v_amendment->>'id','') is null or nullif(trim(v_amendment->>'text'),'') is null
          or v_amendment->'author'->>'userId' is distinct from v_user::text
          or nullif(trim(v_amendment->'author'->>'name'),'') is null
          or nullif(trim(v_amendment->'author'->>'council'),'') is null
          or nullif(trim(v_amendment->'author'->>'registration'),'') is null
          or nullif(v_amendment->>'createdAt','') is null then raise exception 'amendment author and text required' using errcode='42501'; end if;
        perform (v_amendment->>'createdAt')::timestamptz;
        if (select count(*) from jsonb_array_elements(new.payload->'amendments') a where a->>'id'=v_amendment->>'id') <> 1 then raise exception 'duplicate amendment id' using errcode='23505'; end if;
      end loop;
    end if;
  end if;

  if new.kind='inventory_items' then
    if coalesce(new.payload->>'name','')='' or coalesce(new.payload->>'minStock','') !~ '^\d+$' then raise exception 'invalid stock catalog' using errcode='22023'; end if;
    if tg_op='INSERT' and (coalesce(new.payload->>'currentStock','0')::numeric<>0 or coalesce(new.payload->'lots','[]'::jsonb)<>'[]'::jsonb) then raise exception 'initial stock must be recorded as a movement' using errcode='22023'; end if;
    if tg_op='UPDATE' and (new.payload->'currentStock' is distinct from old.payload->'currentStock' or new.payload->'lots' is distinct from old.payload->'lots') then raise exception 'stock is derived from immutable movements' using errcode='42501'; end if;
  end if;
  if new.kind='inventory_movements' then
    if tg_op='UPDATE' and new.payload is distinct from old.payload then raise exception 'stock movements are immutable' using errcode='42501'; end if;
    if tg_op='INSERT' then
      if new.payload->>'createdBy' is distinct from v_user::text or coalesce(new.payload->>'type','') not in ('entrada','saida_atendimento','saida_descarte','ajuste')
        or coalesce(new.payload->>'quantity','') !~ '^\d+$' or coalesce(new.payload->>'lotId','')='' then raise exception 'invalid stock movement' using errcode='22023'; end if;
      v_quantity := (new.payload->>'quantity')::numeric;
      if v_quantity<=0 then raise exception 'quantity must be positive' using errcode='22023'; end if;
      select * into v_parent from public.app_records r where r.id=(new.payload->>'itemId')::uuid and r.owner_id=new.owner_id and r.kind='inventory_items' and nullif(r.payload->>'deletedAt','') is null for update;
      if v_parent.id is null then raise exception 'stock item unavailable' using errcode='23503'; end if;
      select coalesce(sum(case when r.payload->>'type' in ('entrada','ajuste') then (r.payload->>'quantity')::numeric else -(r.payload->>'quantity')::numeric end),0)
        into v_balance from public.app_records r where r.owner_id=new.owner_id and r.kind='inventory_movements' and r.payload->>'itemId'=new.payload->>'itemId';
      select coalesce(sum(case when r.payload->>'type' in ('entrada','ajuste') then (r.payload->>'quantity')::numeric else -(r.payload->>'quantity')::numeric end),0)
        into v_lot_balance from public.app_records r where r.owner_id=new.owner_id and r.kind='inventory_movements' and r.payload->>'itemId'=new.payload->>'itemId' and r.payload->>'lotId'=new.payload->>'lotId';
      select r.payload into v_entry from public.app_records r where r.owner_id=new.owner_id and r.kind='inventory_movements'
        and r.payload->>'itemId'=new.payload->>'itemId' and r.payload->>'lotId'=new.payload->>'lotId' and r.payload->>'type' in ('entrada','ajuste') order by r.created_at limit 1;
      if new.payload->>'type' in ('entrada','ajuste') then
        if coalesce(new.payload->>'lotNumber','')='' or coalesce(new.payload->>'expiryDate','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'lot number and expiry required' using errcode='22023'; end if;
        perform (new.payload->>'expiryDate')::date;
        if v_entry is not null and (v_entry->>'lotNumber' is distinct from new.payload->>'lotNumber' or v_entry->>'expiryDate' is distinct from new.payload->>'expiryDate') then raise exception 'lot identity is immutable' using errcode='42501'; end if;
      else
        if v_quantity>v_balance or v_quantity>v_lot_balance or v_entry is null then raise exception 'insufficient stock' using errcode='23514'; end if;
        if new.payload->>'lotNumber' is distinct from v_entry->>'lotNumber' or new.payload->>'expiryDate' is distinct from v_entry->>'expiryDate' then raise exception 'lot identity mismatch' using errcode='42501'; end if;
        if new.payload->>'type'='saida_descarte' and nullif(trim(new.payload->>'notes'),'') is null then raise exception 'disposal reason required' using errcode='22023'; end if;
        if new.payload->>'type'='saida_atendimento' then
          select * into v_parent from public.app_records r where r.id=(new.payload->>'visitId')::uuid and r.owner_id=new.owner_id and r.kind='visits' and r.patient_id=v_patient and nullif(r.payload->>'deletedAt','') is null;
          if v_parent.id is null then raise exception 'stock use needs a visit' using errcode='23503'; end if;
          if (v_entry->>'expiryDate')::date < (left(v_parent.payload->>'date',10))::date then raise exception 'expired lot cannot be used' using errcode='23514'; end if;
        end if;
      end if;
    end if;
  end if;
  if new.kind='clinical_templates' and (new.payload->>'scope' is distinct from 'personal' or nullif(trim(new.payload->>'name'),'') is null) then raise exception 'personal template required' using errcode='22023'; end if;
  if new.kind='consents' then
    if coalesce(new.payload->>'type','') not in ('atendimento','registro_fotografico','compartilhamento_profissionais','ensino_anonimizado','pesquisa_anonimizada') then raise exception 'unknown consent purpose' using errcode='22023'; end if;
    if tg_op='INSERT' and (new.payload->>'createdBy' is distinct from v_user::text or new.payload->>'status' is distinct from 'ativo' or length(trim(coalesce(new.payload->>'evidence','')))<10 or nullif(trim(new.payload->>'acceptedBy'),'') is null) then raise exception 'formal consent evidence required' using errcode='22023'; end if;
    if tg_op='UPDATE' and new.payload is distinct from old.payload then
      if old.payload->>'status'<>'ativo' or new.payload->>'status'<>'revogado' or new.payload->>'revokedBy' is distinct from v_user::text or nullif(trim(new.payload->>'revocationReason'),'') is null or nullif(new.payload->>'revokedAt','') is null
        or (new.payload-array['status','revokedAt','revocationReason','revokedBy']) is distinct from (old.payload-array['status','revokedAt','revocationReason','revokedBy']) then raise exception 'only consent revocation is allowed' using errcode='42501'; end if;
    end if;
  end if;
  if new.kind='prescriptions' then
    if new.payload->>'status'='reviewed' and (nullif(trim(new.payload->>'primaryCoverage'),'') is null or nullif(trim(new.payload->>'changeFrequency'),'') is null or nullif(trim(new.payload->>'expectedDuration'),'') is null or nullif(new.payload->>'reviewedAt','') is null
      or nullif(trim(new.payload->'professional'->>'name'),'') is null or nullif(trim(new.payload->'professional'->>'council'),'') is null or nullif(trim(new.payload->'professional'->>'registration'),'') is null) then raise exception 'reviewed prescription needs professional and care data' using errcode='22023'; end if;
    if tg_op='UPDATE' and old.payload->>'status' in ('reviewed','archived') and new.payload is distinct from old.payload then
      if old.payload->>'status'<>'reviewed' or new.payload->>'status'<>'archived' or (old.payload-'status') is distinct from (new.payload-'status') then raise exception 'reviewed prescription is immutable; create a revision' using errcode='42501'; end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_app_record() from public, anon, authenticated, service_role;
create trigger app_records_guard before insert or update or delete on public.app_records for each row execute function private.guard_app_record();

create unique index inventory_movement_reference_unique on public.app_records(owner_id,(payload->>'referenceId'))
  where kind='inventory_movements' and nullif(payload->>'referenceId','') is not null;
create index inventory_movement_item_idx on public.app_records(owner_id,(payload->>'itemId'),(payload->>'lotId')) where kind='inventory_movements';

create or replace function private.capture_record_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_action text;
begin
  if v_user is null or new.owner_id<>v_user then raise exception 'audit actor required' using errcode='42501'; end if;
  v_action := case when tg_op='INSERT' then 'record_create' else 'record_edit' end;
  if new.kind='visits' and new.payload->>'state'='Concluído' then
    if tg_op='INSERT' or old.payload->>'state' is distinct from 'Concluído' then v_action:='visit_complete';
    elsif jsonb_array_length(coalesce(new.payload->'amendments','[]'::jsonb))>jsonb_array_length(coalesce(old.payload->'amendments','[]'::jsonb)) then v_action:='visit_amend'; end if;
  elsif new.kind='consents' and new.payload->>'status'='revogado' then v_action:='consent_revoke'; end if;
  insert into public.record_revisions(record_id,owner_id,kind,version,payload,actor_id)
    values(new.id,new.owner_id,new.kind,new.version,new.payload,v_user);
  insert into public.record_activity_events(owner_id,user_id,kind,record_id,action,version)
    values(new.owner_id,v_user,new.kind,new.id,v_action,new.version);
  return new;
end;
$$;
revoke all on function private.capture_record_change() from public, anon, authenticated, service_role;
create trigger app_records_capture after insert or update on public.app_records for each row execute function private.capture_record_change();

create or replace function public.save_record(p_kind text,p_id uuid,p_payload jsonb,p_version bigint,p_base_version bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_record public.app_records%rowtype;
begin
  if v_user is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_kind is null or p_kind not in ('profiles','patients','wounds','visits','reports','products','care_plans','prescriptions','consents','documents','referrals','appointments','inventory','templates','inventory_items','inventory_movements','clinical_templates')
     or p_payload is null or jsonb_typeof(p_payload)<>'object' or p_payload->>'id' is distinct from p_id::text then raise exception 'invalid record' using errcode='22023'; end if;
  if p_version is null or p_base_version is null or p_version<1 or p_base_version<0 or p_version<=p_base_version then raise exception 'invalid version' using errcode='22023'; end if;
  -- A lost response may retry an already-applied initial stock movement.
  -- Return the same version before BEFORE INSERT guards evaluate stock again.
  select * into v_record from public.app_records r where r.id=p_id and r.owner_id=v_user
    and r.kind=p_kind and r.version=p_version and r.payload=p_payload;
  if v_record.id is not null then
    return jsonb_build_object('kind',v_record.kind,'id',v_record.id,'payload',v_record.payload,'version',v_record.version);
  end if;
  if p_base_version=0 then
    insert into public.app_records(id,owner_id,kind,patient_id,payload,version)
      values(p_id,v_user,p_kind,null,p_payload,p_version) on conflict(id) do nothing returning * into v_record;
  else
    update public.app_records r set payload=p_payload,version=p_version where r.id=p_id and r.owner_id=v_user and r.kind=p_kind and r.version=p_base_version returning * into v_record;
  end if;
  if v_record.id is null then
    select * into v_record from public.app_records r where r.id=p_id and r.owner_id=v_user and r.kind=p_kind and r.version=p_version and r.payload=p_payload;
    if v_record.id is null then raise exception 'version conflict' using errcode='40001'; end if;
  end if;
  return jsonb_build_object('kind',v_record.kind,'id',v_record.id,'payload',v_record.payload,'version',v_record.version);
end;
$$;
revoke all on function public.save_record(text,uuid,jsonb,bigint,bigint) from public,anon;
grant execute on function public.save_record(text,uuid,jsonb,bigint,bigint) to authenticated;

create or replace function public.list_activity_events()
returns table(id uuid,user_id uuid,kind text,record_id uuid,action text,created_at timestamptz,version bigint)
language sql security invoker set search_path = '' as $$
  select e.id,e.user_id,e.kind,e.record_id,e.action,e.created_at,e.version
    from public.record_activity_events e where e.owner_id=(select auth.uid()) order by e.created_at desc,e.id limit 500;
$$;
create or replace function public.list_record_revisions(p_record_id uuid)
returns table(record_id uuid,kind text,version bigint,payload jsonb,actor_id uuid,recorded_at timestamptz)
language sql security invoker set search_path = '' as $$
  select r.record_id,r.kind,r.version,r.payload,r.actor_id,r.recorded_at from public.record_revisions r
    where r.owner_id=(select auth.uid()) and r.record_id=p_record_id order by r.version desc;
$$;
revoke all on function public.list_activity_events() from public,anon;
revoke all on function public.list_record_revisions(uuid) from public,anon;
grant execute on function public.list_activity_events(),public.list_record_revisions(uuid) to authenticated;

