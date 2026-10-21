begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.test'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.test');

insert into public.profiles (id, display_name, city) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'Seattle'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Ben', 'Seattle'),
  ('cccccccc-0000-0000-0000-000000000000', 'Chloe', 'Seattle');
insert into public.library_books (owner_id, title, author, source, visibility) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Private book', 'Author', 'manual', 'friends_only');
select set_config('test.private_book', (select id::text from public.library_books where title = 'Private book'), true);

select ok((select relrowsecurity from pg_class where oid = 'public.friend_requests'::regclass), 'RLS is enabled on friend_requests');
select ok((select relrowsecurity from pg_class where oid = 'public.friendships'::regclass), 'RLS is enabled on friendships');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.library_books where title = 'Private book'), 0, 'non-friend cannot see a friends-only book');
select throws_ok(
  $$select public.request_book(current_setting('test.private_book')::uuid)$$,
  '42501', null, 'non-friend cannot request a friends-only book'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config(
  'test.friend_request',
  public.send_friend_request('bbbbbbbb-0000-0000-0000-000000000000')::text,
  true
);
reset role;
select is(
  (select status::text from public.friend_requests where id = current_setting('test.friend_request')::uuid),
  'pending',
  'friend request starts pending'
);

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.friend_requests), 0, 'unrelated user cannot read a friend request');
reset role;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.friend_requests), 1, 'recipient can read a friend request');
select lives_ok(
  $$select public.respond_to_friend_request(current_setting('test.friend_request')::uuid, 'accepted')$$,
  'recipient can accept a friend request'
);
reset role;
select is(
  (select status::text from public.friend_requests where id = current_setting('test.friend_request')::uuid),
  'accepted',
  'accepted response updates request state'
);
select is((select count(*)::int from public.friendships), 1, 'acceptance creates one friendship');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.library_books where title = 'Private book'), 1, 'accepted friend can see friends-only books');
select is((select count(*)::int from public.friendships), 1, 'friend can read their friendship');
select throws_ok(
  $$select public.send_friend_request('aaaaaaaa-0000-0000-0000-000000000000')$$,
  '23505', null, 'duplicate friendship request is rejected'
);
select throws_ok(
  $$select public.send_friend_request('bbbbbbbb-0000-0000-0000-000000000000')$$,
  '22023', null, 'self-friend request is rejected'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config(
  'test.friend_request',
  public.send_friend_request('aaaaaaaa-0000-0000-0000-000000000000')::text,
  true
);
select throws_ok(
  $$select public.send_friend_request('aaaaaaaa-0000-0000-0000-000000000000')$$,
  '23505', null, 'only one pending request can exist between two users'
);
select lives_ok(
  $$select public.cancel_friend_request(current_setting('test.friend_request')::uuid)$$,
  'sender can cancel a pending friend request'
);
reset role;
select is(
  (select status::text from public.friend_requests where id = current_setting('test.friend_request')::uuid),
  'cancelled',
  'cancellation updates friend request state'
);

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config(
  'test.friend_request',
  public.send_friend_request('aaaaaaaa-0000-0000-0000-000000000000')::text,
  true
);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.respond_to_friend_request(current_setting('test.friend_request')::uuid, 'declined')$$,
  'recipient can decline a friend request'
);
reset role;
select is(
  (select status::text from public.friend_requests where id = current_setting('test.friend_request')::uuid),
  'declined',
  'decline updates friend request state'
);
select is((select count(*)::int from public.friendships), 1, 'declined request creates no friendship');

insert into public.blocks (blocker_id, blocked_id)
values ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.library_books where title = 'Private book'), 0, 'blocking hides a friends-only book from the blocked friend');
select throws_ok(
  $$select public.send_friend_request('aaaaaaaa-0000-0000-0000-000000000000')$$,
  '42501', null, 'blocked users cannot send friend requests'
);
reset role;

select * from finish();
rollback;
