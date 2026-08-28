# Phase 2 report — warm luxury re-theme, business slugs/subdomains, builder polish

6 commits on `main`, `88f4030`..`ffe12f7`. `npm run build` and `npm run typecheck` both pass after every commit.

## Screenshots — not available this session

I could not capture actual screenshots. The Browser pane's `screenshot` action failed consistently ("the Browser pane is not displayed, so the page is not compositing frames") across multiple tabs and repeated retries throughout this session — an environment/display limitation on this end, not something fixable from here.

What I did instead to verify the visual work without screenshots:
- Ran the dev server and loaded the homepage, `/pricing`, `/auth`, `/browse`, and a real business profile page (`/business/0e93914b-...`) — all loaded with **zero console errors**.
- Read back the live computed CSS custom properties from the running page (`getComputedStyle`) and confirmed `--background`/`--foreground`/`--primary`/`--accent` all resolve to the exact new hex values.
- Computed actual rendered contrast ratios in the browser (not just my own math) for real elements: the `eyebrow` gold text on the dark background measured **7.33:1**, matching the token-table prediction.
- Could not check the business dashboard or website builder pages visually — both require an authenticated session and I don't have test credentials for this session.

If you want real screenshots, either open a session where the Browser pane renders, or run `npm run dev` and look yourself — I'm confident in the token values (verified live) but haven't visually confirmed layout/spacing by eye.

## GROUP A — Color system (`88f4030`, `0a06ea3`)

Current token block (before) and the new warm-luxury palette (after) are both in [src/styles.css](src/styles.css) — see the diff in `88f4030` for the exact before/after. Full new token table, and the WCAG contrast reasoning behind the two deviations from your literal color list, is in the approved plan and repeated in that commit's message:
- `--accent-foreground` and the new `--success-foreground` use dark charcoal text, not ivory — ivory-on-gold measures 2.0:1 and ivory-on-sage 3.0:1 (both fail AA); dark text on either passes comfortably (7.3:1 / 4.9:1).
- `--destructive` (warmed to `#C0392B`) with ivory text passes at **4.57:1** — a thin margin above the 4.5:1 floor. Used as given since it does pass, but flagging the closeness explicitly.
- Everything else (ivory-on-background 14.9:1, ivory-on-card 13.8:1, muted-text-on-background 7.8:1, ivory-on-burgundy 8.4:1) cleared AA with real margin — no lightening/darkening of ivory or muted-text was actually needed.
- No dedicated hover tokens were added (hover already works via Tailwind's `hover:bg-primary/90`-style opacity modifier in the existing code) — exact hex-for-hex hover matching wasn't possible without inventing new token names, which you said not to do. Flagging this trade-off rather than silently deviating.
- `og:image`/`twitter:image` now point at `public/og-placeholder.jpg` (a copy of the existing hero image) instead of the stale Lovable R2 screenshot URL. **This is a placeholder — needs a real branded image before launch.**
- The three "Connect Supabase in Lovable Cloud" error strings now say "Set these in your environment configuration." Confirmed no codegen regenerates those files despite their stale header.

## GROUP B — Business slugs + subdomain routing (`a9f529c`, `6d26541`, `63bfc2b`)

- **Migration**: [supabase/migrations/20260827140000_fdec847b-9feb-4535-982f-ba441d780112.sql](supabase/migrations/20260827140000_fdec847b-9feb-4535-982f-ba441d780112.sql). Discovery worth noting: the `slug` column and its unique constraint **already existed** since the very first migration — just never populated. So this migration only backfills + sets `NOT NULL`, no `ADD COLUMN` needed. **Not applied to the live database** — per your instruction not to touch the Supabase project, I only committed the file; you'll need to run it yourself (`supabase db push` or via the dashboard).
- Reserved-word list lives in [src/lib/reserved-slugs.ts](src/lib/reserved-slugs.ts), built from your 8 words + every top-level route segment + standard infra names. The migration keeps an identical literal copy in SQL (can't share source across the boundary).
- Onboarding ([onboarding.tsx](src/routes/_authenticated/business/onboarding.tsx)) generates a slug in `finish()` (once the final business name is known), checked against the reserved list and existing slugs, retrying with `-2`/`-3` suffixes.
  - **Known edge case**: the uniqueness pre-check can only see businesses that are already live or owned by the current user (existing RLS). Two people onboarding an identically-named business in the same instant could both pass the pre-check — the database's unique constraint is the real backstop and would surface as a raw update error in that rare case, not a silent duplicate. Not fixed further since a proper fix would mean a new server-side function/RPC with its own transaction, which is more backend architecture than this pass was scoped for.
- Subdomain rendering: new `getSubdomainBusiness` in [public.functions.ts](src/lib/public.functions.ts), matches the Host header via `getRequest()` (the same pattern already used in `auth-middleware.ts`). Verified in isolation: a pure Node re-implementation of the host-parsing algorithm passed every edge case I threw at it (port numbers, uppercase, nested subdomains, bare domain, unrelated domains, `localhost`). Live end-to-end testing (a real business actually rendering at its subdomain) needs either the migration applied + real DNS, or a seeded test row — neither of which I did without your say-so.
  - I tried spoofing the `Host` header with `curl` against the dev server to test this live; Vite's dev server itself rejects unrecognized hosts with a 403 before the request reaches my code (a dev-only CSRF protection, unrelated to `vite.config.ts`, which I didn't touch). This only affects local dev-server testing, not the deployed app.
- `/business/$id` now 301-redirects to `https://{slug}.luvlit.in/` once a business has a slug — verified in dev that businesses **without** a slug (all of them right now, pre-migration) still render normally, no redirect loop.
- Extracted the duplicated meta/JSON-LD/field-mapping logic from `business.$id.tsx` into [src/lib/business-seo.ts](src/lib/business-seo.ts), shared by both `/business/$id` and the new subdomain route.
- Sitemap ([sitemap[.]xml.ts](src/routes/sitemap[.]xml.ts)) emits `https://{slug}.luvlit.in/` for businesses with a slug, falls back to `/business/{id}` for any without.
- **[DNS_SETUP.md](DNS_SETUP.md)** at repo root — plain-language wildcard CNAME + Vercel dashboard steps, noting wildcard domains need a Vercel Pro plan. No DNS/Vercel changes made.

## GROUP C — Website builder polish (`ffe12f7`)

Bumped density in `section.tsx`, `gallery-editor.tsx`, `locations-editor.tsx`, and `website.tsx` (the actual builder page — included even though it's one directory above the named folder, since most of the builder's visible chrome lives there; flagged in the plan before doing this). Arbitrary sub-`text-xs` sizes (`text-[0.65rem]`, `text-[0.7rem]`) became `text-xs`; primary form/section labels went from `text-xs` to `text-sm`; paddings and gaps opened up one notch. No new block types, no behavior changes. Color needed zero changes — every file already used theme tokens exclusively (confirmed via full-file review before touching anything), so the Group A re-theme applies automatically.

## Not completed / needs your input

1. **Real screenshots** — see above; couldn't render this session.
2. **The slug migration hasn't been run against the live database.**
3. **DNS/Vercel wildcard domain setup** — deliberately not touched; see `DNS_SETUP.md`.
4. **`public/og-placeholder.jpg` is a placeholder**, not final creative.
5. **Hover states** aren't pixel-exact to your given hex values (see Group A note) — using the existing opacity-modifier mechanism instead of new tokens.
6. Dashboard and website-builder pages weren't visually spot-checked (no auth session available this session) — only build/typecheck-verified.
