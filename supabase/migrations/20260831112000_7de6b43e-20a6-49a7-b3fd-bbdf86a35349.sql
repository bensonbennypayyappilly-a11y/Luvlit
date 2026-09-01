-- Phase 7 (audit fix): posting a requirement did requirements -> leads -> conversations as
-- three separate, non-transactional client writes. A failure between steps could leave a lead
-- with no usable conversation (the business gets a lead they can never respond in), or a
-- requirement with no leads at all, while the customer sees an error implying nothing saved
-- when a partial write may already exist.
--
-- The category+city/delivery-area MATCHING query stays exactly where it is (a plain client-side
-- read, no side effects, nothing to make atomic) — only the WRITE sequence moves into one
-- SECURITY DEFINER RPC, matching book_slot()'s shape: one function, one transaction, succeeds
-- or fails as a unit. Who's posting (customer vs. their own business) is resolved server-side
-- from auth.uid() rather than trusted from the client, same principle as reserve_featured_placement.
-- Each matched business id is re-validated (live + actually in this category) before a lead or
-- conversation is created for it — the client's match list is a convenience, not something to
-- trust outright, since a caller could otherwise pass arbitrary business ids straight to the API.
create or replace function public.submit_requirement_with_matches(
  _category text,
  _description text,
  _city text,
  _budget numeric,
  _image_urls text[],
  _matched_business_ids uuid[]
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  caller_id uuid := auth.uid();
  own_business_id uuid;
  poster_type text;
  poster_id uuid;
  new_requirement_id uuid;
  biz_id uuid;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into own_business_id from public.businesses
  where owner_id = caller_id and deleted_at is null
  limit 1;

  poster_type := case when own_business_id is not null then 'business' else 'customer' end;
  poster_id := coalesce(own_business_id, caller_id);

  insert into public.requirements
    (posted_by_type, posted_by_user_id, posted_by_business_id, category, description, city, budget, image_urls)
  values
    (poster_type, caller_id, own_business_id, _category, _description, _city, _budget, coalesce(_image_urls, '{}'))
  returning id into new_requirement_id;

  foreach biz_id in array coalesce(_matched_business_ids, '{}') loop
    if biz_id is distinct from own_business_id and exists (
      select 1 from public.businesses b
      where b.id = biz_id and b.status = 'live' and b.categories @> array[_category]
    ) then
      insert into public.leads (requirement_id, matched_business_id, status)
      values (new_requirement_id, biz_id, 'new');

      insert into public.conversations (party_a_id, party_a_type, party_b_id, party_b_type, requirement_id)
      values (poster_id, poster_type, biz_id, 'business', new_requirement_id);
    end if;
  end loop;

  return new_requirement_id;
end;
$$;
revoke all on function public.submit_requirement_with_matches(text, text, text, numeric, text[], uuid[]) from public, anon;
grant execute on function public.submit_requirement_with_matches(text, text, text, numeric, text[], uuid[]) to authenticated;
