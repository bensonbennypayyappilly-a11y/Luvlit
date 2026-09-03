-- Smart Lead Engine V1, part 4: actually wire keyword_synonyms into matching.
--
-- The table was seeded in part 1 but never consulted anywhere — a business with a service
-- literally named "AC Servicing" (no word "repair" in it) would fail the repair gate even
-- though "servicing" -> "repair" is exactly the kind of equivalent-terminology normalization
-- keyword_synonyms exists for. This wires it into both the repair gate and speciality overlap,
-- as a genuine table lookup (not hardcoded) so adding a synonym row later improves matching
-- without a code change — while leaving category matching completely untouched by synonyms,
-- since only category_relations (never synonyms) can bridge a category difference (§6).

-- A couple more clearly-declared spelling-variant synonyms (still identity/near-identity
-- normalization only, nothing that implies a different capability).
insert into public.keyword_synonyms (term, canonical) values
  ('jewelry', 'jewellery'),
  ('jewellery', 'jewellery')
on conflict (term) do nothing;

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
  _biz_specialities_canon text[];
  _req_tags_canon text[];
  _matching_specialities text[];
  _matched_service_name text;
  _has_category_service boolean;
  _repair_matched_service text;
  _repair_terms text[];
begin
  select * into req from public.requirements where id = _requirement_id;
  if not found then
    return;
  end if;

  -- Every raw term whose canonical form is 'repair', plus 'repair' itself — dynamic, so a new
  -- keyword_synonyms row (e.g. 'servicing' -> 'repair') improves this without a code change.
  select array_agg(distinct term) into _repair_terms
    from (select 'repair' as term union select term from public.keyword_synonyms where canonical = 'repair') t;

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
    _repair_matched_service := null;

    -- Stage 1a: category gate — near-absolute. Exact match, or an explicit (never invented)
    -- category_relations row. Synonyms never participate here — only category_relations can
    -- bridge a category difference.
    _exact_category := req.category = any(biz.categories);
    _related_category := exists (
      select 1 from public.category_relations cr
      where cr.category = req.category and cr.related_category = any(biz.categories)
    );
    if not (_exact_category or _related_category) then
      _included := false;
      _exclusion := 'category mismatch';
    end if;

    -- Stage 1b: intent gate.
    if _included and req.intent is not null then
      if req.intent in ('book', 'hire', 'consultation') and not ('appointment' = any(biz.business_types)) then
        _included := false;
        _exclusion := 'does not offer appointments';
      elsif req.intent = 'custom_order' and not ('custom' = any(biz.business_types)) then
        _included := false;
        _exclusion := 'does not offer custom orders';
      elsif req.intent = 'bulk_order' and not ('Bulk Orders' = any(biz.order_types)) then
        _included := false;
        _exclusion := 'does not support bulk orders';
      end if;
    end if;

    -- Stage 1c: location/service-area gate.
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
        if req.city is null or _location_city is distinct from req.city then
          _included := false;
          _exclusion := 'not in the customer''s city for pickup/visit';
        end if;
      elsif req.delivery_preference = 'online' then
        null;
      else
        if req.city is not null and not (_location_city = req.city or _delivers_city or _delivers_pan_india) then
          _included := false;
          _exclusion := 'does not serve this city';
        end if;
      end if;
    end if;

    -- Stage 1d: structured-capability gate (Repair) — now synonym-aware via _repair_terms.
    if _included and req.intent = 'repair' then
      select name into _repair_matched_service
        from (
          select i.name from public.items i
            where i.business_id = biz.id and i.is_active
              and (i.category = req.category or i.name ilike any(array(select '%' || t || '%' from unnest(_repair_terms) t)))
          union all
          select s.name from public.services s
            where s.business_id = biz.id and s.is_active
              and (s.category = req.category or s.name ilike any(array(select '%' || t || '%' from unnest(_repair_terms) t)))
        ) matched
        limit 1;
      if _repair_matched_service is null then
        _included := false;
        _exclusion := 'no repair service listed';
      end if;
    end if;

    -- Stage 1e: keyword_exclusions.
    if _included and exists (
      select 1 from public.keyword_exclusions ke
      where ke.category = req.category and ke.excluded_term = any(biz.categories)
    ) then
      _included := false;
      _exclusion := 'excluded pairing';
    end if;

    -- Stage 2: scoring.
    if _included then
      _cat_score := case when _exact_category then 25 when _related_category then 15 else 0 end;
      if _cat_score > 0 then
        _reasons := _reasons || jsonb_build_object('code', 'category_match', 'detail', req.category);
      end if;

      -- Speciality overlap, synonym-canonicalized on both sides (e.g. "jewelry"/"jewellery"
      -- normalize to the same canonical form before comparing).
      select array_agg(distinct coalesce(ks.canonical, lower(s))) into _biz_specialities_canon
        from unnest(biz.specialities) s
        left join public.keyword_synonyms ks on lower(ks.term) = lower(s);
      select array_agg(distinct coalesce(ks.canonical, lower(t))) into _req_tags_canon
        from unnest(req.speciality_tags) t
        left join public.keyword_synonyms ks on lower(ks.term) = lower(t);
      select array_agg(x) into _matching_specialities
        from unnest(coalesce(_biz_specialities_canon, '{}')) x
        where x = any(coalesce(_req_tags_canon, '{}'));
      if _matching_specialities is not null and array_length(_matching_specialities, 1) > 0 then
        _spec_score := 20;
        _reasons := _reasons || jsonb_build_object('code', 'speciality_match', 'detail', _matching_specialities[1]);
      end if;

      _has_category_service := exists (
        select 1 from public.items i where i.business_id = biz.id and i.is_active and i.category = req.category
        union all
        select 1 from public.services s where s.business_id = biz.id and s.is_active and s.category = req.category
      );

      if _repair_matched_service is not null then
        _matched_service_name := _repair_matched_service;
      else
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
      end if;

      if _matched_service_name is not null then
        _svc_score := 20;
        _reasons := _reasons || jsonb_build_object('code', 'service_match', 'detail', _matched_service_name);
      elsif array_length(req.speciality_tags, 1) is null or array_length(req.speciality_tags, 1) = 0 then
        if _has_category_service then
          _svc_score := 12;
          _reasons := _reasons || jsonb_build_object('code', 'service_match', 'detail', req.category);
        else
          _svc_score := 0;
        end if;
      elsif _has_category_service and _spec_score > 0 then
        _svc_score := 14;
      else
        _svc_score := 0;
      end if;

      if req.intent is not null then
        if req.intent in ('book', 'hire', 'consultation', 'custom_order', 'repair', 'bulk_order') then
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
      elsif req.delivery_preference = 'business_location' then
        _deliv_score := 5;
        _reasons := _reasons || jsonb_build_object('code', 'delivery_match', 'detail', 'At business location');
      else
        _deliv_score := 0;
      end if;

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
