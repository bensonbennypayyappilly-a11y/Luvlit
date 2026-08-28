# Phase 4 report — nav fix, media limits, event lifecycle, organizer profile, influencer collaboration

8 commits on `main`, `cc7261f`..`41aaf40`. `npm run build` and `npm run typecheck` both pass after every commit.

## GROUP A — Quick fixes (`cc7261f`)

- [site-header.tsx](src/components/site-header.tsx) — added `"Post a Requirement"` to `customerItems`, between `"Browse"` and `"My Requirements"`.
- [media-uploader.tsx](src/components/media-uploader.tsx) — `short.maxBytes` 50MB → 15MB. No other `MEDIA_LIMITS` entry touched.
- [onboarding.tsx:370](src/routes/_authenticated/business/onboarding.tsx) — the one other prose reference to this limit ("max 60s / 50MB each") updated to 15MB. Confirmed no other file references this specific limit (the `business-media` storage bucket's own 50MB ceiling is shared with other kinds like `main`, and doesn't need to shrink).

## GROUP B — Event lifecycle (`7999a7c`)

- Migration [20260829120000_...sql](supabase/migrations/20260829120000_35956b57-0fd6-4845-acc4-c66e1712e6a9.sql) adds `public.cleanup_expired_events()`, deleting `events` where `end_date < now() - interval '90 days'`.
- **FK check (as requested, before writing anything)**: zero foreign keys reference `events.id` anywhere in the schema — confirmed by grepping every migration. This delete cascades to nothing and can't fail on a dependent row.
- **pg_cron**: confirmed live (`select * from pg_extension where extname = 'pg_cron'` against the actual database) — **not enabled**. Not enabling it myself, per instruction. The function is applied and ready; once you enable `pg_cron` via **Database → Extensions**, run this once yourself in the SQL editor:
  ```sql
  select cron.schedule('cleanup-expired-events', '0 3 * * *', 'select public.cleanup_expired_events();');
  ```
  (daily at 03:00 UTC — say if you want a different time).

## GROUP C — Organizer public profile page (`fd275fb`)

- New `getOrganizerById` in [public.functions.ts](src/lib/public.functions.ts) — selects only `id, name, city` via `publicClient()` (service-role, bypasses RLS entirely, same pattern as `getBusinessById`/`getEventById`), plus their upcoming published events.
- **Contact-info privacy (as requested, before deciding)**: `organizer_profiles` has exactly one RLS policy, strictly owner-only (`FOR ALL USING (user_id = auth.uid())`) — no public/anon read exists at all today. That's a clear signal `contact_email`/`contact_phone` aren't meant to be public, so `getOrganizerById` never selects them. No RLS policy was added — Postgres RLS can't hide specific *columns*, only rows, so adding a public policy would have made contact fields queryable by anyone regardless of intent.
- New route [organizer.$id.tsx](src/routes/organizer.$id.tsx), structured like `business.$id.tsx`/`events.$id.tsx`.
- [events.$id.tsx](src/routes/events.$id.tsx) previously showed **no organizer info at all** (verified before starting, confirmed with you). Now fetches the organizer's name via a second query and shows "Hosted by {name}" linking to the new page.

## GROUP D — Structured influencer collaboration requests (`6545d00`, `daa467f`, `cf20e75`, `41aaf40`)

- **Schema/RLS** (`6545d00`): new `public.collaboration_requests` table + the state machine below, all reviewed and approved before writing:
  ```
  pending    --(influencer accepts)-->              accepted
  pending    --(influencer declines)-->              declined
  pending    --(influencer counters, sets counter_rate)--> countered
  countered  --(business accepts the counter)-->     accepted
  countered  --(business declines the counter)-->    declined
  accepted, declined  -->  terminal, no further changes
  ```
  Three UPDATE policies gate *who* can touch *which rows* and *what status* they may move to; a `BEFORE UPDATE` trigger (`guard_collaboration_request_fields`) separately enforces that `brief`/`proposed_rate`/`rate_card_item`/`business_id`/`influencer_id` can't change after creation and `counter_rate` can't be altered once set — RLS alone can gate rows but can't compare old-vs-new column values in one policy expression.
  - **A real bug this surfaced**: `conversations`' check constraint already allowed `party_type = 'influencer'`, but `in_conversation()` (used by conversations' *and* messages' SELECT/INSERT policies) and the conversations INSERT-check policy only ever resolved an `'influencer'` party via `businesses.owner_id` — which can never match an `influencer_profiles.id`. **An influencer could never have read or sent messages in their own conversation.** Fixed in the same migration (both now check `influencer_profiles.user_id = auth.uid()` for influencer parties).
  - Applied via `supabase db push`; verified all 6 new policies exist with a direct `pg_policies` query.
- **Business-side UI** (`cf20e75`): "Request a collaboration" button on each card in [find-influencer.tsx](src/routes/_authenticated/dashboard/find-influencer.tsx), opening an inline form (rate-card-item picker when one exists, proposed rate, brief).
- **Influencer-side UI** (`41aaf40`): new [influencer.requests.tsx](src/routes/influencer.requests.tsx) (top-level route, matching the existing `/influencer/status`/`/influencer/onboarding` convention — auth handled client-side via `useSession()`, not the `_authenticated` layout), added to `influencerItems` nav. Accept/Decline/Counter actions on pending requests.
- Both accept flows share `acceptCollaborationRequest()` in [collaboration.ts](src/lib/collaboration.ts): once status is already `'accepted'`, it creates the `conversations` row and links `conversation_id` — the two-step sequence isn't duplicated in both UIs.

## Unplanned but necessary: a critical pre-existing bug fix (`daa467f`)

Regenerating `src/integrations/supabase/types.ts` for Group D to typecheck (the committed types predated the new project and didn't know about `collaboration_requests`) surfaced that `src/integrations/supabase/types.ts` was stale in a more serious way: **`businesses.slug` has been `NOT NULL` on the live project since Phase 2's slug-backfill migration, but `onboarding.tsx`'s `ensureBusiness()` — the very first `INSERT` that creates a business row — never set it.** Every new business signup would have hit a `NOT NULL` constraint violation on that insert. This wasn't caught by TypeScript before because the stale types predated the constraint. Fixed: `ensureBusiness()` now generates and sets an initial slug (reusing the same `generateUniqueSlug`/`slugify`/`isReservedSlug` helpers from Phase 2); `finish()` continues to regenerate it from the final name afterward, unchanged. This was outside all four groups' stated scope but directly blocking (typecheck couldn't pass) and actively broken in production, so I fixed it and am flagging it prominently here rather than folding it silently into another commit.

## Explicitly NOT done

- **Instagram/Meta stat verification** — not touched, as instructed; requires external account setup tracked separately.
- **Scheduling the `pg_cron` job** — the function exists; the one-line `cron.schedule(...)` call is yours to run after enabling the extension (see Group B above).
- Real end-to-end testing of the collaboration request state machine, the organizer page's "found" path, and the new customer nav item all needs a live test account for each role (customer/business/influencer/organizer) — I don't have credentials for any of them this session. Everything was verified via `npm run build`/`npm run typecheck`, a live `pg_policies` check for the new RLS policies, and browser checks of every reachable not-found/signed-out state (all clean, zero console errors) — but not the full happy-path flows.
