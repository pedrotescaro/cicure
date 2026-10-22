-- Clinics are opt-in, initially empty, and authorized using live memberships.
create schema if not exists cicure_private;
revoke all on schema cicure_private from public,anon;
grant usage on schema cicure_private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 2 and 160),
  cnpj text check(cnpj is null or cnpj ~ '^\d{14}$'),
  phone text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  name text not null,
  email text not null,
  role text not null check(role in ('Administrador','Profissional','Assistente','Somente leitura')),
  status text not null check(status in ('active','suspended')),
  created_at timestamptz not null default now(),
  primary key(organization_id,user_id)
);
create index organization_memberships_user_active_idx on public.organization_memberships(user_id,organization_id) where status='active';
create index organization_memberships_user_idx on public.organization_memberships(user_id);
create index organizations_creator_idx on public.organizations(created_by);
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  email text not null check(email=lower(trim(email)) and email like '%@%'),
  role text not null check(role in ('Administrador','Profissional','Assistente','Somente leitura')),
  token_hash bytea not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default(now()+interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz
);
create index organization_invitations_org_pending_idx on public.organization_invitations(organization_id,expires_at) where accepted_at is null and revoked_at is null;
create index organization_invitations_org_idx on public.organization_invitations(organization_id);
create index organization_invitations_creator_idx on public.organization_invitations(created_by);
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;
revoke all on public.organizations,public.organization_memberships,public.organization_invitations from public,anon,authenticated;
grant select on public.organizations,public.organization_memberships to authenticated;

create function cicure_private.organization_role(p_id uuid) returns text language sql stable security definer set search_path='' as $$
  select m.role from public.organization_memberships m
    where (select auth.uid()) is not null and m.user_id=(select auth.uid()) and m.organization_id=p_id and m.status='active';
$$;
create policy organizations_member_read on public.organizations for select to authenticated using(cicure_private.organization_role(id) is not null);
create policy organization_memberships_member_read on public.organization_memberships for select to authenticated
  using(cicure_private.organization_role(organization_id) is not null);

alter table public.app_records add column organization_id uuid references public.organizations(id);
alter table public.app_records drop constraint app_records_patient_owner_fkey;
create index app_records_org_kind_id_idx on public.app_records(organization_id,kind,id) where organization_id is not null;
create index app_records_org_patient_idx on public.app_records(organization_id,patient_id) where organization_id is not null and patient_id is not null;
create function cicure_private.can_read_record(p_owner uuid,p_org uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and case when p_org is null then p_owner=(select auth.uid()) else cicure_private.organization_role(p_org) is not null end;
$$;
create function cicure_private.can_write_record(p_owner uuid,p_org uuid,p_kind text,p_payload jsonb) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and case when p_org is null then p_owner=(select auth.uid())
    when p_kind='profiles' then false
    when cicure_private.organization_role(p_org) in ('Administrador','Profissional') then true
    when cicure_private.organization_role(p_org)='Assistente' then
      p_kind in ('patients','wounds','products','inventory_items','inventory_movements') or (
        p_kind='visits' and p_payload->>'state'='Agendado' and coalesce(p_payload->>'plan','')='' and coalesce(p_payload->>'guidance','')=''
        and coalesce(p_payload->>'length','')='' and coalesce(p_payload->>'width','')='' and coalesce(p_payload->>'depth','')=''
        and coalesce(p_payload->'photos','[]'::jsonb)='[]'::jsonb and coalesce(p_payload->'tissue','{}'::jsonb)='{}'::jsonb
        and not(p_payload ? 'completedBy') and not(p_payload ? 'soap')
      ) else false end;
$$;
drop policy app_records_read_own on public.app_records;
drop policy app_records_insert_own on public.app_records;
drop policy app_records_update_own on public.app_records;
create policy app_records_authorized_read on public.app_records for select to authenticated
  using(cicure_private.can_read_record(owner_id,organization_id));
create policy app_records_authorized_insert on public.app_records for insert to authenticated
  with check(owner_id=(select auth.uid()) and cicure_private.can_write_record(owner_id,organization_id,kind,payload));
create policy app_records_authorized_update on public.app_records for update to authenticated
  using(cicure_private.can_write_record(owner_id,organization_id,kind,payload))
  with check(cicure_private.can_write_record(owner_id,organization_id,kind,payload));

create function cicure_private.organization_json(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',o.id,'name',o.name,'cnpj',o.cnpj,'phone',o.phone,'settings',jsonb_build_object('autoLockMinutes',15,'requireMfa',false),
    'membersCount',(select count(*) from public.organization_memberships m where m.organization_id=o.id and m.status='active'),
    'patientsCount',(select count(*) from public.app_records r where r.organization_id=o.id and r.kind='patients' and nullif(r.payload->>'deletedAt','') is null),
    'role',cicure_private.organization_role(o.id),'isCurrent',false,'isIndividual',false)
  from public.organizations o where o.id=p_id and cicure_private.organization_role(o.id) is not null;
$$;
create function public.list_organizations() returns jsonb language sql security invoker set search_path='' as $$
  select coalesce(jsonb_agg(cicure_private.organization_json(o.id) order by o.name),'[]'::jsonb) from public.organizations o;
$$;
create function public.get_organization_access(p_organization_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_role text:=cicure_private.organization_role(p_organization_id);
begin
  if v_role is null then raise exception 'Acesso à clínica revogado ou não autorizado.' using errcode='42501'; end if;
  return jsonb_build_object('organization',cicure_private.organization_json(p_organization_id),'role',v_role,'status','active');
end;
$$;

-- Privileged mutations are kept outside the exposed schema, with an explicit identity/role check.
create function cicure_private.create_organization(p_name text,p_cnpj text,p_phone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid()); v_id uuid; v_email text; v_name text;
begin
  if v_user is null then raise exception 'Entre na sua conta.' using errcode='28000'; end if;
  select u.email into v_email from auth.users u where u.id=v_user and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'Confirme o e-mail da sua conta para criar uma clínica.' using errcode='42501'; end if;
  if length(trim(p_name)) not between 2 and 160 then raise exception 'Informe um nome válido para a clínica.' using errcode='22023'; end if;
  select coalesce(nullif(trim(r.payload->>'name'),''),v_email) into v_name from public.app_records r where r.id=v_user and r.kind='profiles' and r.organization_id is null;
  insert into public.organizations(name,cnpj,phone,created_by) values(trim(p_name),nullif(trim(p_cnpj),''),nullif(trim(p_phone),''),v_user) returning id into v_id;
  insert into public.organization_memberships(organization_id,user_id,name,email,role,status) values(v_id,v_user,coalesce(v_name,v_email),lower(v_email),'Administrador','active');
  return cicure_private.organization_json(v_id);
end;
$$;
create function public.create_organization(p_name text,p_cnpj text default null,p_phone text default null) returns jsonb language sql security invoker set search_path='' as $$
  select cicure_private.create_organization(p_name,p_cnpj,p_phone);
$$;
create function cicure_private.create_invitation(p_organization_id uuid,p_name text,p_email text,p_role text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_token text; v_id uuid; v_expires timestamptz;
begin
  if (select auth.uid()) is null or cicure_private.organization_role(p_organization_id) is distinct from 'Administrador' then raise exception 'Somente administradores podem criar convites.' using errcode='42501'; end if;
  if nullif(trim(p_name),'') is null or p_email is null or lower(trim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_role not in ('Administrador','Profissional','Assistente','Somente leitura') then raise exception 'Confira nome, e-mail e permissão do convite.' using errcode='22023'; end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  update public.organization_invitations set revoked_at=now() where organization_id=p_organization_id and email=lower(trim(p_email)) and accepted_at is null and revoked_at is null;
  insert into public.organization_invitations(organization_id,name,email,role,token_hash,created_by) values(p_organization_id,trim(p_name),lower(trim(p_email)),p_role,extensions.digest(v_token,'sha256'),(select auth.uid())) returning id,expires_at into v_id,v_expires;
  return jsonb_build_object('id',v_id,'token',v_token,'expiresAt',v_expires,'email',lower(trim(p_email)),'role',p_role);
end;
$$;
create function public.create_organization_invitation(p_organization_id uuid,p_name text,p_email text,p_role text) returns jsonb language sql security invoker set search_path='' as $$
  select cicure_private.create_invitation(p_organization_id,p_name,p_email,p_role);
$$;
create function cicure_private.accept_invitation(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid()); v_email text; v_invite public.organization_invitations%rowtype;
begin
  if v_user is null then raise exception 'Entre na sua conta para aceitar o convite.' using errcode='28000'; end if;
  select lower(email) into v_email from auth.users where id=v_user and email_confirmed_at is not null;
  if v_email is null then raise exception 'Confirme o e-mail da sua conta antes de aceitar o convite.' using errcode='42501'; end if;
  select * into v_invite from public.organization_invitations where token_hash=extensions.digest(lower(trim(p_token)),'sha256') for update;
  if v_invite.id is null or v_invite.revoked_at is not null or v_invite.accepted_at is not null or v_invite.expires_at<=now() or v_invite.email<>v_email then raise exception 'Convite inválido, expirado ou destinado a outro e-mail.' using errcode='22023'; end if;
  if cicure_private.organization_role(v_invite.organization_id) is not null then raise exception 'Sua conta já participa desta clínica.' using errcode='22023'; end if;
  insert into public.organization_memberships(organization_id,user_id,name,email,role,status) values(v_invite.organization_id,v_user,v_invite.name,v_email,v_invite.role,'active')
    on conflict(organization_id,user_id) do update set role=excluded.role,status='active',name=excluded.name,email=excluded.email;
  update public.organization_invitations set accepted_at=now() where id=v_invite.id;
  return cicure_private.organization_json(v_invite.organization_id);
end;
$$;
create function public.accept_organization_invitation(p_token text) returns jsonb language sql security invoker set search_path='' as $$
  select cicure_private.accept_invitation(p_token);
$$;

create function cicure_private.list_members(p_organization_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  if (select auth.uid()) is null or cicure_private.organization_role(p_organization_id) is null then raise exception 'Acesso à equipe não autorizado.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(x.item order by x.sort_name),'[]'::jsonb) into v_result from (
    select m.name as sort_name,jsonb_build_object('id',m.user_id,'organizationId',m.organization_id,'userId',m.user_id,'name',m.name,'email',m.email,'role',m.role,'status',m.status,'invitedAt',m.created_at) as item
    from public.organization_memberships m where m.organization_id=p_organization_id
    union all
    select i.name,jsonb_build_object('id',i.id,'invitationId',i.id,'organizationId',i.organization_id,'userId','','name',i.name,'email',i.email,'role',i.role,'status','invited','invitedAt',i.created_at,'expiresAt',i.expires_at)
    from public.organization_invitations i where i.organization_id=p_organization_id and i.accepted_at is null and i.revoked_at is null and i.expires_at>now() and cicure_private.organization_role(p_organization_id)='Administrador'
  ) x;
  return v_result;
end;
$$;
create function public.list_organization_members(p_organization_id uuid) returns jsonb language sql security invoker set search_path='' as $$
  select cicure_private.list_members(p_organization_id);
$$;
create function cicure_private.set_member(p_organization_id uuid,p_user_id uuid,p_role text,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_before public.organization_memberships%rowtype;
begin
  if (select auth.uid()) is null or cicure_private.organization_role(p_organization_id) is distinct from 'Administrador' then raise exception 'Somente administradores podem alterar permissões.' using errcode='42501'; end if;
  if p_role not in ('Administrador','Profissional','Assistente','Somente leitura') or p_status not in ('active','suspended') then raise exception 'Permissão ou situação inválida.' using errcode='22023'; end if;
  perform 1 from public.organizations where id=p_organization_id for update;
  select * into v_before from public.organization_memberships where organization_id=p_organization_id and user_id=p_user_id;
  if v_before.user_id is null then raise exception 'Integrante não encontrado.' using errcode='22023'; end if;
  if v_before.role='Administrador' and v_before.status='active' and (p_role<>'Administrador' or p_status<>'active') and (select count(*) from public.organization_memberships where organization_id=p_organization_id and role='Administrador' and status='active')<=1 then raise exception 'Mantenha pelo menos um administrador ativo na clínica.' using errcode='23514'; end if;
  update public.organization_memberships set role=p_role,status=p_status where organization_id=p_organization_id and user_id=p_user_id;
end;
$$;
create function public.set_organization_member(p_organization_id uuid,p_user_id uuid,p_role text,p_status text) returns void language sql security invoker set search_path='' as $$
  select cicure_private.set_member(p_organization_id,p_user_id,p_role,p_status);
$$;
create function cicure_private.revoke_invitation(p_invitation_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.organization_invitations where id=p_invitation_id;
  if (select auth.uid()) is null or cicure_private.organization_role(v_org) is distinct from 'Administrador' then raise exception 'Somente administradores podem cancelar convites.' using errcode='42501'; end if;
  update public.organization_invitations set revoked_at=now() where id=p_invitation_id and accepted_at is null;
end;
$$;
create function public.revoke_organization_invitation(p_invitation_id uuid) returns void language sql security invoker set search_path='' as $$
  select cicure_private.revoke_invitation(p_invitation_id);
$$;

revoke all on all functions in schema cicure_private from public,anon,authenticated;
grant execute on all functions in schema cicure_private to authenticated;
revoke all on function public.list_organizations(),public.get_organization_access(uuid),public.create_organization(text,text,text),
  public.create_organization_invitation(uuid,text,text,text),public.accept_organization_invitation(text),public.list_organization_members(uuid),
  public.set_organization_member(uuid,uuid,text,text),public.revoke_organization_invitation(uuid) from public,anon;
grant execute on function public.list_organizations(),public.get_organization_access(uuid),public.create_organization(text,text,text),
  public.create_organization_invitation(uuid,text,text,text),public.accept_organization_invitation(text),public.list_organization_members(uuid),
  public.set_organization_member(uuid,uuid,text,text),public.revoke_organization_invitation(uuid) to authenticated;


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
  new.organization_id := nullif(new.payload->>'organizationId','')::uuid;
  if v_user is null or (tg_op='INSERT' and new.owner_id<>v_user) or not cicure_private.can_write_record(new.owner_id,new.organization_id,new.kind,new.payload) then raise exception 'record permission required' using errcode='42501'; end if;
  if new.payload->>'id' is distinct from new.id::text then raise exception 'record id mismatch' using errcode='22023'; end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.owner_id <> old.owner_id or new.kind <> old.kind or new.organization_id is distinct from old.organization_id then raise exception 'record identity is immutable' using errcode='42501'; end if;
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
    select 1 from public.app_records r where r.id=v_patient and r.organization_id is not distinct from new.organization_id and (new.organization_id is not null or r.owner_id=new.owner_id)
      and r.kind='patients' and r.deleted_at is null and nullif(r.payload->>'deletedAt','') is null
  ) then raise exception 'patient unavailable' using errcode='23503'; end if;
  new.patient_id := v_patient;
  if new.kind in ('visits','care_plans','prescriptions') or (new.kind='referrals' and nullif(new.payload->>'woundId','') is not null) then
    if not exists (select 1 from public.app_records r where r.id=(new.payload->>'woundId')::uuid
      and r.organization_id is not distinct from new.organization_id and (new.organization_id is not null or r.owner_id=new.owner_id) and r.kind='wounds' and r.patient_id=v_patient
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
      if nullif(v_entry->>'storagePath','') is not null and not (
        split_part(v_entry->>'storagePath','/',1)=new.owner_id::text or split_part(v_entry->>'storagePath','/',1)=v_user::text
        or (new.organization_id is not null and exists(select 1 from public.organization_memberships m where m.organization_id=new.organization_id and m.user_id::text=split_part(v_entry->>'storagePath','/',1)))
      ) then raise exception 'photo uploader unavailable' using errcode='42501'; end if;
      if nullif(v_entry->>'storagePath','') is not null and v_entry->>'storagePath' not in (
        split_part(v_entry->>'storagePath','/',1)||'/'||v_patient::text||'/'||(new.payload->>'woundId')||'/'||new.id::text||'/'||(v_entry->>'id')||'.jpg',
        split_part(v_entry->>'storagePath','/',1)||'/'||v_patient::text||'/'||(new.payload->>'woundId')||'/'||new.id::text||'/'||(v_entry->>'id')||'.png'
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
      select * into v_parent from public.app_records r where r.id=(new.payload->>'itemId')::uuid and r.organization_id is not distinct from new.organization_id and (new.organization_id is not null or r.owner_id=new.owner_id) and r.kind='inventory_items' and nullif(r.payload->>'deletedAt','') is null for update;
      if v_parent.id is null then raise exception 'stock item unavailable' using errcode='23503'; end if;
      select coalesce(sum(case when r.payload->>'type' in ('entrada','ajuste') then (r.payload->>'quantity')::numeric else -(r.payload->>'quantity')::numeric end),0)
        into v_balance from public.app_records r where r.organization_id is not distinct from new.organization_id and (new.organization_id is not null or r.owner_id=new.owner_id) and r.kind='inventory_movements' and r.payload->>'itemId'=new.payload->>'itemId';
      select coalesce(sum(case when r.payload->>'type' in ('entrada','ajuste') then (r.payload->>'quantity')::numeric else -(r.payload->>'quantity')::numeric end),0)
        into v_lot_balance from public.app_records r where r.organization_id is not distinct from new.organization_id and (new.organization_id is not null or r.owner_id=new.owner_id) and r.kind='inventory_movements' and r.payload->>'itemId'=new.payload->>'itemId' and r.payload->>'lotId'=new.payload->>'lotId';
      select r.payload into v_entry from public.app_records r where r.organization_id is not distinct from new.organization_id and (new.organization_id is not null or r.owner_id=new.owner_id) and r.kind='inventory_movements'
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
          select * into v_parent from public.app_records r where r.id=(new.payload->>'visitId')::uuid and r.organization_id is not distinct from new.organization_id and (new.organization_id is not null or r.owner_id=new.owner_id) and r.kind='visits' and r.patient_id=v_patient and nullif(r.payload->>'deletedAt','') is null;
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

create or replace function private.capture_record_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_action text;
begin
  if v_user is null or not cicure_private.can_write_record(new.owner_id,new.organization_id,new.kind,new.payload) then raise exception 'audit actor required' using errcode='42501'; end if;
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


-- Shared record transport keeps the existing five-argument save RPC.
create or replace function public.save_record(p_kind text,p_id uuid,p_payload jsonb,p_version bigint,p_base_version bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_user uuid:=(select auth.uid()); v_org uuid:=nullif(p_payload->>'organizationId','')::uuid; v_record public.app_records%rowtype;
begin
  if v_user is null then raise exception 'Entre na sua conta.' using errcode='28000'; end if;
  if p_kind is null or p_kind not in ('profiles','patients','wounds','visits','reports','products','care_plans','prescriptions','consents','documents','referrals','appointments','inventory','templates','inventory_items','inventory_movements','clinical_templates')
    or p_payload is null or jsonb_typeof(p_payload)<>'object' or p_payload->>'id' is distinct from p_id::text then raise exception 'Registro inválido.' using errcode='22023'; end if;
  if not cicure_private.can_write_record(v_user,v_org,p_kind,p_payload) then raise exception 'Sua permissão não permite alterar este registro.' using errcode='42501'; end if;
  if p_version is null or p_base_version is null or p_version<1 or p_base_version<0 or p_version<=p_base_version then raise exception 'Versão inválida.' using errcode='22023'; end if;
  select * into v_record from public.app_records r where r.id=p_id and r.kind=p_kind and r.organization_id is not distinct from v_org and (v_org is not null or r.owner_id=v_user) and r.version=p_version and r.payload=p_payload;
  if v_record.id is not null then return jsonb_build_object('kind',v_record.kind,'id',v_record.id,'payload',v_record.payload,'version',v_record.version); end if;
  if p_base_version=0 then
    insert into public.app_records(id,owner_id,kind,patient_id,payload,version) values(p_id,v_user,p_kind,null,p_payload,p_version) on conflict(id) do nothing returning * into v_record;
  else
    update public.app_records r set payload=p_payload,version=p_version where r.id=p_id and r.kind=p_kind and r.organization_id is not distinct from v_org and (v_org is not null or r.owner_id=v_user) and r.version=p_base_version returning * into v_record;
  end if;
  if v_record.id is null then
    select * into v_record from public.app_records r where r.id=p_id and r.kind=p_kind and r.organization_id is not distinct from v_org and (v_org is not null or r.owner_id=v_user) and r.version=p_version and r.payload=p_payload;
    if v_record.id is null then raise exception 'Outro dispositivo alterou este registro. Revise o conflito antes de enviar.' using errcode='40001'; end if;
  end if;
  return jsonb_build_object('kind',v_record.kind,'id',v_record.id,'payload',v_record.payload,'version',v_record.version);
end;
$$;
drop function public.pull_records();
create function public.pull_records(p_organization_id uuid default null,p_after_id uuid default null,p_limit integer default 200)
returns table(kind text,id uuid,payload jsonb,version bigint) language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta.' using errcode='28000'; end if;
  if p_organization_id is not null and cicure_private.organization_role(p_organization_id) is null then raise exception 'Acesso à clínica não autorizado.' using errcode='42501'; end if;
  return query select r.kind,r.id,r.payload,r.version from public.app_records r
    where (p_after_id is null or r.id>p_after_id) and (
      (r.organization_id is not distinct from p_organization_id and (p_organization_id is not null or r.owner_id=(select auth.uid())))
      or (p_organization_id is not null and r.kind='profiles' and r.owner_id=(select auth.uid()) and r.organization_id is null)
    ) order by r.id limit greatest(1,least(coalesce(p_limit,200),500));
end;
$$;
drop index public.inventory_movement_reference_unique;
create unique index inventory_movement_reference_unique on public.app_records((coalesce(organization_id,owner_id)),(payload->>'referenceId'))
  where kind='inventory_movements' and nullif(payload->>'referenceId','') is not null;
create index inventory_movement_org_item_idx on public.app_records(organization_id,(payload->>'itemId'),(payload->>'lotId')) where kind='inventory_movements' and organization_id is not null;

drop policy record_revisions_read_own on public.record_revisions;
create policy record_revisions_authorized_read on public.record_revisions for select to authenticated using(exists(
  select 1 from public.app_records r where r.id=record_id and cicure_private.can_read_record(r.owner_id,r.organization_id)
));
drop policy record_activity_events_read_own on public.record_activity_events;
create policy record_activity_events_authorized_read on public.record_activity_events for select to authenticated using(exists(
  select 1 from public.app_records r where r.id=record_id and ((r.organization_id is null and r.owner_id=(select auth.uid())) or cicure_private.organization_role(r.organization_id)='Administrador')
));
drop function public.list_activity_events();
create function public.list_activity_events(p_organization_id uuid default null)
returns table(id uuid,user_id uuid,kind text,record_id uuid,action text,created_at timestamptz,version bigint) language sql security invoker set search_path='' as $$
  select e.id,e.user_id,e.kind,e.record_id,e.action,e.created_at,e.version from public.record_activity_events e join public.app_records r on r.id=e.record_id
    where r.organization_id is not distinct from p_organization_id and (p_organization_id is not null or r.owner_id=(select auth.uid())) order by e.created_at desc,e.id limit 500;
$$;
create or replace function public.list_record_revisions(p_record_id uuid)
returns table(record_id uuid,kind text,version bigint,payload jsonb,actor_id uuid,recorded_at timestamptz) language sql security invoker set search_path='' as $$
  select r.record_id,r.kind,r.version,r.payload,r.actor_id,r.recorded_at from public.record_revisions r where r.record_id=p_record_id order by r.version desc;
$$;

-- Private media remains tied to actual record references. A revoked creator loses access to shared media too.
create function cicure_private.media_access(p_name text,p_write boolean default false) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and (
    case when p_write then split_part(p_name,'/',1)=(select auth.uid())::text
      and not exists(select 1 from public.app_records r where r.organization_id is not null and jsonb_path_exists(r.payload,'$.**.storagePath ? (@ == $path)',jsonb_build_object('path',p_name))
        and not cicure_private.can_write_record(r.owner_id,r.organization_id,r.kind,r.payload))
    else
      (split_part(p_name,'/',1)=(select auth.uid())::text and not exists(
        select 1 from public.app_records r where r.organization_id is not null and jsonb_path_exists(r.payload,'$.**.storagePath ? (@ == $path)',jsonb_build_object('path',p_name))))
      or exists(select 1 from public.app_records r where r.organization_id is not null and cicure_private.can_read_record(r.owner_id,r.organization_id)
        and jsonb_path_exists(r.payload,'$.**.storagePath ? (@ == $path)',jsonb_build_object('path',p_name)))
    end
  );
$$;
drop policy clinical_files_read_own on storage.objects;
drop policy clinical_files_insert_own on storage.objects;
drop policy clinical_files_update_own on storage.objects;
drop policy clinical_files_delete_own on storage.objects;
create policy clinical_files_authorized_read on storage.objects for select to authenticated using(bucket_id='clinical-files' and cicure_private.media_access(name,false));
create policy clinical_files_authorized_insert on storage.objects for insert to authenticated with check(bucket_id='clinical-files' and cicure_private.media_access(name,true));
create policy clinical_files_authorized_update on storage.objects for update to authenticated using(bucket_id='clinical-files' and cicure_private.media_access(name,true)) with check(bucket_id='clinical-files' and cicure_private.media_access(name,true));
create policy clinical_files_authorized_delete on storage.objects for delete to authenticated using(bucket_id='clinical-files' and cicure_private.media_access(name,true));

revoke all on function cicure_private.media_access(text,boolean) from public,anon;
grant execute on function cicure_private.media_access(text,boolean) to authenticated;
revoke all on function public.save_record(text,uuid,jsonb,bigint,bigint),public.pull_records(uuid,uuid,integer),public.list_activity_events(uuid),public.list_record_revisions(uuid) from public,anon;
grant execute on function public.save_record(text,uuid,jsonb,bigint,bigint),public.pull_records(uuid,uuid,integer),public.list_activity_events(uuid),public.list_record_revisions(uuid) to authenticated;
notify pgrst,'reload schema';
