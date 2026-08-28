# LuvLit — Pre-Vercel Migration Audit

Read-only audit. Repo staged from `D:\saas\LUVLIT\luvlt`, installed and built in a clean sandbox (Node v22.22.2 / npm 10.9.7). No source files were changed as part of this audit.

## TL;DR — fix these before you touch DNS

1. **`FREE_UNTIL` is hardcoded to `2024-11-30`, not 2026.** (`src/routes/_authenticated/business/dashboard/billing.tsx:18`) Today the code already thinks the free period ended almost two years ago. Every business dashboard is currently showing "the free period has ended" instead of "you're free until Nov 30." This is not a migration issue, it's live wrong.
2. **Storage buckets are never created in migrations.** `business-media`, `event-media`, `requirement-media` all have RLS policies in `supabase/migrations`, but there is no `insert into storage.buckets` anywhere. They exist only because someone clicked "New bucket" in a dashboard at some point. Point this repo at a fresh Supabase project (which is exactly what a Vercel migration tends to invite) and every upload breaks with "Bucket not found," with zero migration history telling you why.
3. **Business-posted requirement photos silently violate RLS by design.** `post-requirement.tsx` uses `posterId = ownBusiness ? ownBusiness.id : user.id` as the upload folder prefix, but the `requirement-media` INSERT policy requires the folder to equal `auth.uid()`. Any business account posting a requirement with photos gets a permission-denied error on every image. Not edge case — it's the primary path for the "business↔business requirement" feature in the spec.
4. **Two admin actions fail with zero feedback.** `influencer-approvals.tsx` `approve()`/`reject()` don't destructure `{ error }` at all. If the update is rejected (bad RLS, network blip, whatever), the admin clicks Approve, the list re-fetches, the applicant is still sitting there pending, and nothing on screen says why.
5. **Core lead-matching writes are fire-and-forget.** In `post-requirement.tsx`, after a requirement is created, the `leads` and `conversations` inserts that actually notify matched businesses are unchecked. The poster sees "N businesses matched" even if both inserts failed and nothing was actually created.
6. **Business public pages use raw UUIDs in the URL**, contradicting the design goal ("feel like the business's own standalone professional website," premium/editorial, not directory-issued IDs). `/business/8776d29e-7a63-4d98-a45b-ab95b02c488f` is what ships today.
7. **There is an entire "Organizer" role and Events feature in the code that isn't in the project doc at all** — `organizer_profiles`, `events` table, `/organizer/onboarding`, `/organizer/dashboard`, `/events`, an `event-media` bucket, its own featured-placement pricing (`EVENT_FEATURED_PRICING`). Either the master doc is stale or this shipped without anyone updating it. Worth resolving before more work gets planned against a doc that doesn't describe the real system.
8. **No lockfile.** No `package-lock.json`, no `bun.lockb`, no `pnpm-lock.yaml` in the repo (confirmed via directory listing). `npm install` will re-resolve semver ranges every time — including on Vercel's build — so what builds today is not guaranteed to be what builds tomorrow.

Everything below is the detailed pass against each of the 8 requested checks.

---

## 1. Build health

**`npm install`**: succeeded clean. 400 packages, 0 vulnerabilities, 3 deprecation warnings (`tsconfck`, `recharts@2.15.4`, `eslint@9.39.5` — none fatal).

**`npm run build`** (`vite build`, Nitro `vercel` preset — the Vercel target is already correctly configured in `vite.config.ts`, that part of the migration is done): **succeeded, exit 0.** Output written to `.vercel/output/` as expected for the preset.

Full verbatim warnings from the build (nothing else, no errors):

```
[plugin tanstack-start-core::server-fn:client] /src/routes/events.$id.tsx?tsr-split=errorComponent:6:22 createServerFn().inputValidator() is deprecated. Use createServerFn().validator() instead.
[plugin tanstack-start-core::server-fn:ssr] /src/routes/events.$id.tsx?tsr-split=errorComponent:6:22 createServerFn().inputValidator() is deprecated. Use createServerFn().validator() instead.
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

`.inputValidator()` is used in 6 places total, all deprecated in favor of `.validator()`: `src/lib/public.functions.ts:46,105,150,175,204` and `src/routes/events.$id.tsx:7`. Not broken, but every one of these will need touching eventually and the build already warns on it.

**Bonus, not in the original ask but relevant to "build health":** `npm run build` only runs `vite build` — there is no `tsc --noEmit` step in the build or in CI. I ran one manually (`npx tsc --noEmit`): **clean, zero errors.** Good news today, but it means a future type error will ship silently through `vite build` unless a typecheck step gets added to whatever CI/Vercel build command you configure. Recommend adding `"typecheck": "tsc --noEmit"` to `package.json` and wiring it into the Vercel build command (`npm run typecheck && npm run build`).

`npm run lint` (`eslint .`) **timed out after 2 minutes in this sandbox** and I did not retry per the audit constraints. Given eslint-plugin-prettier is in the mix and the ruleset touches every file, this may just be slow here — but it's untested, so don't assume lint is clean on faith.

**No lockfile** (`package-lock.json` / `bun.lockb` / `pnpm-lock.yaml`) exists anywhere in the repo. Confirm this is intentional; if not, commit one before the first Vercel deploy so builds are reproducible.

---

## 2. Lovable leftovers

Literal matches for `@lovable.dev/`, `lovable.dev`, `lovable-core-prod`, `bunfig.toml`:

| Pattern | File | Note |
|---|---|---|
| `lovable.dev` | `README.md:185,191` | Standard Lovable-generated README boilerplate, cosmetic. |
| `lovable.dev` | `AGENTS.md:3` | Lovable's git-sync warning banner (`<!-- LOVABLE:BEGIN -->...END -->`). Harmless once you're off Lovable, but worth deleting so nobody follows stale instructions about not force-pushing. |

`@lovable.dev/` (as an npm scope) and `lovable-core-prod`: **no matches anywhere**, including `package.json` dependencies. `bunfig.toml`: **file does not exist** in the repo.

That's the literal ask satisfied, but it undersells what's actually still Lovable-coupled. Three things the exact strings miss:

- **`src/lib/lovable-error-reporting.ts`** is live code, imported and called from `src/routes/__root.tsx:13,42` on every root-level error boundary catch. It posts to `window.__lovableEvents` / `window.__lovableReportRuntimeError`, globals that only exist inside the Lovable editor's preview iframe. Outside Lovable (i.e., on Vercel) this is a harmless no-op via optional chaining, but it means your production error boundary currently reports to nothing. If you want real error monitoring in production, this needs replacing with an actual APM/Sentry-style hook, not just left in place.
- **`luvlt.lovable.app` is hardcoded as the canonical domain** in SEO-critical places: `src/routes/__root.tsx:98,99,122,123,128,133,140,142`, `src/routes/index.tsx:30,34`, `src/routes/business.$id.tsx:12`, `src/routes/events.$id.tsx:26`, `src/routes/sitemap[.]xml.ts:4`. This drives `og:url`, canonical `<link>` tags, JSON-LD `@id`/`url`, and the sitemap's base URL. Deploy this to `luvlit.in` (per the project doc) without fixing these and your canonical tags, sitemap, and structured data all point at the wrong domain — that's a direct SEO hit, not cosmetic.
- The `og:image`/`twitter:image` in `__root.tsx:98-99` points at a Cloudflare R2 URL under Lovable's own asset host (`pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/.../...lovable.app-....png`) — a Lovable-generated preview screenshot. Confirm that URL keeps resolving once you're off Lovable's infrastructure, or replace it with an asset you host yourself.

---

## 3. Image/video upload audit

Every path that writes to Supabase Storage:

| Call site | Bucket | Checks upload error before success? | Error shown to user? |
|---|---|---|---|
| `src/components/media-uploader.tsx:162-169` (`MediaUploader.upload`, the shared uploader used everywhere) | `business-media` (default) or overridden via `bucket` prop | **Yes** — `uploadError` checked, `setProgress(null)` on failure | **Yes** — rendered via `{error && <p className="text-destructive">...}`  |
| `src/components/website-builder/gallery-editor.tsx` | via `MediaUploader` | inherits the above | inherits the above |
| `src/routes/_authenticated/organizer/dashboard.tsx:274` (`<MediaUploader bucket="event-media" .../>`) | `event-media` | inherits the above | inherits the above |
| `src/routes/_authenticated/post-requirement.tsx:207` (`<MediaUploader bucket="requirement-media" .../>`) | `requirement-media` | inherits the above | inherits the above, **but see the RLS bug below — the error it surfaces is a raw Postgres/storage permission error, not a helpful message** |

The uploader component itself (`media-uploader.tsx`) is well-built: client-side size/duration limits, image downscaling before upload, a progress bar, and it does check `uploadError` and surface `uploadError.message` to the user. No complaints about the component in isolation.

**Read-side gap (not upload, but adjacent and worth flagging):** resolving a stored path to a signed URL does *not* check for errors — `useMediaUrl` in `media-uploader.tsx:64-69` and `useResolvedList` in `business-profile-preview.tsx:76-81` both do `const { data } = await supabase.storage.from(bucket).createSignedUrl(...)` and only look at `data`. If `createSignedUrl` fails (expired session, bucket permissions, bucket doesn't exist — see below), the image/video just renders as blank/broken with no error surfaced anywhere. Same pattern in `getBusinesses`/`getBusinessById` server functions (`src/lib/public.functions.ts:83-88,132`) for the public browse/profile pages — `createSignedUrls`/`createSignedUrl` results aren't checked for `error`, only `data`.

**Buckets referenced in code that are *not* created anywhere in `supabase/migrations`:**

- `business-media` — RLS policies exist (`supabase/migrations/20260803062157_*.sql`, `20260804135503_*.sql`), no `storage.buckets` insert.
- `event-media` — RLS policies exist (`20260807070527_*.sql`), no `storage.buckets` insert.
- `requirement-media` — RLS policies exist (`20260807070527_*.sql`), no `storage.buckets` insert.

I searched every migration file for `storage.buckets` and `insert into storage.buckets` — zero hits. These buckets currently exist only because they were created by hand (dashboard or Lovable Cloud's own tooling) against the one live Supabase project. **This is the single biggest portability gap in the repo.** Migrating hosting is exactly the kind of event that tends to also involve standing up a new or restored Supabase project, and when that happens these three buckets won't exist, RLS policies will apply to nothing, and every upload will 404 with no clue in version control as to what bucket names or configs (public/private, size limits) are supposed to exist. Fix: add a migration that does `insert into storage.buckets (id, name, public, file_size_limit) values (...)` for all three, `on conflict do nothing`.

**Correctness bug, not just a portability gap** — `post-requirement.tsx:59,205`: `posterId = ownBusiness ? ownBusiness.id : userData.user!.id`, then `<MediaUploader businessId={posterId ?? "pending"} bucket="requirement-media" .../>`. The upload path becomes `${posterId}/gallery-....`. The RLS INSERT policy for `requirement-media` (`supabase/migrations/20260807070527_*.sql:57`) requires `(storage.foldername(name))[1] = auth.uid()::text`. When the poster is a business account, `posterId` is the **business's** primary key, not the signed-in user's `auth.uid()` — so the folder prefix never matches the policy and the upload is rejected outright. Every business that tries to attach photos to a requirement they're posting will hit a permission error on every photo. There's also a narrower race: `posterId` starts as `null` and is only set after an async `supabase.auth.getUser()` call resolves — if a user attaches a photo before that resolves, the path falls back to the literal string `"pending"`, which also can't match `auth.uid()`.

---

## 4. Silent failure pattern (mutations with unchecked/unsurfaced `error`)

Scope was staff/products/admin files specifically — those three are mostly fine (see below) — but the same pattern shows up badly enough elsewhere in the core flows that limiting this section to just those three files would undersell the risk, so I've included the worst offenders found repo-wide.

**Staff (`src/routes/_authenticated/business/dashboard/staff.tsx`)** — clean. Every `.insert(`/`.update(`/`.delete(` (lines 131, 164, 184, 255) destructures `error` and calls a `setXError` that's rendered in the JSX. No complaints.

**Products (`src/routes/_authenticated/business/dashboard/products.tsx`)** — clean in the same way. Lines 72, 105, 124, 135 all check and surface `error`.

**Admin — mixed.** `src/routes/_authenticated/admin/index.tsx` (category approve/rename/merge, lines 67, 79, 93) checks and surfaces `error` via `categoryError`. But **`src/routes/_authenticated/admin/influencer-approvals.tsx:32-46`** does not:

```ts
async function approve(id: string) {
  await supabase
    .from("influencer_profiles")
    .update({ approval_status: "approved", is_verified: true, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  queryClient.invalidateQueries({ queryKey: ["admin-pending-influencers"] });
}
```

No `{ error }` destructured at all, in either `approve()` or `reject()`. If the update fails, the query just re-fetches the same pending list and the admin has no idea why their click did nothing. This is the influencer approval queue — one of exactly two admin screens that currently exist (per the project doc, most of Phase 12 admin tooling isn't built yet) — so it's a small surface area today, but it's the wrong screen to get this wrong on, since it's manual, one-at-a-time, human-in-the-loop moderation.

**Also unchecked, outside the requested three files, in places that matter:**

- `src/routes/_authenticated/business/onboarding.tsx:139-156` — after the business row's own `update()` is correctly checked, the four follow-up writes (`categories.insert` for a suggested category, `locations.insert` for the primary address, `delivery_areas.insert`, and `subscriptions.insert`) are all bare `await supabase.from(...).insert(...)` with no error handling whatsoever, and the user is navigated straight to their dashboard afterward regardless. If the `subscriptions` insert fails, the business goes live with no subscription row — meaning `billing.tsx`'s "No subscription record yet" fallback text quietly becomes the permanent state.
- `src/routes/_authenticated/post-requirement.tsx:102-118` — the `leads` and `conversations` inserts that make the actual "business gets notified of your requirement" behavior happen are unchecked. `setMatchedCount(matches.length)` fires regardless of whether either insert succeeded, so the UI can tell a customer "3 businesses matched" while zero leads or conversations actually exist.
- `src/routes/_authenticated/business/setup-staff.tsx:45-80` — first-time staff setup during onboarding. The `staff.insert(...).select("id").single()` result is checked only via `if (!row) continue` (silently skips that staff member, no message to the user), and the subsequent `slots.insert(...)` batch loop (line 79) is entirely unchecked.
- `src/routes/_authenticated/organizer/dashboard.tsx:167,173` — `deleteEvent` and `togglePublish` don't check `error`; a blocked delete/publish toggle just silently no-ops and the list re-renders as if nothing happened.
- `src/components/chat-panel.tsx:75-80` — sending a chat message doesn't check `error`; on failure the input is already cleared (`setDraft("")` happens before the insert) and the user has no way to know their message didn't send.
- `src/routes/_authenticated/dashboard/saved.tsx:44` — removing a saved/favorited business doesn't check `error`.
- `src/routes/_authenticated/business/dashboard/leads.tsx:123-128` — marking messages read on opening a conversation is unchecked (low stakes — worst case an unread badge lingers).

**Separately, and repo-wide:** essentially every `useQuery` read (`select()`) pattern in the codebase looks like `(await supabase.from(...).select(...)).data ?? []`, discarding `error` entirely. That's most of `admin/index.tsx` (4 queries), `admin/influencer-approvals.tsx`, `products.tsx`, `staff.tsx`, `saved.tsx`, `billing.tsx`, and others. This wasn't the literal ask (which named insert/update/delete/upsert) but it's the same failure mode with a worse consequence in an admin context: if a SELECT fails — RLS misconfiguration, an admin role check gone wrong, network blip — the UI renders its empty-state copy ("No pending category suggestions," "No live businesses yet," "No subscriptions yet") which is visually indistinguishable from a genuinely empty, healthy system. Worth a pass to at least surface a distinct "couldn't load" state on these before this goes in front of real admins making revenue decisions off that "Estimated monthly revenue" number.

---

## 5. Pricing — every file where price logic/copy lives

| File | Line | Content |
|---|---|---|
| `src/lib/constants.ts` | 69-73 | `PLANS` object — canonical-looking source of truth: `base: { price: 199, introPrice: 20, freeUntil: "30 November" }`, `featured_city: { price: 499 }`, `featured_all_india: { price: 999 }`. **Not actually used for the free-period gate** (see below) or referenced by `admin/index.tsx`'s own copy of these numbers. |
| `src/routes/_authenticated/admin/index.tsx` | 18-22 | A **second, independent** hardcoded copy: `const PLAN_PRICE = { base: 199, featured_city: 499, featured_all_india: 999 }`, used only to compute "Estimated monthly revenue." Two sources of truth for the same three numbers — change one and forget the other, and the admin revenue estimate silently drifts from the real pricing. |
| `src/routes/_authenticated/business/dashboard/billing.tsx` | 18 | `const FREE_UNTIL = new Date("2024-11-30T23:59:59")` — **wrong year**, see TL;DR #1. Drives `isFreePeriod` (line 39), which is the only thing deciding whether the dashboard tells a business owner they're in the free period or not. |
| `src/components/faq-section.tsx` | 34 | Copy: "...₹20, then ₹199 per month..." |
| `src/routes/terms.tsx` | 64-65 | Copy: "...₹20 for the first month and ₹199 per month thereafter; featured placement is ₹499/month..." |
| `src/routes/pricing.tsx` | 7, 11, 16, 40-41 | Page title, meta description, and body copy all repeat ₹20 / ₹199 / ₹499 as free text. |
| `src/routes/about.tsx` | 54-55 | Copy: "...₹20 for the first billing month and ₹199 per month afterwards..." |
| `src/routes/index.tsx` | 336-337 | Homepage CTA copy: "₹20 for your first month... then ₹199/month." |
| `src/routes/_authenticated/business/dashboard/billing.tsx` | 60-65 | Repeats the same copy inside the dashboard. |

Net: the actual numbers (20 / 199 / 499 / 999) are duplicated as free-floating prose across **8 files**, plus two separate hardcoded object literals (`constants.ts` and `admin/index.tsx`), plus one hardcoded cutoff date that's wrong. None of pricing.tsx/about.tsx/terms.tsx/etc. actually import from `PLANS` — they're all hand-typed strings that happen to currently agree with each other and with `PLANS`. The day pricing changes (and per the doc, it's explicitly scheduled to change on Nov 30), someone has to remember to hunt down and edit 8+ files by hand, or the site starts contradicting itself. Worth centralizing on `PLANS`/`FREE_UNTIL` as the single source and interpolating everywhere else.

---

## 6. Routing — business public pages

| Route file | URL param | Backing lookup | UUID or slug? |
|---|---|---|---|
| `src/routes/business.$id.tsx` | `/business/$id` | `getBusinessById` (`src/lib/public.functions.ts:104-113`) — `.eq("id", data.id)` directly against `businesses.id` | **Raw UUID.** No slug column exists on `businesses` at all (checked `src/integrations/supabase/types.ts` — no `slug` field). |
| `src/routes/events.$id.tsx` | `/events/$id` | Local `getEventById` in the same file, same pattern — `.eq("id", data.id)` against `events.id` | **Raw UUID**, same story. |

There's no website-builder-specific public route — `src/routes/_authenticated/business/dashboard/website.tsx` is the private editor (scoped to the signed-in owner via their session, no id in the URL), and it renders the same `BusinessProfilePreview` component that the public `/business/$id` page uses, just fed draft state instead of loader data. So there's exactly one public "business page" URL shape in the app, and it's the UUID one.

Given the project doc's explicit design goal — business pages should "feel like the business's own standalone professional website, not a listing embedded in a directory" — shipping `/business/8776d29e-7a63-4d98-a45b-ab95b02c488f` as the permanent public URL undercuts that on two fronts: it's unmemorable/unshareable, and it's a needless SEO handicap next to a slug like `/business/luvlit-candles-kochi`. This is also the exact kind of change that gets expensive to make later, once real businesses have shared their raw-UUID links — worth doing before Nov 30 launch traffic starts building backlinks to the wrong URL shape.

---

## 7. Environment variables

**In `.env`** (names only): `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`.

**Referenced in code:**

- `process.env.SUPABASE_URL` — `src/integrations/supabase/client.server.ts`, `src/integrations/supabase/auth-middleware.ts` — ✅ present in `.env`.
- `process.env.SUPABASE_PUBLISHABLE_KEY` — same files — ✅ present.
- `process.env.SUPABASE_SERVICE_ROLE_KEY` — `src/integrations/supabase/client.server.ts:34` — **❌ not in `.env`, anywhere.**
- `import.meta.env.VITE_SUPABASE_URL` — `src/integrations/supabase/client.ts` — ✅ present.
- `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` — same — ✅ present.

**The gap:** `SUPABASE_SERVICE_ROLE_KEY` backs `supabaseAdmin`, the privileged (RLS-bypassing) server client in `client.server.ts`. It throws a clear `Error` on first use if missing (`client.server.ts:36-44`), so at least it fails loud rather than silently — but nothing in the codebase currently imports `supabaseAdmin` (grepped repo-wide, zero call sites), so this hasn't bitten anyone yet only because the feature that needs it hasn't been built. Phase 12 (admin area: business review queue, category/influencer approval, revenue overview — see the project doc's "Not yet built" list) is exactly the kind of work that will need a privileged server client, and whoever picks that up will hit this immediately. Get `SUPABASE_SERVICE_ROLE_KEY` into both a local `.env` and Vercel's project environment variables now, not when that PR is blocked on it.

**Also worth flagging:** `.env` is not listed in `.gitignore` at all (checked the full file — no `.env`, `.env.local`, or `*.env` entry anywhere). The values currently in it are the publishable/anon key and project ID, which are meant to be public-safe by design, so the immediate exposure risk is low — but the moment someone adds a genuinely secret value (say, `SUPABASE_SERVICE_ROLE_KEY` itself, filling the gap above) to `.env` out of habit, it has a clear path into git history. Add `.env` to `.gitignore` before that happens, not after.

---

## 8. Incomplete work

`TODO`, `FIXME`, "not implemented", `console.log("test")`: **zero matches anywhere in `src/`.** Genuinely clean on that front.

Explicit "not wired up yet" / placeholder UI, all self-disclosed in the code (i.e., these are honest, intentional stubs, not bugs — flagging them so the migration checklist accounts for them):

- `src/routes/_authenticated/business/dashboard/billing.tsx:74` — "Manage billing isn't wired up yet — this is a read-only summary for now." Matches the project doc: Razorpay integration is intentionally last (Phase 9).
- `src/routes/_authenticated/business/dashboard/featured.tsx:185` — "Payment isn't wired up yet — reserving a slot here doesn't charge you." Same story for featured-placement purchase.
- `src/routes/_authenticated/organizer/dashboard.tsx:189,386` — same pattern for event featured-placement payment.
- `src/lib/constants.ts:78` — `EVENT_FEATURED_PRICING` comment: "stored, not charged — billing isn't wired up yet."
- `src/components/search-pill.tsx:144` — a price-range filter `<option>Coming soon</option>` in the homepage search pill; the filter exists in the UI but does nothing yet.

None of these are hidden — they all say what they are — but they're real gaps if anyone assumes "billing" or "price filtering" works end-to-end from the UI alone.

**Not explicitly a "TODO" but functionally the same thing, and worth surfacing here since it wasn't visible anywhere in the project doc:** the codebase has a fully-built **Organizer role and Events feature** — `organizer_profiles` and `events` tables, `is_organizer()` RPC, `/organizer/onboarding`, `/organizer/dashboard` (a large file, 16KB), public `/events` and `/events/$id` routes, its own `event-media` storage bucket and RLS policies, and its own featured-placement pricing constant. The project's master doc describes exactly three user types (Customers, Business owners, Influencers) plus Admin, and makes no mention of organizers or events anywhere in sections 3, 4, or 8. Either this is a fourth product line that shipped without the doc being updated, or it's exploratory work that should be pulled before launch — either way, it should get reconciled with the doc before more roadmap planning happens against a document that's missing a quarter of the app's actual routes.

---

## Appendix — things I noticed but weren't asked for

- `package.json` devDependency `"nitro": "3.0.260603-beta"` is a beta build pinned by exact date-stamped version, not a semver range. Fine today (the build works), but it's a supply-chain risk for long-term maintenance — nobody's going to remember why that exact string is there in six months, and there's no guarantee that beta channel stays available.
- `package.json` has inconsistent indentation around the `@types/node` line (line 71) — cosmetic, but it's the kind of thing that suggests the file's been hand-edited outside whatever formatter normally touches it.
