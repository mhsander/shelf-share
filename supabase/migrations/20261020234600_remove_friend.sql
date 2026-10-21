create function public.remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_friend_id = v_user_id then
    raise exception using errcode = '22023', message = 'Cannot remove yourself';
  end if;

  delete from public.friendships
  where user_low = least(v_user_id, p_friend_id)
    and user_high = greatest(v_user_id, p_friend_id);
  if not found then
    raise exception using errcode = 'P0002', message = 'Friendship not found';
  end if;
end;
$$;

revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;
