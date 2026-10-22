-- Tokens can only be created/read through membership RPCs; raw invitation rows are never exposed.
create policy organization_invitations_deny_direct_read on public.organization_invitations
  for select to authenticated using (false);
