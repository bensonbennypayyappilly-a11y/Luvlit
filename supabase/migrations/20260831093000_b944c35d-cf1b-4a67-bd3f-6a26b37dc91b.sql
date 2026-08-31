-- Phase 2 follow-up: soft-deleted businesses were still publicly visible.
--
-- Found while verifying the fix above: soft_delete_account() sets businesses.deleted_at and
-- is_live, but never touches status (deleted_at/is_live and status are separate, orthogonal
-- concerns — moderation state vs. "does this account still exist"). The public policy on
-- businesses itself (from the Phase 19 status migration) only checked status = 'live', so a
-- business whose owner deleted their account stayed publicly visible for as long as status
-- happened to still say 'live'. Confirmed empirically against the live database before writing
-- this fix. The five child-table policies from the migration just above inherited the same gap
-- since they were modeled on that same status-only check.
--
-- The storage policy for business-media already gets this right (checks is_live = true and
-- deleted_at is null) — these policies now match that existing, correct pattern.

drop policy if exists "live businesses public" on public.businesses;
create policy "live businesses public" on public.businesses for select
  using (status = 'live' and deleted_at is null);

drop policy if exists "Public can view live businesses" on public.businesses;

drop policy if exists "locations public" on public.locations;
create policy "locations public" on public.locations for select
  using (exists (
    select 1 from public.businesses b
    where b.id = locations.business_id and b.status = 'live' and b.deleted_at is null
  ));

drop policy if exists "delivery public" on public.delivery_areas;
create policy "delivery public" on public.delivery_areas for select
  using (exists (
    select 1 from public.businesses b
    where b.id = delivery_areas.business_id and b.status = 'live' and b.deleted_at is null
  ));

drop policy if exists "staff public" on public.staff;
create policy "staff public" on public.staff for select
  using (exists (
    select 1 from public.businesses b
    where b.id = staff.business_id and b.status = 'live' and b.deleted_at is null
  ));

drop policy if exists "slots public" on public.slots;
create policy "slots public" on public.slots for select
  using (exists (
    select 1 from public.staff s join public.businesses b on b.id = s.business_id
    where s.id = slots.staff_id and b.status = 'live' and b.deleted_at is null
  ));

drop policy if exists "items public" on public.items;
create policy "items public" on public.items for select
  using (
    is_active = true
    and exists (
      select 1 from public.businesses b
      where b.id = items.business_id and b.status = 'live' and b.deleted_at is null
    )
  );
