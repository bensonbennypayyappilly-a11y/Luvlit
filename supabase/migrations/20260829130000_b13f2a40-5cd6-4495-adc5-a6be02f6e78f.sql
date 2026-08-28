-- in_conversation() is used by conversations' SELECT policy AND messages' SELECT/INSERT
-- policies. Today it resolves an 'influencer' party via businesses.owner_id, which can
-- never match an influencer_profiles.id — an influencer could never read/send messages
-- in their own conversation. CREATE OR REPLACE keeps the same signature, so every policy
-- that already calls it picks up the fix automatically — no policy needs to change.
create or replace function public.in_conversation(_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = _conversation_id
      and (
        (c.party_a_type = 'customer' and c.party_a_id = auth.uid())
        or (c.party_b_type = 'customer' and c.party_b_id = auth.uid())
        or (c.party_a_type = 'business' and exists (select 1 from public.businesses b where b.id = c.party_a_id and b.owner_id = auth.uid()))
        or (c.party_b_type = 'business' and exists (select 1 from public.businesses b where b.id = c.party_b_id and b.owner_id = auth.uid()))
        or (c.party_a_type = 'influencer' and exists (select 1 from public.influencer_profiles ip where ip.id = c.party_a_id and ip.user_id = auth.uid()))
        or (c.party_b_type = 'influencer' and exists (select 1 from public.influencer_profiles ip where ip.id = c.party_b_id and ip.user_id = auth.uid()))
      )
  )
$$;

-- The INSERT check policy has the same logic inlined (not via the function), so it needs
-- its own drop+recreate, same technique as the requirements recursion fix.
drop policy if exists "participants create conversation" on public.conversations;
create policy "participants create conversation" on public.conversations for insert to authenticated
with check (
  (party_a_type = 'customer' and party_a_id = auth.uid())
  or (party_b_type = 'customer' and party_b_id = auth.uid())
  or (party_a_type = 'business' and exists (select 1 from public.businesses b where b.id = party_a_id and b.owner_id = auth.uid()))
  or (party_b_type = 'business' and exists (select 1 from public.businesses b where b.id = party_b_id and b.owner_id = auth.uid()))
  or (party_a_type = 'influencer' and exists (select 1 from public.influencer_profiles ip where ip.id = party_a_id and ip.user_id = auth.uid()))
  or (party_b_type = 'influencer' and exists (select 1 from public.influencer_profiles ip where ip.id = party_b_id and ip.user_id = auth.uid()))
);

-- Same shape as owns_business(), for the influencer side of collaboration_requests.
create or replace function public.owns_influencer_profile(_influencer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.influencer_profiles ip where ip.id = _influencer_id and ip.user_id = auth.uid())
$$;

create table public.collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  influencer_id uuid not null references public.influencer_profiles(id) on delete cascade,
  rate_card_item text,
  proposed_rate numeric,
  brief text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','countered')),
  counter_rate numeric,
  conversation_id uuid references public.conversations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.collaboration_requests to authenticated;
grant all on public.collaboration_requests to service_role;
alter table public.collaboration_requests enable row level security;

create trigger update_collaboration_requests_updated_at before update on public.collaboration_requests
  for each row execute function public.update_updated_at_column();

-- State machine:
--   pending   --(influencer accepts)-->             accepted
--   pending   --(influencer declines)-->             declined
--   pending   --(influencer counters, sets counter_rate)--> countered
--   countered --(business accepts the counter)-->    accepted
--   countered --(business declines the counter)-->   declined
--   accepted, declined -> terminal, no further changes
-- RLS gates which rows a role can touch and what status they may move to; it can't
-- compare old-vs-new column values to stop other fields changing in the same UPDATE,
-- so a trigger (below) enforces field immutability on top of these policies.

create policy "business creates collaboration request" on public.collaboration_requests for insert to authenticated
with check (public.owns_business(business_id) and status = 'pending' and counter_rate is null and conversation_id is null);

create policy "business reads own collaboration requests" on public.collaboration_requests for select to authenticated
using (public.owns_business(business_id));

create policy "influencer reads own collaboration requests" on public.collaboration_requests for select to authenticated
using (public.owns_influencer_profile(influencer_id));

create policy "influencer responds to pending request" on public.collaboration_requests for update to authenticated
using (status = 'pending' and public.owns_influencer_profile(influencer_id))
with check (status in ('accepted','declined','countered') and public.owns_influencer_profile(influencer_id));

create policy "business responds to countered offer" on public.collaboration_requests for update to authenticated
using (status = 'countered' and public.owns_business(business_id))
with check (status in ('accepted','declined') and public.owns_business(business_id));

create policy "participant links accepted request to conversation" on public.collaboration_requests for update to authenticated
using (status = 'accepted' and conversation_id is null and (public.owns_business(business_id) or public.owns_influencer_profile(influencer_id)))
with check (status = 'accepted' and conversation_id is not null and (public.owns_business(business_id) or public.owns_influencer_profile(influencer_id)));

create or replace function public.guard_collaboration_request_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.business_id is distinct from old.business_id
     or new.influencer_id is distinct from old.influencer_id
     or new.brief is distinct from old.brief
     or new.rate_card_item is distinct from old.rate_card_item
     or new.proposed_rate is distinct from old.proposed_rate
     or new.created_at is distinct from old.created_at then
    raise exception 'These fields cannot be changed after the request is created.';
  end if;
  if new.status = 'countered' and new.counter_rate is null then
    raise exception 'A counter offer must include counter_rate.';
  end if;
  if old.counter_rate is not null and new.counter_rate is distinct from old.counter_rate then
    raise exception 'counter_rate cannot be changed once set.';
  end if;
  return new;
end;
$$;

create trigger guard_collaboration_request_fields before update on public.collaboration_requests
  for each row execute function public.guard_collaboration_request_fields();
