# Local Gems Connect

PHASE 0 — Paste this first, as context (not a build instruction)

I'm building "LuvLit" — a pan-India marketplace connecting customers with small businesses, brands, and influencers, discoverable by category and location. Key context for everything we build together:

Businesses get an instant, AI-driven onboarding (not a manual form), can select multiple categories (or add a new category if theirs isn't listed), list multiple physical locations/franchises, and set a delivery area by city.

Businesses can be one or more types: product/catalog, appointment-based (with staff and time slots), or custom-order/portfolio-based.

Customers can browse by location, book appointments as guests (no account needed), post custom requirements with up to 3 photos to get quotes from matching businesses, and chat with businesses (account required for chat, saving favorites, and viewing past quotes).

Businesses can also post requirements of their own (e.g. sourcing a supplier, hiring another business's service) — the same requirement-and-matching system works both ways, business-to-business and customer-to-business.

There's a dedicated "Find an Influencer" section for brands, separate from the main customer marketplace. Influencer profiles require admin approval before going live — this is a manual verification step, not instant.

Featured/paid placement is capped per category and location to preserve scarcity.

Design direction — read this carefully: the overall marketplace shell (homepage, browse, search) should feel premium and editorial, NOT a dense classifieds/directory look like IndiaMART or Justdial — generous whitespace, refined typography, restrained color use. But individual business profile pages must feel like that business's own professional website, not a listing embedded inside our marketplace. Each profile should feel spacious, branded, and standalone — more like landing on a real business's site that happens to be hosted on our platform, not a card in a catalog.

Acknowledge you understand this context — we'll build it together in phases from here.

PHASE 1 — Project setup & design system

Set up a new Next.js 14 app with Tailwind CSS and Supabase. Establish a design system as global Tailwind config and CSS variables:

Colors: warm ivory background (#FBF8F2), deep charcoal-ink text (#1C1917), a deep forest green primary (#173D2E), and a warm antique gold accent (#B8935F) used sparingly for highlights, badges, and CTAs — never as a dominant fill color. Avoid red, bright blue, and bright orange entirely; this must not resemble a classifieds site.

Typography: an elegant serif (Fraunces or Playfair Display) for headings and brand name, a clean modern sans-serif (Inter) for body text and UI elements. Generous line-height and letter-spacing on headings for an editorial feel.

Component style: cards with subtle borders (not heavy drop shadows), restrained badges, plenty of whitespace, no dense grids of competing colors. Buttons should feel premium — solid deep green primary, outlined gold secondary.

Create a basic homepage shell with a header (logo "LuvLit", nav placeholder) and footer, using this design system, so we can confirm the aesthetic before building further.

PHASE 2 — Database schema

In Supabase, create the following tables:

businesses (id, owner_id, name, description, categories text[], business_types text[], instagram_url, is_live boolean, brand_accent_color text nullable, created_at)

locations (id, business_id, address, city, state, is_primary boolean)

delivery_areas (id, business_id, city, is_pan_india boolean)

categories (id, name, is_approved boolean, suggested_by_business_id nullable, created_at)

staff (id, business_id, name, specializations text[], working_hours jsonb, slot_duration_minutes int)

slots (id, staff_id, date, start_time, status)

bookings (id, slot_id, customer_name, customer_phone, customer_email, status, notes, created_at)

items (id, business_id, name, description, price, image_url, is_active)

requirements (id, posted_by_type, posted_by_customer_id nullable, posted_by_business_id nullable, category, description, city, budget, image_urls text[], created_at)

leads (id, requirement_id, matched_business_id, status, created_at)

conversations (id, party_a_type, party_a_id, party_b_type, party_b_id, requirement_id nullable, created_at)

messages (id, conversation_id, sender_type, sender_id, content, created_at)

influencer_profiles (id, business_id, instagram_handle, follower_count, engagement_rate, categories text[], rate_card jsonb, is_verified boolean, approval_status, submitted_at, reviewed_at)

featured_placements (id, business_id, scope, city nullable, start_date, end_date, plan_tier)

subscriptions (id, business_id, plan, status, is_intro_month boolean, razorpay_subscription_id, current_period_end)

customers (id, auth_user_id, name, phone, email)

Note posted_by_type on requirements is either 'customer' or 'business', and party_a_type/party_b_type on conversations can each be 'customer', 'business', or 'influencer' — this lets the same tables support customer↔business, business↔business, and brand↔influencer conversations without separate systems.

Enable Row Level Security on all tables. Businesses can only edit their own data; customers can only see their own bookings/requirements/conversations; public read access for live, approved business and influencer profiles only.

PHASE 3 — Auth (two account types)

Add Supabase Auth with two account types: business owner and customer, using a role field. Build:

/signup and /signin — role selection at signup (business or customer)

After business signup, redirect to /business/onboarding

After customer signup, redirect to /dashboard

Customers can browse and book appointments WITHOUT an account — only require login when they try to chat, save a favorite, or view their requirement history. Show a friendly "sign in to save/chat" prompt at those specific moments, not before.

PHASE 4 — Business onboarding (AI chat)

Build /business/onboarding — a conversational AI setup flow using the Claude API. The AI asks, one at a time:

Business name and description

Categories — searchable multi-select from the categories table where is_approved = true. If their category isn't listed, let them type a new one. On submit, insert it into categories with is_approved = false and suggested_by_business_id set, but still attach it to this business's profile immediately so they aren't blocked. Flag it for admin review (Phase 12) to approve/merge/rename before it's suggested to future businesses.

Business type(s) — product/catalog, appointment-based, custom-order (multi-select, explain briefly what each means)

Primary location (address, city, state) — with an option to "add another branch" repeatable

Delivery area — multi-select cities, or a "I deliver/serve all of India" toggle

Contact info (WhatsApp, email)

Instagram link

Up to 3 short video links (Instagram Reels/YouTube Shorts URLs) + 1 main video link

Optional: pick a brand accent color for their profile page (from a curated set of 6–8 tasteful options, all pre-tested to look good against the ivory base) — this is what makes their profile feel like their own site rather than identical to every other listing.

On completion, save everything, set is_live = true, and redirect to /business/dashboard. If they selected "appointment-based," redirect first to /business/setup-staff before the dashboard.

PHASE 5 — Appointment booking setup (staff & slots)

Build /business/setup-staff, shown only to appointment-based businesses. Let the owner add multiple staff members, each with: name, specializations (multi-select from their business categories), working days/hours, and slot duration (15/30/60 min). On save, generate slots rows for the next 30 days based on each staff member's hours and slot duration.

Build the customer-facing booking widget for business profile pages: customer selects a specialization → sees staff members offering it → sees their open slots → picks one → enters name and phone (no account required) → confirms. On booking, mark the slot 'booked', save to bookings, notify the business owner.

PHASE 6 — Business profile pages (built to feel like their own website)

Build /business/[id] as a full, spacious, single-business page — this is the most important design moment on the platform, so take real care here:

Full-width hero section using the business's own brand accent color as a subtle wash/highlight (not the marketplace's default green/gold), their name in large serif type, their description, and their main video prominently embedded

A clean nav-free or minimal-nav layout while on this page — no marketplace sidebar, no "more businesses like this" clutter competing for attention. This page should feel like arriving at a dedicated site, with a small, unobtrusive "part of LuvLit" mark/link back to the marketplace, not a prominent marketplace header

Sections in order: hero, about, all locations (map-style list if multiple), delivery area, catalog/portfolio gallery (using their content, generous image sizing), the 3 short videos embedded together, appointment booking widget (if applicable), reviews/testimonials, contact/chat/WhatsApp CTA

The overall page structure is consistent across all businesses (so it's still recognizably LuvLit-powered and functional), but the accent color, imagery, and content make each one feel distinct and owned by that business

Also build /browse/[category] — this page keeps the standard marketplace shell (nav, search, filters) since it's a discovery page, not a brand's own space. Show businesses matching the category AND (location matches customer's city, OR delivery area includes it, OR pan-India). Featured businesses matching location pin at top, clearly labeled "Featured."

Build the homepage: location selector, search bar, category grid (pulling from approved categories), and a "Featured" carousel.

PHASE 7 — Requirements & lead matching (customer-to-business AND business-to-business)

Build /post-requirement, usable by both logged-in customers and logged-in businesses. The poster selects a category, writes a description, sets a city, optional budget, and can attach up to 3 images. On submit, save to requirements with the correct posted_by_type, then find all live businesses matching that category and location/delivery coverage, and create a leads row plus a conversations row for each match.

Build the "Quotes received" view at /dashboard/requirements (customers) and /business/dashboard/requirements (businesses posting their own requirements) — same UI pattern, shows responses per posted requirement.

Build the "Leads" inbox at /business/dashboard/leads — matched requirements from either customers or other businesses, shown as new leads with images and a button into the chat.

PHASE 8 — Chat system

Build real-time chat using Supabase Realtime, tied to conversations and messages. Must support all three pairings: customer↔business, business↔business, and (Phase 10) business↔influencer, using the generic party_a_type/party_b_type fields from Phase 2. Simple message list + input box, same component reused across all contexts.

PHASE 9 — Featured placement & Razorpay billing

Build /business/dashboard/featured — choose scope (specific city or all-India) and duration (monthly/yearly). Enforce a cap: check active featured placements for that category + location combination before allowing purchase; if full, show "Featured slots full for this location — join the waitlist."

Integrate Razorpay Subscriptions:

Base listing is completely free for every business until November 30

Anyone whose subscription starts after November 30 pays ₹20 for their first billing month, then ₹199/month from the second month onward — implement this as a subscription plan with an intro-price first cycle that switches to standard price automatically, or handle it as a one-time ₹20 charge followed by starting a standard ₹199/month Razorpay subscription the next cycle, whichever Razorpay's subscription API supports more cleanly

Featured — Custom Location: ₹499/month

Featured — All India: ₹999/month

Yearly billing available at a 2-months-free equivalent discount

On successful payment, update subscriptions and featured_placements. Handle Razorpay webhooks for renewal success/failure.

PHASE 10 — Influencer profiles (requires admin approval)

Build /influencer/onboarding — collects Instagram handle (via Meta's official API connection for verified stats where possible, manual self-reported as an unverified fallback), content categories they promote most, and an optional rate card. Free for influencers.

On submit, set approval_status = 'pending' — do not make the profile publicly visible yet. Show the influencer a "Submitted — under review" confirmation screen.

Build /admin/influencer-approvals (Phase 12 will build the full admin area, but include this specific screen now since it gates a whole feature) — a simple list of pending influencer submissions with their Instagram link, stats, and categories, and Approve/Reject buttons. Approving sets approval_status = 'approved' and is_verified accordingly, making the profile live.

Build /find-influencer — search/filter for businesses only, showing only approved profiles, filterable by category, follower range, city, and whether rates are listed. Links into chat.

PHASE 11 — Dashboards

Build /business/dashboard: profile summary, upcoming appointments, new leads count, active conversations, subscription status, basic analytics (profile views, leads received this month, bookings this month), and a shortcut to post their own requirement.

Build /dashboard for customers: upcoming appointments, requirement/quote history, saved/favorite businesses, active conversations.

PHASE 12 — Admin area & final polish

Build a simple /admin area (protected, restricted to your own account): pending business profiles for light after-the-fact review, pending category suggestions with Approve/Merge/Rename actions, pending influencer approvals (link back to Phase 10's screen), and a basic revenue/subscriptions overview.

Final design pass: confirm every marketplace-shell page (home, browse, dashboards) follows the Phase 1 design system consistently, and confirm every business profile page (Phase 6) genuinely reads as "their own site" — check spacing, color wash usage, and that no marketplace navigation clutter has crept back in. Test mobile responsiveness across every page.

**Live app**: https://luvlit.in

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
cp .env.example .env   # fill in real values from your Supabase project settings
npm i
npm run dev
```

Database schema/RLS changes live in `supabase/migrations/`, applied via `npx supabase db push`.
`npm run typecheck` runs automatically before `npm run build`; `npm test` runs the test suite.
