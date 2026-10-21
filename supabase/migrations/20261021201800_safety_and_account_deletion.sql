alter table public.borrow_requests
  alter column book_id drop not null,
  add column book_title text,
  add column book_author text,
  add column book_cover_url text,
  add column borrower_name text,
  add column lender_name text;

update public.borrow_requests br
set book_title = lb.title,
    book_author = lb.author,
    book_cover_url = lb.cover_url,
    borrower_name = borrower.display_name,
    lender_name = lender.display_name
from public.library_books lb, public.profiles borrower, public.profiles lender
where lb.id = br.book_id
  and borrower.id = br.borrower_id
  and lender.id = br.lender_id;

alter table public.borrow_requests
  alter column book_title set not null,
  alter column book_author set not null,
  alter column borrower_name set not null,
  alter column lender_name set not null;

alter table public.borrow_requests
  drop constraint borrow_requests_book_id_fkey,
  add constraint borrow_requests_book_id_fkey
    foreign key (book_id) references public.library_books(id) on delete set null,
  drop constraint borrow_requests_borrower_id_fkey,
  drop constraint borrow_requests_lender_id_fkey;

alter table public.request_messages
  drop constraint request_messages_sender_id_fkey;

alter table public.reports
  drop constraint reports_reporter_id_fkey,
  drop constraint reports_reported_user_id_fkey,
  add constraint reports_details_length
    check (details is null or char_length(details) <= 2000);

revoke insert, update, delete on public.reports from anon, authenticated;
grant select on public.reports to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = excluded.public;

create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy avatars_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy avatars_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create function public.populate_borrow_request_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.book_id is not null then
    select lb.title, lb.author, lb.cover_url
      into new.book_title, new.book_author, new.book_cover_url
    from public.library_books lb
    where lb.id = new.book_id;
  end if;
  select p.display_name into new.borrower_name
  from public.profiles p where p.id = new.borrower_id;
  select p.display_name into new.lender_name
  from public.profiles p where p.id = new.lender_id;
  return new;
end;
$$;

create trigger borrow_requests_populate_snapshot
  before insert on public.borrow_requests
  for each row execute function public.populate_borrow_request_snapshot();

create function public.preserve_borrow_history_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.borrow_requests
  set status = case
        when status in ('requested', 'accepted', 'lent') then 'cancelled'::public.request_status
        else status
      end,
      borrower_name = case when borrower_id = old.id then 'Deleted user' else borrower_name end,
      lender_name = case when lender_id = old.id then 'Deleted user' else lender_name end
  where borrower_id = old.id or lender_id = old.id;
  return old;
end;
$$;

create trigger profiles_preserve_borrow_history
  before delete on public.profiles
  for each row execute function public.preserve_borrow_history_on_profile_delete();

drop policy request_messages_insert on public.request_messages;
create policy request_messages_insert on public.request_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.borrow_requests br
      where br.id = request_messages.request_id
        and auth.uid() in (br.borrower_id, br.lender_id)
        and br.status in ('requested', 'accepted', 'lent')
        and not public.users_block_each_other(
          case when br.borrower_id = auth.uid() then br.lender_id else br.borrower_id end
        )
    )
  );

revoke all on function public.populate_borrow_request_snapshot(),
  public.preserve_borrow_history_on_profile_delete()
  from public, anon, authenticated;

drop policy reports_insert on public.reports;
revoke insert on public.reports from authenticated;

create function public.submit_report(
  p_reported_user_id uuid,
  p_reason public.report_reason,
  p_details text default null,
  p_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter_id uuid := auth.uid();
  v_report_id uuid;
begin
  if v_reporter_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_reported_user_id is null or p_reported_user_id = v_reporter_id then
    raise exception 'Cannot report yourself' using errcode = '22023';
  end if;
  if p_reason is null then
    raise exception 'A report reason is required' using errcode = '22023';
  end if;
  if p_details is not null and char_length(p_details) > 2000 then
    raise exception 'Report details must be 2000 characters or fewer' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = p_reported_user_id
  ) then
    raise exception 'Reported user does not exist' using errcode = '23503';
  end if;
  if p_request_id is not null and not exists (
    select 1 from public.borrow_requests br
    where br.id = p_request_id
      and v_reporter_id in (br.borrower_id, br.lender_id)
      and p_reported_user_id = case
        when br.borrower_id = v_reporter_id then br.lender_id
        else br.borrower_id
      end
  ) then
    raise exception 'Request is not associated with this report' using errcode = '42501';
  end if;

  insert into public.reports (reporter_id, reported_user_id, request_id, reason, details)
  values (v_reporter_id, p_reported_user_id, p_request_id, p_reason, nullif(btrim(p_details), ''))
  returning id into v_report_id;
  return v_report_id;
end;
$$;

revoke all on function public.submit_report(uuid, public.report_reason, text, uuid)
  from public, anon;
grant execute on function public.submit_report(uuid, public.report_reason, text, uuid)
  to authenticated;
