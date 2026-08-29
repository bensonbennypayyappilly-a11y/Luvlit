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
import { DiscoveryStrip, IndiaDiscoveryMap } from "@/components/india-discovery-map";
import {
  getCategories,
  getBusinesses,
  getCities,
  getSubdomainBusiness,
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
    return {
      type: "home" as const,
      categories: await getCategories(),
      featured: await getBusinesses({ data: {} }),
      cities: await getCities(),
    };
  },
  component: Index,
});

const POPULAR_SEARCHES = [
  "Home Cleaning",
  "Salons",
  "Photographers",
  "Cafes",
  "Fitness Studios",
  "Event Planners",
  "Bakeries",
  "Interior Designers",
];

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
    | {
        type: "home";
        categories: CategoryRow[];
        featured: PublicBusiness[];
        cities: CityRow[];
      };

  if (data.type === "business") {
    return <BusinessProfilePreview business={toProfileBusiness(data.business)} />;
  }
  return <HomePage categories={data.categories} featured={data.featured} cities={data.cities} />;
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
    { value: `${featured.length || 0}+`, label: "Businesses listed" },
    { value: `${cities.length || 0}`, label: "Cities live" },
    { value: `${categories.length || 0}`, label: "Categories" },
    { value: "₹0", label: "To list until 30 Nov" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — search-first, India-outline discovery map on the right, no photo */}
        <section className="relative isolate overflow-hidden bg-background">
          <div className="mx-auto max-w-6xl px-6 pb-10 pt-12 md:pb-12 md:pt-14">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="eyebrow rise-in" style={{ animationDelay: "60ms" }}>
                  Pan-India marketplace for local businesses
                </p>
                <h1
                  className="headline rise-in mt-5 max-w-xl text-4xl sm:text-5xl lg:text-6xl"
                  style={{ animationDelay: "160ms" }}
                >
                  Find local businesses you&rsquo;ll <em className="text-accent italic">love</em> to
                  support.
                </h1>
                <p
                  className="rise-in mt-5 max-w-md text-base text-muted-foreground md:text-lg"
                  style={{ animationDelay: "260ms" }}
                >
                  Discover trusted makers, studios, salons, neighbourhood brands and service
                  providers near you.
                </p>

                <div className="rise-in mt-8 max-w-2xl" style={{ animationDelay: "340ms" }}>
                  <SearchPill
                    categories={categories}
                    city={city}
                    onCityChange={setCity}
                    onQueryChange={setQuery}
                  />
                  <LiveResultsPanel query={query} businesses={featured} />
                </div>

                <div
                  className="rise-in mt-4 flex max-w-2xl flex-wrap items-center gap-2"
                  style={{ animationDelay: "420ms" }}
                >
                  <span className="text-xs text-muted-foreground">Popular:</span>
                  {POPULAR_SEARCHES.map((term) => (
                    <Link
                      key={term}
                      to="/browse"
                      search={{ q: term }}
                      className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rise-in" style={{ animationDelay: "220ms" }}>
                <IndiaDiscoveryMap />
                <DiscoveryStrip className="mt-6" />
              </div>
            </div>
          </div>
        </section>

        {/* Stats — compact supporting strip, not a headline section */}
        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto grid max-w-6xl grid-cols-3 gap-4 px-6 py-5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-10">
            {stats.map((s) => (
              <div key={s.label}>
                <span className="font-display text-xl text-foreground md:text-2xl">{s.value}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-6xl px-6 py-14">
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

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {categories.slice(0, 5).map((category, i) => (
              <Reveal key={category.id} delay={i * 60}>
                <Link
                  to="/browse/$category"
                  params={{ category: category.name }}
                  search={city ? { city } : undefined}
                  className="surface-card group relative block h-full overflow-hidden p-5 transition-all duration-500 hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_50px_-28px_oklch(0_0_0/0.35)] active:scale-[0.98] active:duration-150"
                >
                  <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent-soft opacity-0 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100" />
                  <h3 className="relative text-base">{category.name}</h3>
                  <p className="relative mt-2 text-sm text-muted-foreground">
                    Explore across {place}
                  </p>
                  <span className="relative mt-4 inline-block text-sm text-accent opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                    Browse →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Listings */}
        {(featuredList.length > 0 || recent.length > 0) && (
          <section className="bg-secondary/40 py-14">
            <div className="mx-auto max-w-6xl px-6">
              <Reveal>
                <p className="eyebrow">{featuredList.length ? "Featured" : "Recently joined"}</p>
                <h2 className="mt-3 text-3xl md:text-4xl">
                  {featuredList.length ? "In the spotlight" : "New on LuvLit"}
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
        <section className="mx-auto max-w-6xl px-6 py-12">
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
        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <Reveal>
              <div>
                <p className="eyebrow">For businesses</p>
                <h2 className="mt-3 max-w-sm text-3xl md:text-4xl">
                  Get discovered by the people looking for you.
                </h2>
              </div>
            </Reveal>

            <div>
              <div className="grid gap-5 sm:grid-cols-2">
                {OWNER_PERKS.map((p, i) => (
                  <Reveal key={p.title} delay={i * 80}>
                    <div className="border-t border-border pt-4 transition-colors hover:border-accent">
                      <h3 className="text-base font-medium">{p.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground">{p.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal>
                <div className="mt-8 rounded-xl bg-primary p-8 text-primary-foreground md:p-10">
                  <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl text-primary-foreground md:text-3xl">
                        Ready to get discovered?
                      </h2>
                      <p className="mt-3 max-w-lg text-sm text-primary-foreground/80">
                        Create your LuvLit page and start reaching customers looking for what you
                        offer. Free to list until 30 November — then ₹{PLANS.base.introPrice} for
                        your first month, ₹{PLANS.base.price}/month after.
                      </p>
                    </div>
                    <Link
                      to="/auth"
                      search={{ role: "business" }}
                      className="shrink-0 rounded-md bg-background px-8 py-3.5 text-sm font-medium text-foreground transition-transform hover:scale-[1.03]"
                    >
                      List your business →
                    </Link>
                  </div>
                </div>
              </Reveal>
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
