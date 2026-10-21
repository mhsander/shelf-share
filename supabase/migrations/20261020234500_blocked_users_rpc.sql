create function public.list_blocked_users()
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
    and auth.uid() is not null;
$$;

revoke all on function public.list_blocked_users() from public, anon;
grant execute on function public.list_blocked_users() to authenticated;
