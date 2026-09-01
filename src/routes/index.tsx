import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BusinessCard } from "@/components/business-card";
import { FaqSection } from "@/components/faq-section";
import { Reveal } from "@/components/reveal";
import { SearchPill } from "@/components/search-pill";
import { LiveResultsPanel } from "@/components/live-results-panel";
import { EventsSection } from "@/components/events-section";
import { IndiaDiscoveryMap } from "@/components/india-discovery-map";
import { CategoryCard } from "@/components/category-card";
import { Store, MapPin, LayoutGrid, IndianRupee } from "lucide-react";
import {
  getCategories,
  getBusinesses,
  getCities,
  getSubdomainBusiness,
  isBusinessSubdomainRequest,
} from "@/lib/public.functions";
import { buildBusinessHead, toProfileBusiness } from "@/lib/business-seo";
import { BusinessProfilePreview } from "@/components/business-profile-preview";
import type { CategoryRow, CityRow, PublicBusiness } from "@/lib/public.types";
import { PLANS } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => {
    if (loaderData?.type === "business") {
      return buildBusinessHead(
        loaderData.business,
        `https://${loaderData.business.slug}.luvlit.in/`,
      );
    }
    if (loaderData?.type === "unavailable") {
      return { meta: [{ title: "This page isn't available yet — LuvLit" }] };
    }
    return {
      meta: [
        { title: "LuvLit — Find local businesses & brands near you" },
        {
          name: "description",
          content:
            "Browse handmade, fashion, decor, food and service businesses by city, book appointments without an account, and post a requirement to get quotes from matching sellers.",
        },
        { property: "og:title", content: "Find local businesses & brands near you — LuvLit" },
        {
          property: "og:description",
          content:
            "Browse by category and city, book appointments without an account, and post a requirement to get quotes from matching Indian small businesses.",
        },
        { property: "og:url", content: "https://luvlit.in/" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: "https://luvlit.in/" }],
    };
  },
  loader: async () => {
    const subdomainBusiness = await getSubdomainBusiness();
    if (subdomainBusiness) {
      return { type: "business" as const, business: subdomainBusiness };
    }
    // This host IS a business subdomain (e.g. {slug}.luvlit.in), but no live business resolved
    // for it — still building, unpublished, or suspended. Never fall through to LuvLit's own
    // marketplace homepage here: that would put LuvLit's content on the business's own address,
    // exactly the mix-up loadSubdomainPage already prevents on every other page.
    if (await isBusinessSubdomainRequest()) {
      return { type: "unavailable" as const };
    }
    return {
      type: "home" as const,
      categories: await getCategories(),
      featured: await getBusinesses({ data: {} }),
      cities: await getCities(),
    };
  },
  component: Index,
});

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Search your city",
    body: "Pick a category and a city — from Jaipur block-printers to Kochi photographers.",
  },
  {
    step: "02",
    title: "Open their own page",
    body: "Every business gets a real website: photos, catalog, films, locations and delivery areas.",
  },
  {
    step: "03",
    title: "Book, chat or request a quote",
    body: "Reserve an appointment slot, message the owner, or post a requirement and let leads come to you.",
  },
];

const OWNER_PERKS = [
  {
    title: "A website of your own",
    body: "A branded page with your colours, catalog and videos — live in minutes, no developer.",
  },
  {
    title: "Leads that find you",
    body: "Customers post requirements; matching businesses in your city get the lead instantly.",
  },
  {
    title: "Appointments on autopilot",
    body: "Publish staff, working hours and slots. Customers book without a phone call.",
  },
  {
    title: "Made for Indian shops",
    body: "WhatsApp-first contact, multi-city franchises, pan-India delivery and UPI-friendly pricing.",
  },
];

function Index() {
  const data = Route.useLoaderData() as
    | { type: "business"; business: NonNullable<import("@/lib/public.types").BusinessDetail> }
    | { type: "unavailable" }
    | {
        type: "home";
        categories: CategoryRow[];
        featured: PublicBusiness[];
        cities: CityRow[];
      };

  if (data.type === "business") {
    return <BusinessProfilePreview business={toProfileBusiness(data.business)} />;
  }
  if (data.type === "unavailable") {
    return <SiteUnavailable />;
  }
  return <HomePage categories={data.categories} featured={data.featured} cities={data.cities} />;
}

/** Shown on a business's own subdomain when that business hasn't gone live yet (still being
 * built, or suspended) — deliberately not LuvLit's marketplace homepage, and not full site
 * chrome either, since this address belongs to the business, not to LuvLit. */
function SiteUnavailable() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <p className="eyebrow">LuvLit</p>
      <h1 className="text-2xl">This page isn't available yet</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The business at this address hasn't published their page yet. Check back soon.
      </p>
    </div>
  );
}

function HomePage({
  categories,
  featured,
  cities,
}: {
  categories: CategoryRow[];
  featured: PublicBusiness[];
  cities: CityRow[];
}) {
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const featuredList = featured.filter((b) => b.featured).slice(0, 6);
  const recent = featured.slice(0, 6);
  const place = city || "India";

  const stats = [
    { value: `${featured.length || 0}+`, label: "Businesses listed", icon: Store },
    { value: `${cities.length || 0}`, label: "Cities live", icon: MapPin },
    { value: `${categories.length || 0}`, label: "Categories", icon: LayoutGrid },
    { value: "₹0", label: "To list until 30 Nov", icon: IndianRupee },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — search-first, India-outline discovery map on the right, no photo */}
        <section className="relative isolate overflow-hidden bg-background">
          {/* Editorial greyscale collage behind the right half only. Purely decorative: it is
              aria-hidden, takes no pointer events, and sits below the content in the section's
              own stacking context (the section is `isolate`), so the map and its animated
              discovery cards are untouched.
              Shown from lg up, not md: the hero only splits into two columns at lg, so below
              that the headline runs full-width and a right-hand collage would sit behind it. */}
          <div
            aria-hidden="true"
            className="hero-collage pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[55%] lg:block xl:w-[52%]"
          />
          <div className="mx-auto max-w-7xl px-6 pb-8 pt-12 md:pb-10 md:pt-14">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="eyebrow rise-in" style={{ animationDelay: "60ms" }}>
                  Pan-India marketplace for local businesses
                </p>
                <h1
                  className="headline rise-in mt-5 max-w-xl text-4xl sm:text-5xl lg:text-[56px]"
                  style={{ animationDelay: "160ms" }}
                >
                  Find local businesses you&rsquo;ll{" "}
                  <span className="love-underline text-accent">love</span> to support.
                </h1>
                <p
                  className="rise-in mt-4 max-w-md text-[15px] text-muted-foreground md:text-base"
                  style={{ animationDelay: "260ms" }}
                >
                  Discover trusted makers, studios, salons, neighbourhood brands and service
                  providers near you.
                </p>

                <div className="rise-in mt-7 w-full" style={{ animationDelay: "340ms" }}>
                  <SearchPill
                    categories={categories}
                    city={city}
                    onCityChange={setCity}
                    onQueryChange={setQuery}
                  />
                  <LiveResultsPanel query={query} businesses={featured} />
                </div>

                <Link
                  to="/post-requirement"
                  className="rise-in group mt-4 inline-flex max-w-2xl items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  style={{ animationDelay: "420ms" }}
                >
                  Can&rsquo;t find what you&rsquo;re looking for?
                  <span className="inline-flex items-center gap-1 font-medium text-accent">
                    Post a requirement
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </div>

              <div className="rise-in relative" style={{ animationDelay: "220ms" }}>
                {/* Lifts the map off the collage behind it. Sits under the map in DOM order, so
                    the outline and the animated discovery cards both still paint above it. */}
                <div
                  aria-hidden="true"
                  className="hero-map-halo pointer-events-none absolute inset-x-[2%] inset-y-[2%] hidden lg:block"
                />
                <IndiaDiscoveryMap />
                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  Discovering across India
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats — compact supporting strip, not a headline section */}
        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-5 px-6 py-5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-12 sm:gap-y-0">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-xl text-foreground md:text-2xl">
                    {s.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          <Reveal>
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Browse</p>
                <h2 className="mt-3 text-3xl md:text-4xl">Shop by category</h2>
              </div>
              <Link
                to="/browse"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                View all →
              </Link>
            </div>
          </Reveal>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.slice(0, 5).map((category, i) => (
              <Reveal key={category.id} delay={i * 60}>
                <CategoryCard category={category} city={city} delay={i * 60} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* Listings */}
        {(featuredList.length > 0 || recent.length > 0) && (
          <section className="bg-secondary/40 py-12">
            <div className="mx-auto max-w-7xl px-6">
              <Reveal>
                <p className="eyebrow">{featuredList.length ? "Featured" : "Recently joined"}</p>
                <h2 className="mt-3 text-3xl md:text-4xl">
                  {featuredList.length ? "Worth discovering" : "New on LuvLit"}
                </h2>
              </Reveal>
              <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                {(featuredList.length ? featuredList : recent).map((b, i) => (
                  <Reveal key={b.id} delay={i * 80}>
                    <BusinessCard business={b} />
                  </Reveal>
                ))}
              </div>
              <Reveal>
                <div className="mt-10 text-center">
                  <Link
                    to="/browse"
                    className="inline-block rounded-md border border-border bg-card px-8 py-3.5 text-sm transition-colors hover:border-accent"
                  >
                    See every business
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-6 py-10">
          <Reveal>
            <p className="eyebrow">How LuvLit works</p>
            <h2 className="mt-3 max-w-2xl text-3xl md:text-4xl">
              From a search to a booking, in three steps.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal key={s.step} delay={i * 120}>
                <div className="group h-full border-t border-border pt-6 transition-colors hover:border-accent">
                  <p className="text-4xl font-semibold text-accent transition-transform duration-500 group-hover:-translate-y-1">
                    {s.step}
                  </p>
                  <h3 className="mt-4 text-xl">{s.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* For businesses — secondary, editorial two-column, compact */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <Reveal>
              <div>
                <p className="eyebrow">For businesses</p>
                <h2 className="mt-3 max-w-sm text-3xl md:text-4xl">
                  Get discovered by the people looking for you.
                </h2>

                <div className="mt-8 border-t border-border pt-6">
                  <h3 className="text-xl">Ready to get discovered?</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Create your LuvLit page and start reaching customers looking for what you offer.
                    Free to list until 30 November — then ₹{PLANS.base.introPrice} for your first
                    month, ₹{PLANS.base.price}/month after.
                  </p>
                  <Link
                    to="/auth"
                    search={{ role: "business" }}
                    className="mt-5 inline-block rounded-md bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
                  >
                    List your business →
                  </Link>
                </div>
              </div>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {OWNER_PERKS.map((p, i) => (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="surface-card h-full p-5 transition-colors hover:border-accent">
                    <h3 className="text-base font-medium">{p.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <EventsSection city={city || undefined} />

        <FaqSection />
      </main>

      <SiteFooter />
    </div>
  );
}
