-- Fixes a gap in the previous migration, caught live-testing Phase 11: owner_email_verified
-- was only kept in sync when an owner's confirmation state CHANGES after their business
-- already exists (the auth.users trigger). A business created for an owner who confirmed
-- their email before onboarding — the common case — got the column's default (false) and
-- nothing ever corrected it, since no auth.users UPDATE event follows. This sets it correctly
-- at insert time from the owner's current state.
create or replace function public.sync_new_business_owner_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select (u.email_confirmed_at is not null) into new.owner_email_verified
  from auth.users u where u.id = new.owner_id;
  return new;
end;
$$;
revoke execute on function public.sync_new_business_owner_verified() from public, anon, authenticated;

create trigger set_owner_verified_on_business_insert
before insert on public.businesses
for each row execute function public.sync_new_business_owner_verified();

-- Also correct any business already created since the previous migration slipped in.
update public.businesses b
set owner_email_verified = (u.email_confirmed_at is not null)
from auth.users u
where u.id = b.owner_id and b.owner_email_verified is distinct from (u.email_confirmed_at is not null);
