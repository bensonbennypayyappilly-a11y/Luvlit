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
import heroImage from "@/assets/luvlit-hero.jpg";

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
    | { type: "home"; categories: CategoryRow[]; featured: PublicBusiness[]; cities: CityRow[] };

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
  const [presetQuery, setPresetQuery] = useState<string | undefined>(undefined);
  const featuredList = featured.filter((b) => b.featured).slice(0, 6);
  const recent = featured.slice(0, 6);
  const place = city || "India";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative isolate overflow-hidden bg-dark-bg">
          <div className="absolute inset-0 -z-20">
            <img
              src={heroImage}
              alt=""
              width={1920}
              height={1088}
              className="h-full w-full object-cover grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-dark-bg/75 via-dark-bg/65 to-dark-bg/90" />
          </div>
          <div className="ambient-glow absolute inset-0 -z-10" aria-hidden="true" />

          <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 md:pb-28 md:pt-16">
            <p className="eyebrow rise-in text-dark-fg/80" style={{ animationDelay: "60ms" }}>
              Pan-India marketplace for local businesses
            </p>
            <h1
              className="headline rise-in mt-5 max-w-2xl text-4xl text-dark-fg sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "160ms" }}
            >
              Local businesses worth knowing.
            </h1>
            <p
              className="rise-in mt-6 max-w-xl text-lg text-dark-fg/85"
              style={{ animationDelay: "260ms" }}
            >
              Makers, studios, salons and neighbourhood brands — each with their own page. Book,
              message, or get a quote in minutes.
            </p>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-16 max-w-4xl px-6 md:-mt-20">
          <div
            className="rise-in surface-card p-4 shadow-[0_30px_70px_-30px_oklch(0_0_0/0.4)] sm:p-5"
            style={{ animationDelay: "360ms" }}
          >
            <SearchPill
              categories={categories}
              city={city}
              onCityChange={setCity}
              onQueryChange={setQuery}
              presetQuery={presetQuery}
            />
            <LiveResultsPanel
              query={query}
              businesses={featured}
              categories={categories}
              cities={cities}
              onChipClick={setPresetQuery}
            />
          </div>

          <div
            className="rise-in mt-6 flex flex-wrap items-center justify-between gap-4"
            style={{ animationDelay: "460ms" }}
          >
            <Link
              to="/post-requirement"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-all hover:gap-2.5"
            >
              Can't find it? Post a requirement instead →
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Now live across India — free to list until 30 November
            </span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
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

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {categories.slice(0, 5).map((category, i) => (
              <Reveal key={category.id} delay={i * 60}>
                <Link
                  to="/browse/$category"
                  params={{ category: category.name }}
                  search={city ? { city } : undefined}
                  className="surface-card group relative block h-full overflow-hidden p-5 transition-all duration-500 hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_50px_-28px_oklch(0_0_0/0.35)] active:scale-[0.98] active:duration-150"
                >
                  <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent-soft opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
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

        {(featuredList.length > 0 || recent.length > 0) && (
          <section className="bg-secondary/40 py-20">
            <div className="mx-auto max-w-6xl px-6">
              <Reveal>
                <p className="eyebrow">{featuredList.length ? "Featured" : "Recently joined"}</p>
                <h2 className="mt-3 text-3xl md:text-4xl">
                  {featuredList.length ? "In the spotlight" : "New on LuvLit"}
                </h2>
              </Reveal>
              <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                {(featuredList.length ? featuredList : recent).map((b, i) => (
                  <Reveal key={b.id} delay={i * 80}>
                    <BusinessCard business={b} />
                  </Reveal>
                ))}
              </div>
              <Reveal>
                <div className="mt-12 text-center">
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

        <EventsSection city={city || undefined} />

        <section className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <p className="eyebrow">How LuvLit works</p>
            <h2 className="mt-3 max-w-2xl text-3xl md:text-4xl">
              From a search to a booking, in three steps.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
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

        <section className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <p className="eyebrow">For business owners</p>
            <h2 className="mt-3 max-w-2xl text-3xl md:text-4xl">
              Your own website, and the leads to fill it.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {OWNER_PERKS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div className="surface-card h-full p-8 transition-all duration-500 hover:-translate-y-1 hover:border-accent">
                  <h3 className="text-xl">{p.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-12 flex flex-col items-start gap-6 rounded-lg bg-primary p-12 text-primary-foreground md:flex-row md:items-center md:justify-between">
              <div>
                <p className="eyebrow">Launch offer</p>
                <h2 className="mt-3 text-3xl text-primary-foreground">
                  Free listing until 30 November.
                </h2>
                <p className="mt-4 max-w-lg text-primary-foreground/80">
                  Guided setup, appointments, leads and chat included. ₹{PLANS.base.introPrice} for
                  your first month after, then ₹{PLANS.base.price}/month.
                </p>
              </div>
              <Link
                to="/auth"
                search={{ role: "business" }}
                className="rounded-md bg-background px-8 py-3.5 text-sm font-medium text-foreground transition-transform hover:scale-[1.03]"
              >
                List your business
              </Link>
            </div>
          </Reveal>
        </section>

        <FaqSection />
      </main>

      <SiteFooter />
    </div>
  );
}
