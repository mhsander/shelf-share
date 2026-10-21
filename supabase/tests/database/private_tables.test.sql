begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.test'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.test');
insert into public.profiles (id, display_name, city) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'Seattle'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Ben', 'Seattle'),
  ('cccccccc-0000-0000-0000-000000000000', 'Chloe', 'Seattle');
insert into public.library_books (owner_id, title, author, source) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Thread book', 'Author', 'manual');
insert into public.borrow_requests (book_id, borrower_id, lender_id, status)
select id, 'bbbbbbbb-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'requested'
from public.library_books where title = 'Thread book';
select set_config('test.request_id', (select id::text from public.borrow_requests), true);

select ok((select relrowsecurity from pg_class where oid = 'public.request_messages'::regclass), 'RLS is enabled on request_messages');
select ok((select relrowsecurity from pg_class where oid = 'public.reports'::regclass), 'RLS is enabled on reports');
select ok((select relrowsecurity from pg_class where oid = 'public.push_tokens'::regclass), 'RLS is enabled on push_tokens');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.request_messages (request_id, sender_id, body)
    values (current_setting('test.request_id')::uuid, auth.uid(), 'Hello')$$,
  'request participant can add a message'
);
select is((select count(*)::int from public.request_messages), 1, 'request participant can read messages');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.request_messages), 1, 'other request participant can read messages');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.register_push_token('ExponentPushToken[b-token]', 'ios')$$,
  'user can register their own push token'
);
select lives_ok(
  $$select public.submit_report(
    'aaaaaaaa-0000-0000-0000-000000000000', 'spam', null, null
  )$$,
  'user can submit a report through the validated RPC'
);
select is((select count(*)::int from public.reports), 0, 'reports are not readable through the app');
select throws_ok(
  $$insert into public.reports (reporter_id, reported_user_id, reason)
    values (auth.uid(), 'aaaaaaaa-0000-0000-0000-000000000000', 'spam')$$,
  '42501', null, 'user cannot bypass report validation with a direct insert'
);
select throws_ok(
  $$select public.submit_report(
    'cccccccc-0000-0000-0000-000000000000', 'spam', null,
    current_setting('test.request_id')::uuid
  )$$,
  '42501', 'Request is not associated with this report',
  'request reports must identify the other participant'
);
select is((select count(*)::int from public.push_tokens), 1, 'user can read their own push token');
reset role;

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.request_messages), 0, 'unrelated user cannot read request messages');
select is((select count(*)::int from public.push_tokens), 0, 'user cannot read another user''s push token');
select lives_ok(
  $$select public.unregister_push_token('ExponentPushToken[b-token]')$$,
  'user cannot unregister another user''s push token'
);
select is((select count(*)::int from public.push_tokens), 0, 'another user''s token remains private');
select lives_ok(
  $$select public.register_push_token('ExponentPushToken[b-token]', 'android')$$,
  'authenticated user can claim this device token'
);
select is((select count(*)::int from public.push_tokens), 1, 'claimed token belongs to the active user');
select throws_ok(
  $$insert into public.request_messages (request_id, sender_id, body)
    values (current_setting('test.request_id')::uuid, auth.uid(), 'Intrusion')$$,
  '42501', null, 'non-participant cannot add a message'
);
select throws_ok(
  $$insert into public.push_tokens (user_id, expo_push_token, platform)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'ExponentPushToken[spoof]', 'ios')$$,
  '42501', null, 'user cannot register a push token for someone else'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.push_tokens), 0, 'previous account no longer owns the claimed device token');
reset role;

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.unregister_push_token('ExponentPushToken[b-token]')$$,
  'user can unregister their own push token'
);
select is((select count(*)::int from public.push_tokens), 0, 'unregistered token is removed');
reset role;

insert into public.blocks (blocker_id, blocked_id) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.request_messages), 0, 'block hides the request thread from both people');
select throws_ok(
  $$insert into public.request_messages (request_id, sender_id, body)
    values (current_setting('test.request_id')::uuid, auth.uid(), 'Blocked message')$$,
  '42501', null, 'blocked users cannot send request messages'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.request_messages), 0, 'blocker cannot read messages from the blocked user');
reset role;

select * from finish();
rollback;
