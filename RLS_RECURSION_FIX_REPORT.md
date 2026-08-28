# RLS infinite recursion on public.requirements (42P17) — diagnosis and fix

## Symptom
A real authenticated customer posting a requirement from `/post-requirement` hit Postgres error 42P17, "infinite recursion detected in policy for relation 'requirements'", on what looked like a plain INSERT.

## 1. Every RLS policy on `public.requirements`, verbatim

```sql
-- supabase/migrations/20260729061423_8776d29e-7a63-4d98-a45b-ab95b02c488f.sql:229-230
create policy "poster reads own requirement" on public.requirements for select to authenticated using (auth.uid() = posted_by_user_id);
create policy "authenticated post requirement" on public.requirements for insert to authenticated with check (auth.uid() = posted_by_user_id);

-- supabase/migrations/20260807070527_02fb02c1-5176-4c9b-9874-9a52167d731a.sql:247-248
create policy "matched businesses read requirement" on public.requirements for select to authenticated
  using (exists (select 1 from public.leads l where l.requirement_id = requirements.id and public.owns_business(l.matched_business_id)));
```

No other migration file touches `requirements`' policies (confirmed by repo-wide grep); none are ever dropped or altered elsewhere.

## 2. The recursion, traced

`"matched businesses read requirement"` queries `public.leads`. `public.leads` has its own RLS:

```sql
-- supabase/migrations/20260729061423_8776d29e-7a63-4d98-a45b-ab95b02c488f.sql:242-245
create policy "business reads own leads" on public.leads for select to authenticated using (public.owns_business(matched_business_id));
create policy "poster reads leads on own requirement" on public.leads for select to authenticated
  using (exists (select 1 from public.requirements r where r.id = requirement_id and r.posted_by_user_id = auth.uid()));
create policy "business updates own leads" on public.leads for update to authenticated using (public.owns_business(matched_business_id));
```

`"poster reads leads on own requirement"` queries `public.requirements` right back:

```
requirements."matched businesses read requirement"  →  queries leads
leads."poster reads leads on own requirement"       →  queries requirements
requirements' SELECT policies evaluated again        →  queries leads again → ...
```

This is **two real policies mutually referencing each other's tables** — not a single self-referential policy, and not a helper-function bug. Checked `owns_business()` (`20260729061423...sql:105-108`): already `security definer`, only ever touches `public.businesses`, not part of the loop. `in_conversation()` is unrelated (`conversations`/`businesses` only).

**Why a plain INSERT triggered it:** `src/routes/_authenticated/post-requirement.tsx` does `.insert({...}).select("id").single()`, which PostgREST executes as `INSERT ... RETURNING id`. Postgres filters `RETURNING` rows through the table's SELECT policies, not just the INSERT's `WITH CHECK`. Building that combined `(select-policy-1) OR (select-policy-2)` check requires expanding `"matched businesses read requirement"`'s subquery — which requires expanding `leads`' RLS — which requires expanding `requirements`' RLS again. Postgres detects this while planning and throws 42P17, regardless of whether the simpler policy alone would have sufficed at runtime.

## 3. Multiple policies on the same command?

Two SELECT policies exist on `requirements` (normal — permissive policies OR together, not itself a problem). Only one INSERT policy exists. The actual issue isn't policies on the same table interacting with each other; it's `requirements`' second SELECT policy interacting with a *different* table (`leads`) whose own policy queries back.

## 4. The fix

New migration: [supabase/migrations/20260828120000_02964727-bdea-4b28-96da-a6533f5c0eac.sql](supabase/migrations/20260828120000_02964727-bdea-4b28-96da-a6533f5c0eac.sql) (no existing migration file modified):

```sql
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
```

**Why this breaks the loop:** `security definer` makes the function run as its *owner*, not the calling user — the same pattern already used by `owns_business()`, `in_conversation()`, and `has_role()` in this schema. Its internal query against `public.leads` is therefore not subject to `leads`' RLS at all. Evaluating `requirements`' policy no longer triggers `leads`' policies, so `leads`' `"poster reads leads on own requirement"` (which queries `requirements`) never gets invoked as part of this chain — the cycle can't start.

This is a **mutual** two-policy cycle, so breaking either edge would work; I fixed the `requirements` side because it's the one directly evaluated in the reported failure path, and it also covers any future direct `SELECT` on `requirements`. `leads`' policy keeps its original raw subquery unchanged — after this fix it no longer re-enters `leads`' RLS when triggered, so it's no longer part of any cycle, but it wasn't touched.

No `GRANT EXECUTE` was needed — none of the existing helper functions (`owns_business`, `in_conversation`, `has_role`) have one either; Postgres grants `EXECUTE` to `PUBLIC` by default.

## 5. Applied

Ran against the **new** Supabase project (`bggjtmtsmcefnykkpfir`, already the live/cut-over database) via `supabase db push`. Confirmed via `supabase migration list`: all 13 migrations (the 12 pre-existing plus this one) now show matching `local`/`remote` timestamps — applied cleanly, no errors. Committed as `0e5351b`.

## 6. Retest needed — not yet confirmed fixed

Running without a database error does **not** by itself prove the actual bug (recursion during INSERT...RETURNING from a real customer) is resolved — please do this:

1. Go to `/post-requirement` signed in as a **customer** account (not a business owner) — the exact scenario that failed.
2. Fill in category, description, and city; submit.
3. **Expected**: transitions to the "Requirement posted" / "Matched with N businesses" screen — no error, no `42P17` in the network response or console.
4. Optional direct check: in Supabase's SQL editor, run (as an authenticated role if the editor supports impersonation):
   ```sql
   insert into public.requirements (posted_by_type, posted_by_user_id, category, description)
   values ('customer', auth.uid(), 'Test', 'test')
   returning id;
   ```
   should return a row with no error.
5. Also confirm a **business** account can still see requirements matched to it via leads (what `"matched businesses read requirement"` exists for) — e.g. the business dashboard's requirements/leads list should still show matched requirements, confirming the rewrite didn't silently change who can see what.

I'm stopping here per your instructions — I have not confirmed the fix works end-to-end, only that the migration applied without error.
