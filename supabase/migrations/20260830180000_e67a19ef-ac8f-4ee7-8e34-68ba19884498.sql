-- Phase 11: a real, non-fake trust signal — "Verified" means the business owner has
-- confirmed their email address (auth.users.email_confirmed_at). This is deliberately the
-- only condition used: this app has no phone/OTP auth (email+password only, confirmed by
-- inspecting the sign-in flow), and businesses have no admin-approval gate yet (that's
-- Phase 19) — so email confirmation is the one genuinely verifiable signal that exists today.
-- Kept current via a trigger on auth.users, the same established pattern this schema already
-- uses for handle_new_user()/on_auth_user_created.
alter table public.businesses
  add column if not exists owner_email_verified boolean not null default false;

update public.businesses b
set owner_email_verified = (u.email_confirmed_at is not null)
from auth.users u
where u.id = b.owner_id;

create or replace function public.sync_owner_email_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.businesses set owner_email_verified = (new.email_confirmed_at is not null) where owner_id = new.id;
  return new;
end;
$$;
revoke execute on function public.sync_owner_email_verified() from public, anon, authenticated;

create trigger sync_email_verified_to_businesses
after update of email_confirmed_at on auth.users
for each row execute function public.sync_owner_email_verified();
