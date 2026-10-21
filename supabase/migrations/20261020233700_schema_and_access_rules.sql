create type public.book_status as enum ('available', 'lent', 'hidden');
create type public.book_source as enum ('manual', 'scan', 'goodreads_csv');
create type public.book_visibility as enum ('public', 'friends_only');
create type public.request_status as enum ('requested', 'accepted', 'declined', 'cancelled', 'lent', 'returned');
create type public.friend_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.report_reason as enum ('not_returned', 'damaged', 'harassment', 'spam', 'other');
create type public.report_status as enum ('open', 'reviewed');
create type public.push_platform as enum ('ios', 'android');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  city text not null check (char_length(btrim(city)) > 0),
  neighborhood text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_request_not_self check (sender_id <> recipient_id)
);
create unique index friend_requests_one_pending_per_direction
  on public.friend_requests (sender_id, recipient_id) where status = 'pending';

create table public.friendships (
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint friendships_ordered check (user_low < user_high)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create table public.library_books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  author text not null check (char_length(btrim(author)) > 0),
  isbn text check (isbn is null or isbn ~ '^[0-9]{13}$'),
  cover_url text,
  personal_rating smallint check (personal_rating between 1 and 5),
  personal_review text check (personal_review is null or char_length(personal_review) <= 5000),
  status public.book_status not null default 'available',
  visibility public.book_visibility not null default 'public',
  source public.book_source not null,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, ''))
  ) stored
);
create unique index library_books_owner_isbn_unique
  on public.library_books (owner_id, isbn) where isbn is not null;
create index library_books_search_idx on public.library_books using gin (search);
create index library_books_owner_idx on public.library_books (owner_id);

create table public.borrow_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.library_books(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  status public.request_status not null default 'requested',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint borrow_request_not_self check (borrower_id <> lender_id)
);
create unique index borrow_requests_one_open_per_borrower
  on public.borrow_requests (book_id, borrower_id)
  where status in ('requested', 'accepted', 'lent');
create unique index borrow_requests_one_lent_per_book
  on public.borrow_requests (book_id) where status = 'lent';
create index borrow_requests_participants_idx
  on public.borrow_requests (borrower_id, lender_id);

create table public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.borrow_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index request_messages_request_idx on public.request_messages (request_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.borrow_requests(id) on delete set null,
  reason public.report_reason not null,
  details text,
  created_at timestamptz not null default now(),
  status public.report_status not null default 'open',
  constraint report_not_self check (reporter_id <> reported_user_id)
);

create table public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique check (char_length(btrim(expo_push_token)) > 0),
  platform public.push_platform not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger library_books_set_updated_at before update on public.library_books
  for each row execute function public.set_updated_at();
create trigger borrow_requests_set_updated_at before update on public.borrow_requests
  for each row execute function public.set_updated_at();
create trigger friend_requests_set_updated_at before update on public.friend_requests
  for each row execute function public.set_updated_at();
create trigger push_tokens_set_updated_at before update on public.push_tokens
  for each row execute function public.set_updated_at();

create function public.users_block_each_other(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_other_user_id is not null
    and auth.uid() <> p_other_user_id
    and exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p_other_user_id)
         or (b.blocker_id = p_other_user_id and b.blocked_id = auth.uid())
    );
$$;
revoke all on function public.users_block_each_other(uuid) from public, anon;
grant execute on function public.users_block_each_other(uuid) to authenticated;

create function public.prevent_direct_lent_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'supabase_admin')
    and (new.status = 'lent' or (old.status = 'lent' and new.status <> 'lent')) then
    raise exception 'Book lending status must be changed through borrow request functions'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger library_books_protect_lent_status
  before update of status on public.library_books
  for each row execute function public.prevent_direct_lent_status();

create function public.prevent_book_delete_with_open_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = old.owner_id)
    and exists (
    select 1 from public.borrow_requests br
    where br.book_id = old.id and br.status in ('requested', 'accepted', 'lent')
  ) then
    raise exception 'Resolve open borrow requests before deleting this book'
      using errcode = '23514';
  end if;
  return old;
end;
$$;
create trigger library_books_prevent_open_request_delete
  before delete on public.library_books
  for each row execute function public.prevent_book_delete_with_open_request();

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.library_books enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.request_messages enable row level security;
alter table public.reports enable row level security;
alter table public.push_tokens enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (not public.users_block_each_other(profiles.id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy friend_requests_read on public.friend_requests for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));
create policy friendships_read on public.friendships for select to authenticated
  using (auth.uid() in (user_low, user_high));

create policy blocks_read on public.blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy blocks_insert on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

create policy library_books_read on public.library_books for select to authenticated
  using (
    owner_id = auth.uid()
    or (
      status = 'available'
      and not public.users_block_each_other(library_books.owner_id)
      and (
        visibility = 'public'
        or exists (
          select 1 from public.friendships f
          where f.user_low = least(auth.uid(), library_books.owner_id)
            and f.user_high = greatest(auth.uid(), library_books.owner_id)
        )
      )
    )
  );
create policy library_books_insert on public.library_books for insert to authenticated
  with check (owner_id = auth.uid());
create policy library_books_update on public.library_books for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy library_books_delete on public.library_books for delete to authenticated
  using (owner_id = auth.uid());

create policy borrow_requests_read on public.borrow_requests for select to authenticated
  using (auth.uid() in (borrower_id, lender_id));

create policy request_messages_read on public.request_messages for select to authenticated
  using (
    exists (
      select 1 from public.borrow_requests br
      where br.id = request_messages.request_id
        and auth.uid() in (br.borrower_id, br.lender_id)
      and not public.users_block_each_other(
        case when br.borrower_id = auth.uid() then br.lender_id else br.borrower_id end
      )
    )
  );
create policy request_messages_insert on public.request_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.borrow_requests br
      where br.id = request_messages.request_id
        and auth.uid() in (br.borrower_id, br.lender_id)
      and not public.users_block_each_other(
        case when br.borrower_id = auth.uid() then br.lender_id else br.borrower_id end
      )
    )
  );

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

create policy push_tokens_read on public.push_tokens for select to authenticated
  using (user_id = auth.uid());
create policy push_tokens_insert on public.push_tokens for insert to authenticated
  with check (user_id = auth.uid());
create policy push_tokens_update on public.push_tokens for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_delete on public.push_tokens for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.profiles, public.friend_requests, public.friendships, public.blocks,
  public.library_books, public.borrow_requests, public.request_messages, public.reports,
  public.push_tokens from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.friend_requests, public.friendships to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update, delete on public.library_books to authenticated;
grant select on public.borrow_requests to authenticated;
grant select, insert on public.request_messages to authenticated;
grant insert on public.reports to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

create function public.send_friend_request(p_recipient_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_request_id uuid;
  v_low uuid;
  v_high uuid;
begin
  if v_sender_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_recipient_id is null or p_recipient_id = v_sender_id then
    raise exception 'Cannot send a friend request to yourself' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_sender_id and b.blocked_id = p_recipient_id)
       or (b.blocker_id = p_recipient_id and b.blocked_id = v_sender_id)
  ) then
    raise exception 'Friend requests are unavailable for this user' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_recipient_id) then
    raise exception 'Recipient profile does not exist' using errcode = '23503';
  end if;
  v_low := least(v_sender_id, p_recipient_id);
  v_high := greatest(v_sender_id, p_recipient_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_low::text || ':' || v_high::text, 0)
  );
  if exists (select 1 from public.friendships f where f.user_low = v_low and f.user_high = v_high) then
    raise exception 'Users are already friends' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.friend_requests fr
    where fr.status = 'pending'
      and ((fr.sender_id = v_sender_id and fr.recipient_id = p_recipient_id)
        or (fr.sender_id = p_recipient_id and fr.recipient_id = v_sender_id))
  ) then
    raise exception 'A friend request is already pending' using errcode = '23505';
  end if;
  insert into public.friend_requests (sender_id, recipient_id)
  values (v_sender_id, p_recipient_id)
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create function public.respond_to_friend_request(p_request_id uuid, p_response text)
returns public.friend_request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.friend_requests%rowtype;
  v_low uuid;
  v_high uuid;
  v_status public.friend_request_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined' using errcode = '22023';
  end if;
  select * into v_request from public.friend_requests
  where id = p_request_id for update;
  if not found or v_request.recipient_id <> auth.uid() then
    raise exception 'Friend request not found' using errcode = '42501';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Friend request is no longer pending' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_request.sender_id and b.blocked_id = v_request.recipient_id)
       or (b.blocker_id = v_request.recipient_id and b.blocked_id = v_request.sender_id)
  ) then
    raise exception 'Friend requests are unavailable for this user' using errcode = '42501';
  end if;
  v_status := p_response::public.friend_request_status;
  update public.friend_requests set status = v_status where id = p_request_id;
  if v_status = 'accepted' then
    v_low := least(v_request.sender_id, v_request.recipient_id);
    v_high := greatest(v_request.sender_id, v_request.recipient_id);
    insert into public.friendships (user_low, user_high) values (v_low, v_high);
  end if;
  return v_status;
end;
$$;

create function public.cancel_friend_request(p_request_id uuid)
returns public.friend_request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.friend_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into v_request from public.friend_requests
  where id = p_request_id for update;
  if not found or v_request.sender_id <> auth.uid() then
    raise exception 'Friend request not found' using errcode = '42501';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Friend request is no longer pending' using errcode = '23514';
  end if;
  update public.friend_requests set status = 'cancelled' where id = p_request_id;
  return 'cancelled';
end;
$$;

create function public.request_book(p_book_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borrower_id uuid := auth.uid();
  v_lender_id uuid;
  v_visibility public.book_visibility;
  v_request_id uuid;
begin
  if v_borrower_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select owner_id, visibility into v_lender_id, v_visibility
    from public.library_books where id = p_book_id and status = 'available' for update;
  if not found then
    raise exception 'Book is unavailable' using errcode = '23514';
  end if;
  if v_lender_id = v_borrower_id then
    raise exception 'Cannot request your own book' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_borrower_id and b.blocked_id = v_lender_id)
       or (b.blocker_id = v_lender_id and b.blocked_id = v_borrower_id)
  ) then
    raise exception 'Book is unavailable' using errcode = '42501';
  end if;
  if v_visibility = 'friends_only' and not exists (
    select 1 from public.friendships f
    where f.user_low = least(v_borrower_id, v_lender_id)
      and f.user_high = greatest(v_borrower_id, v_lender_id)
  ) then
    raise exception 'Book is unavailable' using errcode = '42501';
  end if;
  insert into public.borrow_requests (book_id, borrower_id, lender_id)
  values (p_book_id, v_borrower_id, v_lender_id)
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create function public.respond_to_request(
  p_request_id uuid,
  p_response text,
  p_due_date date default null
)
returns public.request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.borrow_requests%rowtype;
  v_status public.request_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined' using errcode = '22023';
  end if;
  select * into v_request from public.borrow_requests
  where id = p_request_id for update;
  if not found or v_request.lender_id <> auth.uid() then
    raise exception 'Borrow request not found' using errcode = '42501';
  end if;
  if v_request.status <> 'requested' then
    raise exception 'Borrow request is no longer awaiting a response' using errcode = '23514';
  end if;
  v_status := p_response::public.request_status;
  update public.borrow_requests
    set status = v_status,
        due_date = case when v_status = 'accepted' then coalesce(p_due_date, current_date + 21) else null end
    where id = p_request_id;
  return v_status;
end;
$$;

create function public.cancel_request(p_request_id uuid)
returns public.request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.borrow_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into v_request from public.borrow_requests
  where id = p_request_id for update;
  if not found or auth.uid() not in (v_request.borrower_id, v_request.lender_id) then
    raise exception 'Borrow request not found' using errcode = '42501';
  end if;
  if v_request.status not in ('requested', 'accepted') then
    raise exception 'Borrow request cannot be cancelled' using errcode = '23514';
  end if;
  update public.borrow_requests set status = 'cancelled' where id = p_request_id;
  return 'cancelled';
end;
$$;

create function public.mark_lent(p_request_id uuid)
returns public.request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.borrow_requests%rowtype;
  v_book_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select book_id into v_book_id from public.borrow_requests where id = p_request_id;
  if not found then
    raise exception 'Borrow request not found' using errcode = '42501';
  end if;
  perform 1 from public.library_books where id = v_book_id for update;
  select * into v_request from public.borrow_requests where id = p_request_id for update;
  if not found or v_request.lender_id <> auth.uid() then
    raise exception 'Borrow request not found' using errcode = '42501';
  end if;
  if v_request.status <> 'accepted' then
    raise exception 'Only accepted requests can be marked lent' using errcode = '23514';
  end if;
  update public.borrow_requests set status = 'lent' where id = p_request_id;
  update public.library_books set status = 'lent' where id = v_request.book_id;
  update public.borrow_requests
    set status = 'cancelled'
    where book_id = v_request.book_id and id <> p_request_id
      and status in ('requested', 'accepted');
  return 'lent';
end;
$$;

create function public.mark_returned(p_request_id uuid)
returns public.request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.borrow_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into v_request from public.borrow_requests
  where id = p_request_id for update;
  if not found or v_request.lender_id <> auth.uid() then
    raise exception 'Borrow request not found' using errcode = '42501';
  end if;
  if v_request.status <> 'lent' then
    raise exception 'Only lent requests can be marked returned' using errcode = '23514';
  end if;
  update public.borrow_requests set status = 'returned' where id = p_request_id;
  update public.library_books set status = 'available' where id = v_request.book_id;
  return 'returned';
end;
$$;

revoke all on function public.send_friend_request(uuid),
  public.respond_to_friend_request(uuid, text), public.cancel_friend_request(uuid),
  public.request_book(uuid), public.respond_to_request(uuid, text, date),
  public.cancel_request(uuid), public.mark_lent(uuid), public.mark_returned(uuid)
  from public, anon;
grant execute on function public.send_friend_request(uuid),
  public.respond_to_friend_request(uuid, text), public.cancel_friend_request(uuid),
  public.request_book(uuid), public.respond_to_request(uuid, text, date),
  public.cancel_request(uuid), public.mark_lent(uuid), public.mark_returned(uuid)
  to authenticated;