-- Fixes "infinite recursion detected in policy for relation 'requirements'" (42P17).
--
-- requirements' "matched businesses read requirement" policy queries public.leads directly.
-- leads' "poster reads leads on own requirement" policy queries public.requirements right
-- back. Evaluating either table's SELECT policies pulls in the other table's RLS, which
-- pulls back into the first — Postgres detects the cycle while planning the query and
-- refuses it outright, even for a plain INSERT ... RETURNING (Postgres must evaluate SELECT
-- policies to decide whether to return the newly-inserted row).
--
-- Fix: wrap the leads lookup in a security definer function, the same pattern already used
-- by owns_business()/in_conversation()/has_role() in this schema. A security definer
-- function runs as its owner, not the calling user, so its internal query against
-- public.leads is not subject to leads' RLS — evaluating this policy no longer triggers
-- leads' policies, so the cycle can't start.

create or replace function public.requirement_has_matched_business(_requirement_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leads l
    where l.requirement_id = _requirement_id
      and public.owns_business(l.matched_business_id)
  )
$$;

drop policy if exists "matched businesses read requirement" on public.requirements;
create policy "matched businesses read requirement" on public.requirements for select to authenticated
  using (public.requirement_has_matched_business(id));
