-- RLS and constraints for public.blocks (spec §5, §8).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.test'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.test');

insert into public.profiles (id, display_name, city) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'Seattle'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Ben', 'Seattle'),
  ('cccccccc-0000-0000-0000-000000000000', 'Chloe', 'Seattle');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.blocks'::regclass),
  'RLS is enabled on blocks'
);

-- a blocks c
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.blocks (blocker_id, blocked_id)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000')$$,
  'user can block someone'
);
select throws_ok(
  $$insert into public.blocks (blocker_id, blocked_id)
    values ('bbbbbbbb-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000')$$,
  '42501', null,
  'cannot create a block on someone else''s behalf'
);
select throws_ok(
  $$insert into public.blocks (blocker_id, blocked_id)
    values ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000')$$,
  '23514', null,
  'cannot block yourself'
);
select is((select count(*)::int from public.blocks), 1, 'blocker can read their own blocks');
reset role;

-- c cannot see that a blocked them
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.blocks), 0, 'blocked user cannot read the block');
delete from public.blocks;
reset role;
select is((select count(*)::int from public.blocks), 1, 'blocked user cannot remove the block');

-- a unblocks c
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
delete from public.blocks where blocked_id = 'cccccccc-0000-0000-0000-000000000000';
reset role;
select is((select count(*)::int from public.blocks), 0, 'blocker can unblock');

select * from finish();
rollback;
