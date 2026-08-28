# Phase 1 correctness fixes — report

All 22 items were completed, across 6 commits (one per group) on `main`. No visual/CSS changes, no Supabase project settings/URL/key changes, no new features.

## Build & typecheck

- `npm run build` — **passes** (checked after every group, and again after Group F).
- `npm run typecheck` (new script, `tsc --noEmit`) — **passes with zero errors**.

## Group A — Pricing single source of truth (commit `a9956b8`)

- [src/lib/constants.ts](src/lib/constants.ts) — `PLANS.base` corrected to `{ price: 99, introPrice: 49, freeUntil: "30 November" }`; added `FREE_UNTIL_DATE` derived from it.
- [src/routes/_authenticated/business/dashboard/billing.tsx](src/routes/_authenticated/business/dashboard/billing.tsx) — dropped the hardcoded `2024-11-30` date in favor of `FREE_UNTIL_DATE`; prices now interpolate from `PLANS.base`.
- [src/routes/_authenticated/admin/index.tsx](src/routes/_authenticated/admin/index.tsx) — deleted the duplicate `PLAN_PRICE` object; revenue calc now reads from `PLANS`.
- [src/components/faq-section.tsx](src/components/faq-section.tsx), [src/routes/terms.tsx](src/routes/terms.tsx), [src/routes/pricing.tsx](src/routes/pricing.tsx), [src/routes/about.tsx](src/routes/about.tsx), [src/routes/index.tsx](src/routes/index.tsx) — all hand-typed ₹20/₹199 mentions now interpolate from `PLANS`.
- Left `src/routes/_authenticated/business/dashboard/featured.tsx` (₹499/₹999 button labels) and the ₹499/₹999 mentions in `pricing.tsx`'s Featured section untouched — not part of the requested ₹20/₹199 fix, and not visually changed either way.

## Group B — Storage buckets migration (commit `995e877`)

- Added [supabase/migrations/20260827120000_6a8c4e3a-c1e1-4928-be29-44bc4c7696e5.sql](supabase/migrations/20260827120000_6a8c4e3a-c1e1-4928-be29-44bc4c7696e5.sql) creating `business-media` (public, 50MB limit — covers the 50MB `short` video kind, its largest use), `event-media` (public, 10MB — only ever used for `poster`), and `requirement-media` (private, 10MB — only ever used for `gallery`), matching what the existing RLS policies for each already imply. No RLS policy files touched.

## Group C — Requirement-photo upload bug (commit `a58dc2d`)

- [src/routes/_authenticated/post-requirement.tsx](src/routes/_authenticated/post-requirement.tsx) — the photo grid no longer falls back to the literal `"pending"` businessId (which could never satisfy the RLS folder check `= auth.uid()::text`). It now renders only once the signed-in user's id has resolved, showing "Loading…" until then.

## Group D — Silent write-side failures (commit `2e9ae26`)

Added/checked `{ error }` and surfaced it via the existing per-file error-state convention (`staff.tsx`'s pattern) in:
- [influencer-approvals.tsx](src/routes/_authenticated/admin/influencer-approvals.tsx) — `approve()`/`reject()`.
- [onboarding.tsx](src/routes/_authenticated/business/onboarding.tsx) — categories/locations/delivery_areas/subscriptions inserts.
- [post-requirement.tsx](src/routes/_authenticated/post-requirement.tsx) — leads/conversations inserts; "N businesses matched" is no longer shown if either insert failed.
- [setup-staff.tsx](src/routes/_authenticated/business/setup-staff.tsx) — staff insert and the slots insert loop.
- [organizer/dashboard.tsx](src/routes/_authenticated/organizer/dashboard.tsx) — `deleteEvent()`/`togglePublish()` (reusing `featureMessage`/`setFeatureMessage`, the file's existing action-feedback state).
- [chat-panel.tsx](src/components/chat-panel.tsx) — the message input is now only cleared after a successful insert; failures are shown and the typed text is preserved.
- [dashboard/saved.tsx](src/routes/_authenticated/dashboard/saved.tsx) — `remove()`.

## Group E — Silent read-side failures (commit `6386141`)

- [media-uploader.tsx](src/components/media-uploader.tsx)'s `useMediaUrl` and [business-profile-preview.tsx](src/components/business-profile-preview.tsx)'s `useResolvedList` now log (`console.error`) a failed `createSignedUrl` instead of silently treating it the same as "no media." (Kept their return shape unchanged — both are used broadly, so this was the minimal fix; the graceful `null`/original-path fallback for display is unchanged.)
- [public.functions.ts](src/lib/public.functions.ts) — `getBusinesses` and `getBusinessById` now `throw new Error(...)` on a failed `createSignedUrls` call, matching the file's existing convention for every other Supabase error in it.

## Group F — Housekeeping (commit `be10665`)

- Ran `npm install` (there was no `node_modules` or lockfile at all) and committed `package-lock.json`; also removed the leftover `bun.lock`/`bunfig.toml`.
- Added `"typecheck": "tsc --noEmit"` to `package.json`.
- Added `.env` to `.gitignore`.
- Replaced all 6 `.inputValidator(` calls with `.validator(` in [public.functions.ts](src/lib/public.functions.ts) (5) and [events.$id.tsx](src/routes/events.$id.tsx) (1) — verified in `node_modules/@tanstack/start-client-core`'s type definitions that `validator` is an exact drop-in for the deprecated `inputValidator` (same signature), so no other changes were needed.
- Replaced `luvlt.lovable.app` → `luvlit.in` in `__root.tsx`, `index.tsx`, `business.$id.tsx`, `events.$id.tsx`, `sitemap[.]xml.ts`.
- `__root.tsx`'s error boundary already had a bare `console.error(error)` alongside its call into `lovable-error-reporting.ts` (which only does anything inside Lovable's editor). Removed that call; since it was the file's only caller, also deleted the now-fully-unused `src/lib/lovable-error-reporting.ts`. **Real error monitoring (Sentry or similar) is a future addition — not built here.**

## Not changed / flagged, not fixed

- **`.env` is already committed to git history** (found while doing item 19). It only contains Supabase's *publishable*/anon key, project ID, and URL — not a service-role secret — so this isn't a live credential leak, but it shouldn't be tracked either way. Adding it to `.gitignore` (done) prevents new changes to it from being committed, but the file is already in history; removing it would mean rewriting history (force-push) or rotating the keys, which is a separate, more invasive decision I did not make unilaterally per the "don't touch Supabase settings/keys" instruction for this pass.
- `README.md:187`, `public/robots.txt:16`, and `AUDIT.md:58` also mention `luvlt.lovable.app` — left untouched since they weren't in the requested file list (docs/audit notes, not app code affecting SEO/canonical behavior).
- `src/routes/_authenticated/business/dashboard/featured.tsx` has its own hardcoded ₹499/₹999 button labels — not part of the ₹20/₹199 bug and not in the requested file list, so left as-is.
- **Pre-existing uncommitted changes not made by me, and intentionally left alone**: `package.json`'s devDependencies (removal of `@lovable.dev/vite-tanstack-config`) and all of `vite.config.ts` were already modified in the working tree before this session started; I only staged/committed my own `"typecheck"` script addition to `package.json` (via hunk-level staging) and left the rest of that diff, plus `vite.config.ts`, untouched and uncommitted for you to review separately. `src/routeTree.gen.ts` also shows as modified — it's TanStack Router's auto-generated file and gets regenerated by every `build`/`dev` run; left uncommitted since it wasn't part of any requested change.
- `.vercel/` (this session's build output directory) and `AUDIT.md` (a pre-existing untracked file) are present but untracked/uncommitted — not part of any group, left as-is.

Phase 1 is complete. Stopping here per instructions — no Phase 2 work started.
