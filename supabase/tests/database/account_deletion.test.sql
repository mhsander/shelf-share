begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.test');
insert into public.profiles (id, display_name, city) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'Seattle'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Ben', 'Seattle');
insert into public.library_books (owner_id, title, author, source)
values ('aaaaaaaa-0000-0000-0000-000000000000', 'History book', 'Author', 'manual');
insert into public.borrow_requests (book_id, borrower_id, lender_id)
select id, 'bbbbbbbb-0000-0000-0000-000000000000', owner_id
from public.library_books where title = 'History book';
select set_config('test.request_id', (select id::text from public.borrow_requests), true);
insert into public.request_messages (request_id, sender_id, body)
values (
  current_setting('test.request_id')::uuid,
  'aaaaaaaa-0000-0000-0000-000000000000',
  'Please let me know when it is ready.'
);
insert into public.reports (reporter_id, reported_user_id, request_id, reason)
values (
  'bbbbbbbb-0000-0000-0000-000000000000',
  'aaaaaaaa-0000-0000-0000-000000000000',
  current_setting('test.request_id')::uuid,
  'not_returned'
);

delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000000';

select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_id')::uuid),
  'cancelled',
  'active requests are cancelled when an account is deleted'
);
select is(
  (select book_id from public.borrow_requests where id = current_setting('test.request_id')::uuid),
  null::uuid,
  'the deleted owner book is detached from request history'
);
select is(
  (select book_title from public.borrow_requests where id = current_setting('test.request_id')::uuid),
  'History book',
  'request history retains the book title'
);
select is(
  (select lender_name from public.borrow_requests where id = current_setting('test.request_id')::uuid),
  'Deleted user',
  'the deleted participant is anonymized in request history'
);
select is(
  (select lender_deleted from public.borrow_requests where id = current_setting('test.request_id')::uuid),
  true,
  'deleted participant state is distinguishable from a profile hidden by blocking'
);
select is(
  (select count(*)::int from public.request_messages
   where request_id = current_setting('test.request_id')::uuid),
  1,
  'request messages remain available to the other participant'
);
select is(
  (select count(*)::int from public.reports
   where reported_user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  1,
  'admin report history survives deletion of the reported account'
);
select is(
  (select count(*)::int from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'the public profile is removed'
);
select is(
  (select count(*)::int from public.library_books
   where owner_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'the deleted account library is removed'
);
select is(
  (select count(*)::int from public.borrow_requests
   where id = current_setting('test.request_id')::uuid),
  1,
  'the borrow request itself remains'
);

select * from finish();
rollback;
