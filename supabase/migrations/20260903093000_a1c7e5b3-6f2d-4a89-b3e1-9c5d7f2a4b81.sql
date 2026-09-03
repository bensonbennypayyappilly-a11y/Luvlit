-- Smart Lead Engine V1, part 2: the matching engine itself.
--
-- Product principle: zero relevant matches is better than one irrelevant lead. The engine must
-- never create a lead merely because a numerical score can be produced — a business must be
-- genuinely capable of fulfilling the requirement.
--
-- One internal evaluator (evaluate_requirement_match) does the full hard-filter-then-score pass
-- for every live candidate business and is reused by two callers: match_requirement_to_businesses
-- (only qualifying rows, used by the submit RPC) and debug_match_requirement (every candidate,
-- admin-only, shows exclusion reasons and the full score breakdown). This avoids maintaining the
-- filter/scoring logic twice.

create or replace function public.evaluate_requirement_match(_requirement_id uuid)
returns table (
  business_id uuid,
  business_name text,
  included boolean,
  exclusion_reason text,
  category_score int,
  speciality_score int,
  service_score int,
  intent_score int,
  location_score int,
  delivery_score int,
  text_score int,
  total_score int,
  reasons jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
  biz record;
  _included boolean;
  _exclusion text;
  _cat_score int;
  _spec_score int;
  _svc_score int;
  _intent_score int;
  _loc_score int;
  _deliv_score int;
  _text_score int;
  _total int;
  _reasons jsonb;
  _exact_category boolean;
  _related_category boolean;
  _location_city text;
  _delivers_city boolean;
  _delivers_pan_india boolean;
  _matching_specialities text[];
  _matched_service_name text;
  _has_category_service boolean;
begin
  select * into req from public.requirements where id = _requirement_id;
  if not found then
    return;
  end if;

  for biz in
    select b.* from public.businesses b
    where b.status = 'live'
      and b.deleted_at is null
      and (req.posted_by_business_id is null or b.id <> req.posted_by_business_id)
  loop
    _included := true;
    _exclusion := null;
    _cat_score := 0; _spec_score := 0; _svc_score := 0; _intent_score := 0;
    _loc_score := 0; _deliv_score := 0; _text_score := 0;
    _reasons := '[]'::jsonb;

    -- Stage 1a: category gate — near-absolute. Exact match, or an explicit (never invented)
    -- category_relations row. Nothing else can substitute for this.
    _exact_category := req.category = any(biz.categories);
    _related_category := exists (
      select 1 from public.category_relations cr
      where cr.category = req.category and cr.related_category = any(biz.categories)
    );
    if not (_exact_category or _related_category) then
      _included := false;
      _exclusion := 'category mismatch';
    end if;

    -- Stage 1b: intent gate — genuine incompatibilities only. Repair is handled separately
    -- below (structured capability), not here, since business_types can't prove repair capability.
    if _included and req.intent is not null then
      if req.intent in ('book', 'hire', 'consultation') and not ('appointment' = any(biz.business_types)) then
        _included := false;
        _exclusion := 'does not offer appointments';
      elsif req.intent = 'custom_order' and not ('custom' = any(biz.business_types)) then
        _included := false;
        _exclusion := 'does not offer custom orders';
      elsif req.intent = 'bulk_order' and not ('Bulk Orders' = any(biz.order_types)) then
        -- Unset/empty order_types is excluded here too (not(any(...)) over an empty array is
        -- true) — empty is never read as a positive capability claim.
        _included := false;
        _exclusion := 'does not support bulk orders';
      end if;
    end if;

    -- Stage 1c: location/service-area gate — branches by what the requirement actually needs,
    -- not one universal radius rule.
    if _included then
      select l.city into _location_city from public.locations l
        where l.business_id = biz.id and l.is_primary limit 1;
      _delivers_city := req.city is not null and exists (
        select 1 from public.delivery_areas d where d.business_id = biz.id and d.city = req.city
      );
      _delivers_pan_india := exists (
        select 1 from public.delivery_areas d where d.business_id = biz.id and d.is_pan_india
      );

      if req.delivery_preference = 'at_my_location' then
        if not (_delivers_city or _delivers_pan_india
                or 'customer_location' = any(biz.service_locations)
                or 'home_visit' = any(biz.service_locations)) then
          _included := false;
          _exclusion := 'does not deliver or serve this location';
        end if;
      elsif req.delivery_preference in ('pickup', 'business_location') then
        -- No geocoding in this project — city equality is the explicit, stated proxy for
        -- "close enough to visit," not extended to "same state."
        if req.city is null or _location_city is distinct from req.city then
          _included := false;
          _exclusion := 'not in the customer''s city for pickup/visit';
        end if;
      elsif req.delivery_preference = 'online' then
        null; -- no location exclusion for online
      else
        -- No delivery preference specified: same fallback the app used before this feature.
        if req.city is not null and not (_location_city = req.city or _delivers_city or _delivers_pan_india) then
          _included := false;
          _exclusion := 'does not serve this city';
        end if;
      end if;
    end if;

    -- Stage 1d: structured-capability gate — currently only Repair. Appointment/custom/product
    -- flags are not evidence of repair capability; requires an actual items/services row.
    if _included and req.intent = 'repair' then
      if not exists (
        select 1 from public.items i
          where i.business_id = biz.id and i.is_active
            and (i.category = req.category or i.search_vector @@ plainto_tsquery('english', 'repair'))
        union all
        select 1 from public.services s
          where s.business_id = biz.id and s.is_active
            and (s.category = req.category or s.search_vector @@ plainto_tsquery('english', 'repair'))
      ) then
        _included := false;
        _exclusion := 'no repair service listed';
      end if;
    end if;

    -- Stage 1e: keyword_exclusions — narrow, conservative, admin-curated only. Not a second
    -- matching engine; empty at launch.
    if _included and exists (
      select 1 from public.keyword_exclusions ke
      where ke.category = req.category and ke.excluded_term = any(biz.categories)
    ) then
      _included := false;
      _exclusion := 'excluded pairing';
    end if;

    -- Stage 2: scoring — only for businesses that survived every hard filter above.
    if _included then
      _cat_score := case when _exact_category then 25 when _related_category then 15 else 0 end;
      if _cat_score > 0 then
        _reasons := _reasons || jsonb_build_object('code', 'category_match', 'detail', req.category);
      end if;

      select array_agg(s) into _matching_specialities
        from unnest(biz.specialities) s
        where lower(s) = any(select lower(t) from unnest(req.speciality_tags) t);
      if _matching_specialities is not null and array_length(_matching_specialities, 1) > 0 then
        _spec_score := 20;
        _reasons := _reasons || jsonb_build_object('code', 'speciality_match', 'detail', _matching_specialities[1]);
      end if;

      -- Structured capability, tiered by specificity (§13): a category-level service alone
      -- does not prove a speciality-specific capability, and earns nothing beyond what Category
      -- already scored.
      select name into _matched_service_name
        from (
          select i.name from public.items i
            where i.business_id = biz.id and i.is_active and i.category = req.category
              and i.name ilike any(array(select '%' || t || '%' from unnest(req.speciality_tags) t))
          union all
          select s.name from public.services s
            where s.business_id = biz.id and s.is_active and s.category = req.category
              and s.name ilike any(array(select '%' || t || '%' from unnest(req.speciality_tags) t))
        ) matched
        limit 1;

      _has_category_service := exists (
        select 1 from public.items i where i.business_id = biz.id and i.is_active and i.category = req.category
        union all
        select 1 from public.services s where s.business_id = biz.id and s.is_active and s.category = req.category
      );

      if _matched_service_name is not null then
        _svc_score := 20;
        _reasons := _reasons || jsonb_build_object('code', 'service_match', 'detail', _matched_service_name);
      elsif _has_category_service and _spec_score > 0 then
        _svc_score := 14;
      else
        _svc_score := 0;
      end if;

      if req.intent is not null then
        if req.intent in ('book', 'hire', 'consultation', 'custom_order', 'repair', 'bulk_order') then
          -- Already hard-gated above — passing the gate is itself the proof.
          _intent_score := 15;
          _reasons := _reasons || jsonb_build_object('code', 'intent_match', 'detail', req.intent);
        elsif req.intent = 'buy' and 'product' = any(biz.business_types) then
          _intent_score := 15;
          _reasons := _reasons || jsonb_build_object('code', 'intent_match', 'detail', req.intent);
        elsif req.intent = 'online_service' and ('Online Orders' = any(biz.order_types) or 'online' = any(biz.service_locations)) then
          _intent_score := 15;
          _reasons := _reasons || jsonb_build_object('code', 'intent_match', 'detail', req.intent);
        elsif req.intent = 'delivery' and biz.delivery_available then
          _intent_score := 15;
          _reasons := _reasons || jsonb_build_object('code', 'intent_match', 'detail', req.intent);
        elsif req.intent = 'pickup' and biz.pickup_available then
          _intent_score := 15;
          _reasons := _reasons || jsonb_build_object('code', 'intent_match', 'detail', req.intent);
        else
          _intent_score := 8;
        end if;
      end if;

      if req.intent = 'online_service' or req.delivery_preference = 'online' then
        _loc_score := 10;
        _reasons := _reasons || jsonb_build_object('code', 'location_match', 'detail', 'Online');
      elsif _location_city is not null and req.city is not null and _location_city = req.city then
        _loc_score := 10;
        _reasons := _reasons || jsonb_build_object('code', 'location_match', 'detail', req.city);
      elsif _delivers_city then
        _loc_score := 10;
        _reasons := _reasons || jsonb_build_object('code', 'location_match', 'detail', req.city);
      elsif _delivers_pan_india then
        _loc_score := 6;
        _reasons := _reasons || jsonb_build_object('code', 'location_match', 'detail', 'Pan-India');
      else
        _loc_score := 0;
      end if;

      if req.delivery_preference = 'pickup' and biz.pickup_available then
        _deliv_score := 5;
        _reasons := _reasons || jsonb_build_object('code', 'delivery_match', 'detail', 'Pickup available');
      elsif req.delivery_preference = 'at_my_location' and biz.delivery_available then
        _deliv_score := 5;
        _reasons := _reasons || jsonb_build_object('code', 'delivery_match', 'detail', 'Delivery available');
      elsif req.delivery_preference = 'online' and 'online' = any(biz.service_locations) then
        _deliv_score := 5;
        _reasons := _reasons || jsonb_build_object('code', 'delivery_match', 'detail', 'Online service');
      else
        _deliv_score := 0;
      end if;

      -- Text/FTS relevance — capped at 5 so it can never be decisive by itself.
      _text_score := least(5, round((ts_rank(biz.search_vector, plainto_tsquery('english', coalesce(req.description, ''))) * 50)::numeric)::int);

      _total := _cat_score + _spec_score + _svc_score + _intent_score + _loc_score + _deliv_score + _text_score;
      if _total < 60 then
        _included := false;
        _exclusion := 'below relevance threshold';
      end if;
    end if;

    if not _included then
      _cat_score := null; _spec_score := null; _svc_score := null; _intent_score := null;
      _loc_score := null; _deliv_score := null; _text_score := null; _total := null;
      _reasons := '[]'::jsonb;
    end if;

    business_id := biz.id;
    business_name := biz.name;
    included := _included;
    exclusion_reason := _exclusion;
    category_score := _cat_score;
    speciality_score := _spec_score;
    service_score := _svc_score;
    intent_score := _intent_score;
    location_score := _loc_score;
    delivery_score := _deliv_score;
    text_score := _text_score;
    total_score := _total;
    reasons := _reasons;
    return next;
  end loop;
end;
$$;
revoke all on function public.evaluate_requirement_match(uuid) from public, anon, authenticated;

-- Only qualifying (included = true, so already >= 60) rows — this is what the submit RPC uses
-- to decide who actually receives a lead. The client never sees this directly.
create or replace function public.match_requirement_to_businesses(_requirement_id uuid)
returns table (business_id uuid, score int, reasons jsonb)
language sql
security definer
set search_path = public
as $$
  select business_id, total_score, reasons
  from public.evaluate_requirement_match(_requirement_id)
  where included
  order by total_score desc;
$$;
revoke all on function public.match_requirement_to_businesses(uuid) from public, anon, authenticated;

-- Admin-only debug/audit tool: every candidate considered, matched or not, with the full
-- per-dimension breakdown and exclusion reason. Not a required product surface — called
-- directly (script or SQL editor) during verification; a dedicated admin page is an optional
-- later follow-up, not a V1 dependency.
create or replace function public.debug_match_requirement(_requirement_id uuid)
returns table (
  business_id uuid,
  business_name text,
  included boolean,
  exclusion_reason text,
  category_score int,
  speciality_score int,
  service_score int,
  intent_score int,
  location_score int,
  delivery_score int,
  text_score int,
  total_score int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;
  return query
    select e.business_id, e.business_name, e.included, e.exclusion_reason,
           e.category_score, e.speciality_score, e.service_score, e.intent_score,
           e.location_score, e.delivery_score, e.text_score, e.total_score
    from public.evaluate_requirement_match(_requirement_id) e;
end;
$$;
revoke all on function public.debug_match_requirement(uuid) from public, anon;
grant execute on function public.debug_match_requirement(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_requirement_with_matches, rewritten: the server computes and validates matches
-- itself now — the client submits the structured requirement only and never supplies (or
-- influences) which businesses receive a lead. Closes the previous city/delivery
-- re-validation gap as a natural side effect (the old version only re-checked category+live
-- status server-side; this one runs the full hard-filter-then-score pass server-side).
-- ---------------------------------------------------------------------------
drop function if exists public.submit_requirement_with_matches(text, text, text, numeric, text[], uuid[]);

create or replace function public.submit_requirement_with_matches(
  _category text,
  _description text,
  _title text default null,
  _city text default null,
  _budget numeric default null,
  _image_urls text[] default '{}',
  _intent text default null,
  _speciality_tags text[] default '{}',
  _delivery_preference text default null,
  _quantity integer default null,
  _needed_before date default null,
  _urgent boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  own_business_id uuid;
  poster_type text;
  poster_id uuid;
  new_requirement_id uuid;
  m record;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into own_business_id from public.businesses where owner_id = caller_id and deleted_at is null;
  poster_type := case when own_business_id is not null then 'business' else 'customer' end;
  poster_id := coalesce(own_business_id, caller_id);

  insert into public.requirements (
    posted_by_type, posted_by_user_id, posted_by_business_id,
    category, description, title, city, budget, image_urls,
    intent, speciality_tags, delivery_preference, quantity, needed_before, urgent
  ) values (
    poster_type, caller_id, own_business_id,
    _category, _description, _title, _city, _budget, coalesce(_image_urls, '{}'),
    _intent, coalesce(_speciality_tags, '{}'), _delivery_preference, _quantity, _needed_before, coalesce(_urgent, false)
  ) returning id into new_requirement_id;

  for m in select * from public.match_requirement_to_businesses(new_requirement_id) loop
    insert into public.leads (requirement_id, matched_business_id, status, match_score, match_reasons)
    values (new_requirement_id, m.business_id, 'new', m.score, m.reasons);

    insert into public.conversations (party_a_id, party_a_type, party_b_id, party_b_type, requirement_id)
    values (poster_id, poster_type, m.business_id, 'business', new_requirement_id);
  end loop;

  return new_requirement_id;
end;
$$;
revoke all on function public.submit_requirement_with_matches(text, text, text, text, numeric, text[], text, text[], text, integer, date, boolean) from public, anon;
grant execute on function public.submit_requirement_with_matches(text, text, text, text, numeric, text[], text, text[], text, integer, date, boolean) to authenticated;
