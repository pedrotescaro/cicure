-- Only this user's authentication sessions are exposed; credentials and IPs are omitted.
create schema if not exists private;
create or replace function private.list_own_sessions_impl()
returns table(id uuid, created_at timestamptz, last_active timestamptz, user_agent text, is_current boolean)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.created_at, coalesce(s.updated_at,s.created_at), s.user_agent,
    s.id::text = coalesce((select auth.jwt())->>'session_id','')
  from auth.sessions s
  where s.user_id = (select auth.uid()) and (select auth.uid()) is not null
    and (s.not_after is null or s.not_after > now())
  order by s.updated_at desc nulls last limit 50;
$$;
revoke all on function private.list_own_sessions_impl() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.list_own_sessions_impl() to authenticated;
create or replace function public.list_own_sessions()
returns table(id uuid, created_at timestamptz, last_active timestamptz, user_agent text, is_current boolean)
language sql stable security invoker set search_path = ''
as $$ select * from private.list_own_sessions_impl(); $$;
revoke all on function public.list_own_sessions() from public,anon;
grant execute on function public.list_own_sessions() to authenticated;
