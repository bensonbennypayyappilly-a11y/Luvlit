-- Phase 10: reviews, tied to a real interaction (a booking whose appointment date has
-- passed) to deter fake reviews — the only genuinely verifiable "this happened" signal that
-- exists in the schema today. A quote sent in chat has no acceptance/completion state (Phase
-- 8-9 deliberately didn't add one), so it isn't a safe gate; a booking with a past slot date
-- is. Businesses with no booking system will simply have no reviews yet, honestly, rather
-- than being gated on a weaker, gameable signal like "a conversation exists".
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public" on public.reviews for select using (true);

create or replace function public.can_review_booking(_booking_id uuid, _business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b
    join public.slots s on s.id = b.slot_id
    where b.id = _booking_id
      and b.business_id = _business_id
      and b.customer_user_id = auth.uid()
      and b.status <> 'cancelled'
      and s.date < current_date
  )
$$;
revoke execute on function public.can_review_booking(uuid, uuid) from anon;

create policy "customer reviews own completed booking" on public.reviews for insert to authenticated
  with check (customer_user_id = auth.uid() and public.can_review_booking(booking_id, business_id));
create policy "author manages own review" on public.reviews for update to authenticated
  using (customer_user_id = auth.uid())
  with check (customer_user_id = auth.uid() and public.can_review_booking(booking_id, business_id));
create policy "author deletes own review" on public.reviews for delete to authenticated
  using (customer_user_id = auth.uid());

-- Denormalized aggregate on businesses, trigger-maintained, so browse/search listing queries
-- never need to join+aggregate reviews per row (the same "don't load everything to filter in
-- JS" concern Phase 1 already fixed for the main listing query).
alter table public.businesses
  add column if not exists review_count integer not null default 0,
  add column if not exists review_avg numeric;

create or replace function public.refresh_business_review_stats()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_business_id uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses b
  set review_count = stats.cnt, review_avg = stats.avg_rating
  from (
    select count(*) as cnt, avg(rating)::numeric(3,2) as avg_rating
    from public.reviews where business_id = target_business_id
  ) stats
  where b.id = target_business_id;
  return null;
end;
$$;
revoke execute on function public.refresh_business_review_stats() from public, anon, authenticated;

create trigger reviews_refresh_business_stats
after insert or update or delete on public.reviews
for each row execute function public.refresh_business_review_stats();
