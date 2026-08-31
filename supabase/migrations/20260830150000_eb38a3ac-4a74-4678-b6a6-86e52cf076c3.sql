-- Fixes a genuine pre-existing gap found live-testing Phase 5: public.leads was granted
-- INSERT but has never had a row-level security policy FOR INSERT, so with RLS enabled every
-- "post a requirement" attempt has failed at the leads-insert step ("new row violates
-- row-level security policy for table leads") since the table was created — this is the
-- table's very first INSERT policy, not a tightening of an existing one. Mirrors the existing
-- "poster reads leads on own requirement" SELECT policy, just for INSERT.
create or replace function public.owns_requirement(_requirement_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.requirements r
    where r.id = _requirement_id and r.posted_by_user_id = auth.uid()
  )
$$;
revoke execute on function public.owns_requirement(uuid) from anon;

create policy "poster creates leads on own requirement" on public.leads for insert to authenticated
  with check (public.owns_requirement(requirement_id));

-- public.conversations' only INSERT policy was `with check (true)` — any authenticated user
-- could insert a conversation row naming arbitrary other people as both parties, and it would
-- then appear in those people's own inboxes (conversations' SELECT policy already correctly
-- restricts reads to real parties; INSERT had no matching restriction). Tightened to require
-- the caller actually be one of the two declared parties, mirroring in_conversation()'s own
-- ownership check exactly so every legitimate insert (the caller is always one party, the
-- matched business/customer is the other) keeps working.
create or replace function public.is_conversation_party(_type text, _id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (_type = 'customer' and _id = auth.uid())
    or (_type in ('business','influencer') and public.owns_business(_id))
$$;
revoke execute on function public.is_conversation_party(text, uuid) from anon;

drop policy if exists "authenticated create conversation" on public.conversations;
create policy "party creates own conversation" on public.conversations for insert to authenticated
  with check (public.is_conversation_party(party_a_type, party_a_id) or public.is_conversation_party(party_b_type, party_b_id));
