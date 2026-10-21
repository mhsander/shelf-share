-- RLS, constraints and search for public.library_books (spec §5, §6.5, §8).
-- Users a, b, c. a has blocked c.
-- a owns: a-available, a-hidden, a-lent. b owns b-available. c owns c-available.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.test'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.test');

insert into public.profiles (id, display_name, city) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'Seattle'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Ben', 'Seattle'),
  ('cccccccc-0000-0000-0000-000000000000', 'Chloe', 'Seattle');

insert into public.blocks (blocker_id, blocked_id) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000');

insert into public.library_books (owner_id, title, author, status, source) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a-available', 'Ursula K. Le Guin', 'available', 'manual'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a-hidden', 'Author', 'hidden', 'manual'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a-lent', 'Author', 'lent', 'manual'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b-available', 'Author', 'available', 'scan'),
  ('cccccccc-0000-0000-0000-000000000000', 'c-available', 'Author', 'available', 'goodreads_csv');

-- Schema
select ok(
  (select relrowsecurity from pg_class where oid = 'public.library_books'::regclass),
  'RLS is enabled on library_books'
);
select col_default_is('public', 'library_books', 'status', 'available'::public.book_status, 'status defaults to available');

-- Anonymous users see nothing
set local role anon;
select is((select count(*)::int from public.library_books), 0, 'anon cannot read books');
reset role;

-- b sees every available book plus nothing hidden or lent from others
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  'select title from public.library_books order by title',
  array['a-available', 'b-available', 'c-available'],
  'others see only available books'
);

-- b cannot change, delete, or create a's books
update public.library_books set title = 'Hacked' where title = 'a-available';
delete from public.library_books where title = 'a-available';
select throws_ok(
  $$insert into public.library_books (owner_id, title, author, source)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'Planted', 'Author', 'manual')$$,
  '42501', null,
  'cannot add a book to another user''s library'
);
reset role;

select ok(
  exists (select 1 from public.library_books where title = 'a-available'),
  'cannot update or delete another user''s book'
);

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*)::int from public.library_books where owner_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'blocked user cannot see the blocker''s books'
);
reset role;

-- a sees all their own books and b's, but not c's (blocked)
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  'select title from public.library_books order by title',
  array['a-available', 'a-hidden', 'a-lent', 'b-available'],
  'owner sees all own books; blocker cannot see blocked user''s books'
);

-- a manages their own books
select lives_ok(
  $$insert into public.library_books (owner_id, title, author, isbn, personal_rating, source)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'Piranesi', 'Susanna Clarke', '9781635575637', 5, 'scan')$$,
  'owner can add a book'
);
select lives_ok(
  $$update public.library_books set status = 'hidden' where title = 'Piranesi'$$,
  'owner can update their book'
);
select throws_ok(
  $$update public.library_books set owner_id = 'bbbbbbbb-0000-0000-0000-000000000000' where title = 'Piranesi'$$,
  '42501', null,
  'owner cannot give a book to another user'
);
select throws_ok(
  $$insert into public.library_books (owner_id, title, author, isbn, source)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'Piranesi again', 'Susanna Clarke', '9781635575637', 'goodreads_csv')$$,
  '23505', null,
  'same ISBN twice in one library is rejected'
);
select throws_ok(
  $$insert into public.library_books (owner_id, title, author, isbn, source)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'Bad ISBN', 'Author', '0-7432-7356-7', 'manual')$$,
  '23514', null,
  'ISBN must be 13 digits'
);
select throws_ok(
  $$insert into public.library_books (owner_id, title, author, personal_rating, source)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'Bad rating', 'Author', 0, 'manual')$$,
  '23514', null,
  'rating must be 1-5'
);
select throws_ok(
  format($$insert into public.library_books (owner_id, title, author, personal_review, source)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'Long review', 'Author', %L, 'manual')$$, repeat('x', 5001)),
  '23514', null,
  'review over 5,000 characters is rejected'
);
select throws_ok(
  $$insert into public.library_books (owner_id, title, author, source)
    values ('aaaaaaaa-0000-0000-0000-000000000000', ' ', 'Author', 'manual')$$,
  '23514', null,
  'blank title is rejected'
);
delete from public.library_books where title = 'Piranesi';
select ok(
  not exists (select 1 from public.library_books where title = 'Piranesi'),
  'owner can delete their book'
);
reset role;

-- The same ISBN in two different libraries is fine
select lives_ok(
  $$insert into public.library_books (owner_id, title, author, isbn, source) values
    ('aaaaaaaa-0000-0000-0000-000000000000', 'Piranesi', 'Susanna Clarke', '9781635575637', 'scan'),
    ('bbbbbbbb-0000-0000-0000-000000000000', 'Piranesi', 'Susanna Clarke', '9781635575637', 'scan')$$,
  'two users can own the same ISBN'
);

-- Full-text search over title and author
select results_eq(
  $$select title from public.library_books where search @@ websearch_to_tsquery('simple', 'le guin')$$,
  array['a-available'],
  'search matches author words'
);

-- Deleting a profile deletes its books
delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000000';
select ok(
  not exists (select 1 from public.library_books where owner_id = 'bbbbbbbb-0000-0000-0000-000000000000'),
  'books are deleted with their owner'
);

select * from finish();
rollback;
