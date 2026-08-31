-- Phase 2 (audit fix): a business's operational data must not remain publicly queryable once
-- the business itself isn't live (draft/pending/rejected/suspended/soft-deleted). The parent
-- businesses row already correctly hides in that case ("live businesses public" checks
-- status = 'live'), but locations/delivery_areas/staff/slots/items never picked up the same
-- check when the status lifecycle replaced the old is_live boolean (Phase 19) — each only had
-- a blanket `using (true)` (or, for items, `is_active = true`) public policy.
--
-- Each table also keeps its existing owner-management policy untouched (all are separate,
-- OR'd "for all ... using (owns_business(business_id))" policies) — an owner can still read
-- and edit their own staff/slots/locations/items regardless of status, exactly as before.

drop policy if exists "locations public" on public.locations;
create policy "locations public" on public.locations for select
  using (exists (select 1 from public.businesses b where b.id = locations.business_id and b.status = 'live'));

drop policy if exists "delivery public" on public.delivery_areas;
create policy "delivery public" on public.delivery_areas for select
  using (exists (select 1 from public.businesses b where b.id = delivery_areas.business_id and b.status = 'live'));

drop policy if exists "staff public" on public.staff;
create policy "staff public" on public.staff for select
  using (exists (select 1 from public.businesses b where b.id = staff.business_id and b.status = 'live'));

drop policy if exists "slots public" on public.slots;
create policy "slots public" on public.slots for select
  using (exists (
    select 1 from public.staff s join public.businesses b on b.id = s.business_id
    where s.id = slots.staff_id and b.status = 'live'
  ));

drop policy if exists "items public" on public.items;
create policy "items public" on public.items for select
  using (
    is_active = true
    and exists (select 1 from public.businesses b where b.id = items.business_id and b.status = 'live')
  );
