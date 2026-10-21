begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.test');
insert into public.profiles (id, display_name, city) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'Seattle'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Ben', 'Seattle');
insert into public.blocks (blocker_id, blocked_id)
values ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000');

select ok(
  has_function_privilege('authenticated', 'public.list_blocked_users()', 'EXECUTE'),
  'authenticated users can call their blocked-user list'
);
select ok(
  not has_function_privilege('anon', 'public.list_blocked_users()', 'EXECUTE'),
  'anonymous users cannot call the blocked-user list'
);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$select id, display_name from public.list_blocked_users()$$,
  $$values ('bbbbbbbb-0000-0000-0000-000000000000'::uuid, 'Ben'::text)$$,
  'user can read only names from their own blocked list'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.list_blocked_users()), 0, 'another user cannot read the blocker''s list');
reset role;

select * from finish();
rollback;
