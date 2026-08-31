-- Fixes a real gap in the previous migration, caught live-testing Phase 19: businesses has
-- only ever had one UPDATE policy ("owners update business", owner-only). The guard trigger's
-- admin bypass never gets a chance to run, because RLS filters the row out of the UPDATE's
-- target set before the trigger fires at all -- an admin's status-change update was silently
-- affecting zero rows ("succeeded" with no error, per Postgres's normal RLS-filtered-UPDATE
-- behavior). Mirrors "admins manage categories" / "admins review influencers", the same
-- admin-update pattern already proven elsewhere in this schema, just missing here.
create policy "admins update businesses" on public.businesses for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));
