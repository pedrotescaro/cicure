-- Cicure: owner-scoped records for the current offline-first client contract.
-- Historical prototype migrations are kept under docs/legacy-migrations and
-- must not be replayed against this project.

create table public.app_records (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'profiles', 'patients', 'wounds', 'visits', 'reports', 'products',
    'care_plans', 'prescriptions', 'consents', 'documents', 'referrals',
    'appointments', 'inventory', 'templates'
  )),
  patient_id uuid,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  version bigint not null check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_id, id),
  constraint app_records_patient_owner_fkey foreign key (owner_id, patient_id)
    references public.app_records(owner_id, id) deferrable initially immediate
);

create index app_records_owner_kind_updated_idx
  on public.app_records (owner_id, kind, updated_at desc);
create index app_records_owner_patient_idx
  on public.app_records (owner_id, patient_id) where patient_id is not null;

alter table public.app_records enable row level security;

create policy app_records_read_own on public.app_records
  for select to authenticated
  using (owner_id = (select auth.uid()));
create policy app_records_insert_own on public.app_records
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy app_records_update_own on public.app_records
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.app_records from anon;
grant select, insert, update on public.app_records to authenticated;

create function public.save_record(
  p_kind text,
  p_id uuid,
  p_payload jsonb,
  p_version bigint,
  p_base_version bigint
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_patient uuid;
  v_record public.app_records%rowtype;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_kind not in (
    'profiles', 'patients', 'wounds', 'visits', 'reports', 'products',
    'care_plans', 'prescriptions', 'consents', 'documents', 'referrals',
    'appointments', 'inventory', 'templates'
  ) or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid record' using errcode = '22023';
  end if;
  if p_version < 1 or p_base_version < 0 or p_version <= p_base_version then
    raise exception 'invalid version' using errcode = '22023';
  end if;
  if p_payload->>'id' is distinct from p_id::text then
    raise exception 'record id mismatch' using errcode = '22023';
  end if;
  if p_kind = 'profiles' and p_id <> v_user then
    raise exception 'profile id mismatch' using errcode = '42501';
  end if;

  if p_kind in (
    'wounds', 'visits', 'reports', 'care_plans', 'prescriptions',
    'consents', 'documents', 'referrals', 'appointments'
  ) then
    if p_payload->>'patientId' is null then
      raise exception 'patient required' using errcode = '23502';
    end if;
    v_patient := (p_payload->>'patientId')::uuid;
    if not exists (
      select 1 from public.app_records r
      where r.id = v_patient and r.owner_id = v_user
        and r.kind = 'patients' and r.deleted_at is null
    ) then
      raise exception 'patient unavailable' using errcode = '23503';
    end if;
  end if;
  if p_kind = 'visits' and not exists (
    select 1 from public.app_records r
    where r.id = (p_payload->>'woundId')::uuid and r.owner_id = v_user
      and r.kind = 'wounds' and r.patient_id = v_patient and r.deleted_at is null
  ) then
    raise exception 'wound unavailable' using errcode = '23503';
  end if;

  if p_base_version = 0 then
    insert into public.app_records (id, owner_id, kind, patient_id, payload, version)
    values (p_id, v_user, p_kind, v_patient, p_payload, p_version)
    on conflict (id) do nothing
    returning * into v_record;
  else
    update public.app_records r
      set payload = p_payload,
          version = p_version,
          patient_id = v_patient,
          updated_at = now()
      where r.id = p_id and r.owner_id = v_user and r.kind = p_kind
        and r.version = p_base_version and r.deleted_at is null
      returning * into v_record;
  end if;

  if v_record.id is null then
    select * into v_record from public.app_records
      where id = p_id and owner_id = v_user and kind = p_kind
        and version = p_version and payload = p_payload and deleted_at is null;
    if v_record.id is null then
      raise exception 'version conflict' using errcode = '40001';
    end if;
  end if;

  return jsonb_build_object('kind', v_record.kind, 'id', v_record.id,
    'payload', v_record.payload, 'version', v_record.version);
end;
$$;

create function public.pull_records()
returns table(kind text, id uuid, payload jsonb, version bigint)
language sql security invoker set search_path = ''
as $$
  select r.kind, r.id, r.payload, r.version
  from public.app_records r
  where r.owner_id = (select auth.uid()) and r.deleted_at is null
  order by r.updated_at, r.id;
$$;

revoke all on function public.save_record(text, uuid, jsonb, bigint, bigint) from public, anon;
revoke all on function public.pull_records() from public, anon;
grant execute on function public.save_record(text, uuid, jsonb, bigint, bigint) to authenticated;
grant execute on function public.pull_records() to authenticated;

-- Existing project helper must not be callable through the public Data API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clinical-files', 'clinical-files', false, 10485760,
        array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy clinical_files_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'clinical-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy clinical_files_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'clinical-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy clinical_files_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'clinical-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'clinical-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy clinical_files_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'clinical-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
