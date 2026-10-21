alter table public.borrow_requests
  add column borrower_deleted boolean not null default false,
  add column lender_deleted boolean not null default false;

create or replace function public.preserve_borrow_history_on_profile_delete()
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
      lender_name = case when lender_id = old.id then 'Deleted user' else lender_name end,
      borrower_deleted = borrower_deleted or borrower_id = old.id,
      lender_deleted = lender_deleted or lender_id = old.id
  where borrower_id = old.id or lender_id = old.id;
  return old;
end;
$$;

revoke all on function public.preserve_borrow_history_on_profile_delete()
  from public, anon, authenticated;
