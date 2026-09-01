-- Phase 3: Products/Services + Appointments.
--
-- 1) Services didn't exist as a real entity anywhere — only informal freeform text inside a
-- website-builder "services" section, and staff.specializations used loosely as service tags in
-- the booking widget. This gives services the same real, relational home items/products already
-- have, mirrored column-for-column (name/description/price/image/is_active) plus what a service
-- specifically needs (duration_minutes) that a physical product doesn't.
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price numeric,
  duration_minutes integer not null default 30,
  category text,
  image_url text,
  is_active boolean not null default true,
  position integer not null default 0
);
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
-- Mirrors items' current (Phase 19-updated) public policy exactly: only visible once the
-- owning business is actually live, not just "not deleted".
create policy "services public" on public.services for select
  using (
    is_active = true
    and exists (
      select 1 from public.businesses b
      where b.id = services.business_id and b.status = 'live' and b.deleted_at is null
    )
  );
create policy "owners manage services" on public.services for all to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- 2) Products: category (optional — a business that doesn't need one just leaves it blank, e.g.
-- a bakery grouping by "Cakes"/"Cookies") and position (explicit manual reorder, replacing the
-- current alphabetical-only order).
alter table public.items
  add column if not exists category text,
  add column if not exists position integer not null default 0;

-- 3) Staff availability gaps confirmed by audit: book_slot/cancel_booking/reschedule_booking are
-- already atomic and double-booking-safe (row-locked compare-and-increment), so no change there.
-- What's genuinely missing: a way to block specific calendar dates (holidays) without hand-editing
-- every slot, and a gap between back-to-back appointments.
alter table public.staff
  add column if not exists blocked_dates text[] not null default '{}'::text[],
  add column if not exists buffer_minutes integer not null default 0;
