-- Phase 9 (audit fix): featured-placement purchase traced end to end.
--
-- 1. Scope mismatch: the UI sent scope: "pan_india", but the CHECK constraint here only ever
--    allowed ('city','all_india') — every "All India" reservation failed outright. Even patched,
--    getBusinesses()/getBrowseResults() both check `scope === 'all_india'` for the featured
--    flag, so a 'pan_india' row would never have shown as featured anyway. Canonical value is
--    'all_india' (matches the DB constraint and both read paths) — the app-side fix (using that
--    value instead of 'pan_india') lands alongside this migration.
-- 2. No atomicity: capacity check and insert were two separate client round trips (check
--    count, then insert), racy under concurrent requests for the same category+scope+city.
-- 3. No server-side control: plan_tier had no CHECK constraint, and start_date/end_date were
--    entirely client-supplied — a direct REST call (trivial with the public anon key) could set
--    an arbitrary end_date or an unvalidated plan_tier.
--
-- Fixed the same way book_slot() already solved the identical shape of problem: one
-- SECURITY DEFINER RPC does the ownership check, capacity check, and insert together, with
-- start_date/end_date computed server-side (IST) rather than trusted from the client. Direct
-- INSERT is revoked from authenticated so the RPC is the only path in — a caller can still
-- directly UPDATE/DELETE/SELECT their own rows (existing "owners manage featured" policy,
-- unchanged), just not fabricate a new one outside this function.

alter table public.featured_placements
  add constraint featured_placements_plan_tier_check check (plan_tier in ('monthly', 'yearly'));

revoke insert on public.featured_placements from authenticated;
drop policy if exists "owners manage featured" on public.featured_placements;
create policy "owners update featured" on public.featured_placements for update to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owners delete featured" on public.featured_placements for delete to authenticated
  using (public.owns_business(business_id));

-- Keep in sync with FEATURED_CAP in src/lib/constants.ts.
create or replace function public.reserve_featured_placement(
  _business_id uuid,
  _category text,
  _scope text,
  _city text,
  _plan_tier text
)
returns public.featured_placements
language plpgsql security definer set search_path = public as $$
declare
  cap constant int := 5;
  today date;
  new_end date;
  active_count int;
  result public.featured_placements;
begin
  if not public.owns_business(_business_id) then
    raise exception 'Not authorized to reserve a placement for this business';
  end if;
  if _scope not in ('city', 'all_india') then
    raise exception 'Invalid scope: %', _scope;
  end if;
  if _plan_tier not in ('monthly', 'yearly') then
    raise exception 'Invalid plan_tier: %', _plan_tier;
  end if;
  if _scope = 'city' and (_city is null or length(trim(_city)) = 0) then
    raise exception 'City is required for a city-scoped placement';
  end if;
  if _scope = 'all_india' then
    _city := null;
  end if;

  today := (now() at time zone 'Asia/Kolkata')::date;
  new_end := today + (case when _plan_tier = 'monthly' then interval '1 month' else interval '12 months' end);

  -- Serialize concurrent reservations for the same category+scope+city so the capacity check
  -- below and the insert that follows behave as one atomic unit, closing the race the two
  -- separate client round trips used to leave open.
  perform pg_advisory_xact_lock(hashtextextended(coalesce(_category, '') || '|' || _scope || '|' || coalesce(_city, ''), 0));

  select count(*) into active_count
  from public.featured_placements fp
  where fp.category is not distinct from _category
    and fp.scope = _scope
    and (fp.city is not distinct from _city)
    and fp.start_date <= today
    and fp.end_date >= today;

  if active_count >= cap then
    raise exception 'Featured slots full for this location';
  end if;

  insert into public.featured_placements (business_id, category, scope, city, plan_tier, start_date, end_date)
  values (_business_id, _category, _scope, _city, _plan_tier, today, new_end)
  returning * into result;

  return result;
end;
$$;
revoke all on function public.reserve_featured_placement(uuid, text, text, text, text) from public, anon;
grant execute on function public.reserve_featured_placement(uuid, text, text, text, text) to authenticated;
