-- RLS and constraints for public.profiles (spec §5, §8).
-- Users: a, b, c have profiles; e has none. a has blocked c.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.test'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.test'),
  ('eeeeeeee-0000-0000-0000-000000000000', 'e@example.test');

insert into public.profiles (id, display_name, city) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'Seattle'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Ben', 'Seattle'),
  ('cccccccc-0000-0000-0000-000000000000', 'Chloe', 'Seattle');

insert into public.blocks (blocker_id, blocked_id) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000');

-- Schema
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select hasnt_column('public', 'profiles', 'email', 'profiles has no email column');

-- Anonymous users see nothing
set local role anon;
select is((select count(*)::int from public.profiles), 0, 'anon cannot read profiles');
reset role;

-- a (the blocker) sees a and b, not c
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  'select display_name from public.profiles order by display_name',
  array['Ana', 'Ben'],
  'blocker cannot see the user they blocked'
);

-- a can update their own row but not someone else's
update public.profiles set display_name = 'Ana R.' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
update public.profiles set display_name = 'Hacked' where id = 'bbbbbbbb-0000-0000-0000-000000000000';
select throws_ok(
  $$insert into public.profiles (id, display_name, city)
    values ('eeeeeeee-0000-0000-0000-000000000000', 'Not mine', 'Seattle')$$,
  '42501', null,
  'cannot create a profile for another user'
);
delete from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000';
reset role;

select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'Ana R.',
  'owner can update their own profile'
);
select is(
  (select display_name from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000000'),
  'Ben',
  'cannot update another user''s profile'
);
select ok(
  exists (select 1 from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'users cannot delete profiles directly'
);

-- c (the blocked user) sees b and c, not a
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  'select display_name from public.profiles order by display_name',
  array['Ben', 'Chloe'],
  'blocked user cannot see the blocker'
);
reset role;

-- b (uninvolved) sees everyone
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.profiles), 3, 'uninvolved user sees all profiles');
reset role;

-- e completes their own profile; validation applies
select set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.profiles (id, display_name, city)
    values ('eeeeeeee-0000-0000-0000-000000000000', '   ', 'Seattle')$$,
  '23514', null,
  'blank display name is rejected'
);
select throws_ok(
  format($$insert into public.profiles (id, display_name, city)
    values ('eeeeeeee-0000-0000-0000-000000000000', %L, 'Seattle')$$, repeat('x', 61)),
  '23514', null,
  'display name over 60 characters is rejected'
);
select throws_ok(
  $$insert into public.profiles (id, display_name, city)
    values ('eeeeeeee-0000-0000-0000-000000000000', 'Eli', ' ')$$,
  '23514', null,
  'blank city is rejected'
);
select lives_ok(
  $$insert into public.profiles (id, display_name, city, neighborhood)
    values ('eeeeeeee-0000-0000-0000-000000000000', 'Eli', 'Seattle', 'Ballard')$$,
  'user can create their own profile'
);
reset role;

-- Deleting the auth user deletes the profile
delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000000';
select ok(
  not exists (select 1 from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000000'),
  'profile is deleted with the auth user'
);

select * from finish();
rollback;
