# Phase 5 report — minimal-futurism redesign (Groups A–F, complete)

7 commits total: `5ce08d7` (A), `052db3d` (B), `ec8e5af` (C), `824b700` (D), `6ae728b` (E), `963d3bf` (F). `npm run build` and `npm run typecheck` pass after every group, each also checked live at 375px mobile width (not deferred to F alone).

## GROUP A — Token remap + typography (`5ce08d7`)

### Final token table

| Token | Value | Source |
|---|---|---|
| `--background` | `#FAFAFA` | given |
| `--foreground` | `#0A0A0A` | given |
| `--card`/`--popover` | `#FFFFFF` | given |
| `--card-foreground`/`--popover-foreground` | `#0A0A0A` | derived |
| `--border`/`--input` | `#E5E5E5` | given |
| `--muted`/`--secondary` | `#F2F2F2` | given |
| `--muted-foreground` | `#6B6B6B` | given |
| `--secondary-foreground` | `#0A0A0A` | derived |
| `--primary` | `#4F46E5` | given |
| `--primary-foreground` | `#FFFFFF` | given |
| `--primary-soft` | `#EEF2FF` | derived |
| `--accent`/`--accent-foreground`/`--accent-soft` | `#4F46E5`/`#FFFFFF`/`#EEF2FF` | **derived — not specified; set equal to primary since accent-2 is explicitly gradient-only. Flag if you want it visually distinct.** |
| `--accent-2` *(new)* | `#06B6D4` | given, gradient-only |
| `--destructive`/`--destructive-foreground` | `#DC2626`/`#FFFFFF` | derived (no red given) |
| `--success` | `#16A34A` | derived (no green given) |
| `--success-foreground` | `#0A0A0A` | **derived — white failed AA (3.3:1), dark text passes (6.0:1)** |
| `--ring` | `#4F46E5` | mirrors primary |
| `--chart-1..5` | indigo, cyan, `#6B6B6B`, `#C7D2FE`, `#D4D4D4` | derived, unused by any component |
| `--sidebar*` | mirrors card/primary/border | derived, unused component |
| `--dark-bg`/`--dark-fg`/`--dark-card` *(new)* | `#0A0A0A`/`#FAFAFA`/`#151515` | given |

### Contrast results
All comfortably clear AA except two flagged: **destructive** (white-on-red, 4.83:1 — passes, thinner margin) and **success** (white-on-green failed at 3.3:1, fixed via dark `success-foreground`, now 6.0:1 — same foreground-flip pattern as Phase 2's gold/sage fix). Foreground/background 18.96:1, foreground/card 19.80:1, muted-foreground pairs 5.10–5.33:1, white-on-primary 6.29:1, dark-fg-on-dark-bg 18.96:1. Cyan (`accent-2`) as text fails at 2.3:1, confirming gradient-only use as instructed.

### Typography
- Google Fonts CDN link removed (was render-blocking). Self-hosted **Geist Variable**: the `geist` npm package's JS exports are Next.js-only, so `Geist-Variable.woff2` was copied directly into `public/fonts/` and loaded via a hand-written `@font-face`, preloaded in `__root.tsx`. Verified: `document.fonts` reports it loaded, zero requests to `fonts.googleapis.com`.
- **Dropped Fraunces entirely** — one sans typeface (Geist) sitewide, per the minimal-futurism direction (flagged as a bigger call than a pure font swap, proceeded since the plan containing it was approved).
- New `headline` utility (heavier weight, tighter tracking) for hero/major-title use.

## GROUP B — Homepage hero (`052db3d`)

- Hero uses `--dark-bg`/`--dark-fg` tokens directly (via `bg-dark-bg`/`text-dark-fg` utilities), decoupled from the light palette.
- **Bug caught and fixed**: `shimmer-text` hardcoded light-scheme tokens — would have rendered invisible dark-on-dark once Group A flipped the palette. Fixed via a `--shimmer-color` custom property dark sections override.
- **The 5 cycling placeholder strings** (rotate every 3s via `framer-motion`'s `AnimatePresence`, `truncate` as a mobile safety net):
  1. "Wedding photographer in Jaipur"
  2. "Home cleaning service in Bengaluru"
  3. "Mehndi artist for a Delhi wedding"
  4. "Event caterer for 100 guests, Mumbai"
  5. "AC repair technician, Koramangala"
- Ambient CSS-only gradient (`ambient-glow` — two indigo/cyan radial blobs, 26s drift, respects `prefers-reduced-motion`) — verified not fighting legibility at desktop or 375px.

One real bug hit during verification (not a design issue): a stale Vite dependency-optimization cache threw "Invalid hook call" inside `<AnimatePresence>` right after installing `framer-motion`. Fixed by restarting the dev server and opening a fresh browser tab — recurred once more later in the session (after the `router.tsx` change) and was resolved the same way each time. Documenting as a known, harmless workaround for this environment, not a code defect.

## GROUP C — Matching-results moment on `post-requirement.tsx` (`ec8e5af`)

Replaced the binary `busy`/`matchedCount` gate with a `phase` state (`"form" | "scanning" | "results"`). **Zero changes to the matching query logic or Phase 1's error handling** — this was purely a presentational wrap around the existing submit flow.

- On submit: enters `"scanning"` immediately (dark tokens, a CSS-only rotating conic-gradient ring + pulsing dot — no canvas/WebGL), tracks `Date.now()`, and computes a randomized 1.5–2.5s minimum duration.
- Holds for `max(0, minDuration - elapsed)` **only when there's a real match to reveal** — a zero-match result skips the hold entirely and renders a calmer, distinct empty state (back to light theme, no glow), never led into by the scanning animation. Never pads past however long the real Supabase round-trips actually took.
- Real matches reveal as a `framer-motion` staggered list (120ms per card stagger), each card getting a "Matched" badge and a one-shot `card-glow-once` CSS entrance glow, on the same dark tokens as the scanning moment.

**Verification limitation, disclosed transparently**: there are no test credentials for any authenticated role in this environment, so the real submit flow (auth → business lookup → requirement insert → candidate query → leads/conversations insert) could not be triggered end-to-end, and the Chrome-devtools network-throttling test this group specifically called for was not run against the live flow. Verified instead via direct code-path review (the timing math, the branch points, and the zero-match short-circuit were traced by hand) and by injecting the scanning/results markup directly into a loaded page to visually confirm the `scan-ring`/`scan-pulse`/`card-glow-once` CSS renders correctly. Flagging this as the one part of Phase 5 that still needs a real end-to-end pass once test accounts exist.

## GROUP D — Full-page design sweep (`824b700`)

Surveyed all ~30 pages from the task's list. **27 needed nothing beyond the Group A token remap landing** — already fully token-driven. Two needed individual attention:

- **`business-profile-preview.tsx`**: the brand-accent fallback was still the old warm-luxury forest green (`#173D2E`), frozen from before this redesign — updated to the new primary indigo (`#4F46E5`). Kept as a literal hex rather than `var(--color-primary)` because this value has hex-alpha suffixes (e.g. `${accent}33`) appended for overlay gradients, which `var()` can't take. The plan had also flagged this file's black/white hero-overlay utilities as possibly needing a legibility revisit for the new light-first palette — on closer inspection during implementation, they're correctly scoped to the business's own independently-curated dark accent gradient, not the app's global theme, so they were left unchanged (correcting the plan's assumption here, documented in the commit).
- **`index.tsx`**: the hardcoded `oklch()` vignette flagged during planning had already been removed by Group B's hero rewrite (superseded by `ambient-glow`). The one remaining `oklch()` in the file is a plain black drop-shadow on a hover effect, correct as-is.

Scroll-reveal (the existing `Reveal` component) added to `browse.index.tsx`, `browse.$category.tsx`, and `events.index.tsx`'s listing grids, plus once to `page-shell.tsx`'s shared `Section` component — which automatically brought it to `pricing.tsx`, `about.tsx`, `contact.tsx`, `terms.tsx`, and `privacy.tsx` in one edit. Deliberately **not** added to any dashboard data table (business/organizer/admin dashboards, staff/products/leads/appointments lists), per the instruction that reveal belongs on marketing/browsing content only.

## GROUP E — Site-wide animation layer (`6ae728b`)

- **Skeletons**: wired the previously-unused `Skeleton` primitive into every bare "Loading…" spot found — `admin/route.tsx` and `business/dashboard/route.tsx`'s full-page gates, `dashboard/index.tsx`'s stat tiles, `products.tsx`'s table body, `billing.tsx`'s detail block, `appointments.tsx`/`requirements.tsx`/`staff.tsx` (a shared `CardListSkeleton`, since they're the same shape), `website.tsx`'s editor gate, `post-requirement.tsx`'s `MediaUploader` gate, and `events-section.tsx` (previously rendered nothing while loading — a blank flash — now a card-grid skeleton). Each matches its actual content shape rather than reusing one generic spinner.
- **Hover+tap feedback**: `business-card.tsx`/`event-card.tsx` already shared a hover recipe but had no tap feedback — added `active:scale-[0.98]`. Same added to the homepage category tile. `browse.index.tsx`'s category pills and the influencer card in `find-influencer.tsx` had **zero** hover feedback before (the influencer card was a plain non-interactive `<article>`) — added fresh.
- **Button press feedback**: no shared `Button` component exists (26 files hand-write `bg-primary` buttons), so this is one global CSS rule — `:where(button, a)[class*="bg-primary"]:active { transform: scale(0.97) }` — rather than touching every file.
- **Route-transition fade**: considered `framer-motion`'s `AnimatePresence` (the plan's original tentative pick) but identified a concrete risk during implementation — keying it by pathname around the root `<Outlet/>` would force full unmount/remount of persistent nested layouts (e.g. the business dashboard sidebar) on every sub-navigation, a real regression. Switched to TanStack Router's native `defaultViewTransition: true` (`src/router.tsx`), which crossfades via the browser's own View Transitions API without forcing React remounts, and no-ops gracefully in unsupported browsers. A `prefers-reduced-motion` guard disables the transition pseudo-elements' animation.

## GROUP F — Mobile-first pass (`963d3bf`)

A dedicated audit at 375px, checked live in-browser (not inferred from the desktop remap):

- **Hero/search input**: already correct from Group B — placeholder truncates cleanly, no overflow, headline wraps across 4 lines without awkward breaks at 375px.
- **Mobile nav**: measured before fixing — the hamburger toggle was ~36×36px and each nav row was inline text in a `py-2.5` wrapper (~40px tall, hit area only as wide as the text). Fixed: hamburger now exactly 44×44px, nav rows are full-width `min-h-11` blocks with `divide-y` separators, "Sign in"/"List your business" and the account-menu trigger + all 4 dropdown items resized the same way. Verified live via `getBoundingClientRect()` — every row now measures exactly 44px tall, 327px (full) wide.
- **Business dashboard mobile sidebar**: found the same class of bug one level deeper — the dashboard's own mobile "Menu" toggle button (`px-3 py-1.5 text-xs`, ~28px) and its nav links (`px-3 py-2 text-sm`, ~36px) were also under the guideline. Fixed identically to the site header.
- **Card/tile grid reflow — a real bug found and fixed, not just a style pass**: business/event cards used a fixed `aspect-square` on the whole card with a percentage-height content area (`h-[45%]`). At the 2-column mobile grid width (~165px cards), the square shrank to a size where the content area no longer had enough real height for its content — category badges and part of the description rendered entirely below the clipped edge, invisible. Confirmed by measuring `contentHeight` (73.5px) vs `scrollHeight` (116px) on an injected test card. Fixed by moving `aspect-square` to the image div only and letting the content area size to `flex-1` (its own content) instead of a fixed percentage — re-verified `contentHeight === scrollHeight` (196px both) after the fix, with both category badges now visible.
- **No hover-only functional gates found**: card zoom/gradient overlays and the "Browse →" arrow are decorative (`group-hover:opacity-100`), not gating any functionality — the whole card/tile is always tappable via its enclosing `<Link>` regardless of whether the decorative hover state ever fires on touch.
- **Hero typography clamp**: `text-6xl md:text-8xl` responsive classes already handle this — confirmed `document.body.scrollWidth === 375` (no horizontal overflow) at the viewport width.
- **Forms**: `auth.tsx` (sign-in and sign-up) verified live — full-width inputs, full-width submit button, 3-column role picker readable and tappable at 375px. `post-requirement.tsx` and the business/influencer/organizer onboarding forms reviewed in code — all inputs `w-full`, photo-upload grids collapse to a single column below `sm:`, no fixed-width elements found.
- **Business dashboard usability**: the products table has `overflow-x-auto` on its own wrapper (scrolls internally, not the page), so it doesn't force horizontal page scroll on narrow screens. The website builder's two-pane editor already collapses to a single stacked column below `lg:`, with the desktop-only fixed-width (`320px`) sidebar gated behind that breakpoint.

Not touched, and why: a handful of small (`~28px`) row-action buttons in the admin and organizer dashboards (edit/publish/delete-style buttons on data rows) are under the 44px guideline too, but weren't flagged as "genuinely broken" — they're internal-tool action buttons on desktop-first admin/organizer surfaces, not primary navigation or customer-facing flows, and Group F's brief specifically called out nav, hero, category tiles, forms, and the *business* dashboard. Noting this here rather than silently expanding scope; happy to pass over these too if you want the same treatment.

## Known limitations across the whole phase

- **No test credentials for any authenticated role** (customer, business, influencer, organizer) exist in this environment — full end-to-end flows (real form submissions, authenticated dashboard views, the actual post-requirement submit path) could not be exercised live. Verification instead relied on structural checks, computed styles, console/network inspection, and targeted DOM injection of the real component markup at the real breakpoint widths.
- **The Supabase project has no seeded business/event data** post-cutover, so pages like `/browse` and `/events` show empty states in the browser regardless of correctness — confirmed this is expected, not a regression (an old pre-cutover business ID now correctly resolves to "Business unavailable").
- Group C's specifically-requested Chrome-devtools network-throttling test was not run against the live submit flow, for the same test-credential reason — see Group C above.

## Not done / flagged for you

- `--accent` was given no explicit value — set equal to `--primary`. Say if you want a visually distinct accent color.
- `destructive`'s white-on-red contrast (4.83:1) is a thinner margin than everything else — flagged per instruction, not changed further since it does pass.
- A handful of small admin/organizer row-action buttons remain under 44px — see Group F's "not touched" note above.
