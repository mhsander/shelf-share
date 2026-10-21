begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.test'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.test');
insert into public.profiles (id, display_name, city) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'Seattle'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Ben', 'Seattle'),
  ('cccccccc-0000-0000-0000-000000000000', 'Chloe', 'Seattle');
insert into public.library_books (owner_id, title, author, source, status) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Main book', 'Author', 'manual', 'available'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Second book', 'Author', 'manual', 'available'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Hidden book', 'Author', 'manual', 'hidden');
select set_config('test.main_book', (select id::text from public.library_books where title = 'Main book'), true);
select set_config('test.second_book', (select id::text from public.library_books where title = 'Second book'), true);
select set_config('test.hidden_book', (select id::text from public.library_books where title = 'Hidden book'), true);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$update public.library_books set status = 'lent' where id = current_setting('test.main_book')::uuid$$,
  '42501', null, 'owner cannot bypass the mark_lent function'
);
reset role;
select ok((select relrowsecurity from pg_class where oid = 'public.borrow_requests'::regclass), 'RLS is enabled on borrow_requests');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.request_one', public.request_book(current_setting('test.main_book')::uuid)::text, true);
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_one')::uuid),
  'requested',
  'borrower can request an available book'
);
select throws_ok(
  $$select public.request_book(current_setting('test.main_book')::uuid)$$,
  '23505', null, 'duplicate open request from the same borrower is rejected'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$delete from public.library_books where id = current_setting('test.main_book')::uuid$$,
  '23514', null, 'book with an open request cannot be deleted'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.request_two', public.request_book(current_setting('test.main_book')::uuid)::text, true);
select is(
  (select count(*)::int from public.borrow_requests where id = current_setting('test.request_one')::uuid),
  0,
  'unrelated user cannot read a borrow request'
);
select throws_ok(
  $$select public.respond_to_request(current_setting('test.request_one')::uuid, 'accepted')$$,
  '42501', null, 'non-lender cannot respond to a request'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.respond_to_request(current_setting('test.request_one')::uuid, 'accepted')$$,
  'lender can accept a request'
);
reset role;
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_one')::uuid),
  'accepted',
  'acceptance updates request state'
);
select is(
  (select due_date from public.borrow_requests where id = current_setting('test.request_one')::uuid),
  current_date + 21,
  'acceptance defaults the due date to three weeks'
);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.respond_to_request(current_setting('test.request_one')::uuid, 'accepted')$$,
  '23514', null, 'accepted request cannot be accepted a second time'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.mark_lent(current_setting('test.request_one')::uuid)$$,
  '42501', null, 'borrower cannot mark a book lent'
);
select throws_ok(
  $$insert into public.borrow_requests (book_id, borrower_id, lender_id)
    values (current_setting('test.main_book')::uuid, auth.uid(), 'aaaaaaaa-0000-0000-0000-000000000000')$$,
  '42501', null, 'borrow requests cannot be inserted directly'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.mark_lent(current_setting('test.request_one')::uuid)$$,
  'lender can mark an accepted request lent'
);
reset role;
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_one')::uuid),
  'lent',
  'mark_lent transitions the request to lent'
);
select is(
  (select status::text from public.library_books where id = current_setting('test.main_book')::uuid),
  'lent',
  'mark_lent updates the book status'
);
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_two')::uuid),
  'cancelled',
  'mark_lent cancels other open requests for the book'
);

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.mark_returned(current_setting('test.request_two')::uuid)$$,
  '42501', null, 'non-lender cannot mark a request returned'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.cancel_request(current_setting('test.request_one')::uuid)$$,
  '23514', null, 'lent request cannot be cancelled'
);
select is(
  (select count(*)::int from public.borrow_requests where id = current_setting('test.request_one')::uuid),
  1,
  'borrower can read their request'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*)::int from public.borrow_requests where id = current_setting('test.request_one')::uuid),
  1,
  'lender can read their request'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.request_three', public.request_book(current_setting('test.second_book')::uuid)::text, true);
select lives_ok(
  $$select public.cancel_request(current_setting('test.request_three')::uuid)$$,
  'borrower can cancel a requested request'
);
reset role;
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_three')::uuid),
  'cancelled',
  'borrower cancellation updates request state'
);

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.request_four', public.request_book(current_setting('test.second_book')::uuid)::text, true);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.cancel_request(current_setting('test.request_four')::uuid)$$,
  'lender can cancel a requested request'
);
reset role;
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_four')::uuid),
  'cancelled',
  'lender cancellation updates request state'
);

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.request_five', public.request_book(current_setting('test.second_book')::uuid)::text, true);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.respond_to_request(current_setting('test.request_five')::uuid, 'declined')$$,
  'lender can decline a request'
);
reset role;
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_five')::uuid),
  'declined',
  'decline updates request state'
);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.request_six', public.request_book(current_setting('test.second_book')::uuid)::text, true);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.respond_to_request(current_setting('test.request_six')::uuid, 'accepted')$$,
  'lender can accept a second request'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.cancel_request(current_setting('test.request_six')::uuid)$$,
  'borrower can cancel an accepted request'
);
reset role;
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_six')::uuid),
  'cancelled',
  'cancelling an accepted request updates its state'
);
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.request_seven', public.request_book(current_setting('test.second_book')::uuid)::text, true);
select throws_ok(
  $$select public.cancel_request(current_setting('test.request_five')::uuid)$$,
  '23514', null, 'declined request cannot be cancelled'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.mark_lent(current_setting('test.request_seven')::uuid)$$,
  '23514', null, 'requested request cannot be marked lent'
);
select throws_ok(
  $$select public.respond_to_request(current_setting('test.request_seven')::uuid, 'returned')$$,
  '22023', null, 'unsupported request transition is rejected'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.request_book(current_setting('test.hidden_book')::uuid)$$,
  '23514', null, 'hidden book cannot be requested'
);
select throws_ok(
  $$select public.request_book(current_setting('test.main_book')::uuid)$$,
  '23514', null, 'lent book cannot be requested'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.request_book(current_setting('test.second_book')::uuid)$$,
  '22023', null, 'user cannot request their own book'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.mark_returned(current_setting('test.request_one')::uuid)$$,
  '42501', null, 'borrower cannot mark a request returned'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.mark_returned(current_setting('test.request_one')::uuid)$$,
  'lender can mark a lent request returned'
);
reset role;
select is(
  (select status::text from public.borrow_requests where id = current_setting('test.request_one')::uuid),
  'returned',
  'mark_returned transitions the request to returned'
);
select is(
  (select status::text from public.library_books where id = current_setting('test.main_book')::uuid),
  'available',
  'mark_returned makes the book available'
);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.mark_returned(current_setting('test.request_one')::uuid)$$,
  '23514', null, 'returned request cannot be returned again'
);
reset role;

select * from finish();
rollback;
