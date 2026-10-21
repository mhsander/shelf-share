create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

drop policy push_tokens_insert on public.push_tokens;
drop policy push_tokens_update on public.push_tokens;
drop policy push_tokens_delete on public.push_tokens;
revoke insert, update, delete on public.push_tokens from authenticated;
grant select on public.push_tokens to authenticated;

create function public.register_push_token(
  p_expo_push_token text,
  p_platform public.push_platform
)
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
  if p_expo_push_token !~ '^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception using errcode = '22023', message = 'Invalid Expo push token';
  end if;

  -- A physical device may move between app accounts; its token belongs to the active account only.
  delete from public.push_tokens where expo_push_token = p_expo_push_token;
  insert into public.push_tokens (user_id, expo_push_token, platform)
  values (v_user_id, p_expo_push_token, p_platform)
  on conflict (user_id, expo_push_token)
  do update set platform = excluded.platform, updated_at = now();
end;
$$;

create function public.unregister_push_token(p_expo_push_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  delete from public.push_tokens
  where user_id = auth.uid() and expo_push_token = p_expo_push_token;
end;
$$;

revoke all on function public.register_push_token(text, public.push_platform),
  public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, public.push_platform),
  public.unregister_push_token(text) to authenticated;

create function public.enqueue_push_notification(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  v_url text;
  v_secret text;
begin
  select
    max(decrypted_secret) filter (where name = 'push_webhook_url'),
    max(decrypted_secret) filter (where name = 'push_webhook_secret')
  into v_url, v_secret
  from vault.decrypted_secrets
  where name in ('push_webhook_url', 'push_webhook_secret');

  if v_url is null or v_secret is null then
    raise warning 'Push notification webhook is not configured; event was not delivered';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := p_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-webhook-secret', v_secret
    ),
    timeout_milliseconds := 2000
  );
exception
  when others then
    raise warning 'Could not enqueue push notification webhook: %', sqlerrm;
end;
$$;

create function public.notify_borrow_request_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  perform public.enqueue_push_notification(jsonb_build_object(
    'schema', 'public',
    'table', 'borrow_requests',
    'type', tg_op,
    'record', to_jsonb(new),
    'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    'actor_id', auth.uid()
  ));
  return new;
end;
$$;

create function public.notify_friend_request_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  perform public.enqueue_push_notification(jsonb_build_object(
    'schema', 'public',
    'table', 'friend_requests',
    'type', tg_op,
    'record', to_jsonb(new),
    'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    'actor_id', auth.uid()
  ));
  return new;
end;
$$;

create function public.notify_request_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.enqueue_push_notification(jsonb_build_object(
    'schema', 'public',
    'table', 'request_messages',
    'type', tg_op,
    'record', to_jsonb(new),
    'old_record', null,
    'actor_id', auth.uid()
  ));
  return new;
end;
$$;

revoke all on function public.enqueue_push_notification(jsonb),
  public.notify_borrow_request_change(),
  public.notify_friend_request_change(),
  public.notify_request_message()
  from public, anon, authenticated;

create trigger borrow_requests_push_notification
  after insert or update of status on public.borrow_requests
  for each row execute function public.notify_borrow_request_change();
create trigger friend_requests_push_notification
  after insert or update of status on public.friend_requests
  for each row execute function public.notify_friend_request_change();
create trigger request_messages_push_notification
  after insert on public.request_messages
  for each row execute function public.notify_request_message();

do $migration$
declare
  v_job_id bigint;
begin
  for v_job_id in select jobid from cron.job where jobname = 'shelf-share-due-reminders'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'shelf-share-due-reminders',
    '0 16 * * *',
    $job$select public.enqueue_push_notification('{"type":"DUE_REMINDER"}'::jsonb);$job$
  );
end;
$migration$;
