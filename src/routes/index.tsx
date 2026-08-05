import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BusinessCard } from "@/components/business-card";
import { FaqSection } from "@/components/faq-section";
import { Reveal } from "@/components/reveal";
import heroImage from "@/assets/luvlit-hero.jpg";
import { getCategories, getBusinesses, getCities } from "@/lib/public.functions";
import type { CategoryRow, CityRow, PublicBusiness } from "@/lib/public.types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuvLit — Discover India's Small Businesses & Brands" },
      {
        name: "description",
        content:
          "LuvLit connects you with small businesses, brands and influencers across India — browse by category and city, book appointments, and request quotes.",
      },
      { property: "og:title", content: "LuvLit — Discover India's Small Businesses & Brands" },
      {
        property: "og:description",
        content:
          "LuvLit connects you with small businesses, brands and influencers across India — browse by category and city, book appointments, and request quotes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => ({
    categories: await getCategories(),
    featured: await getBusinesses({ data: {} }),
    cities: await getCities(),
  }),
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
  { title: "A website of your own", body: "A branded page with your colours, catalog and videos — live in minutes, no developer." },
  { title: "Leads that find you", body: "Customers post requirements; matching businesses in your city get the lead instantly." },
  { title: "Appointments on autopilot", body: "Publish staff, working hours and slots. Customers book without a phone call." },
  { title: "Made for Indian shops", body: "WhatsApp-first contact, multi-city franchises, pan-India delivery and UPI-friendly pricing." },
];

function Index() {
  const { categories, featured, cities } = Route.useLoaderData() as {
    categories: CategoryRow[];
    featured: PublicBusiness[];
    cities: CityRow[];
  };
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);
  const featuredList = featured.filter((b) => b.featured).slice(0, 6);
  const recent = featured.slice(0, 6);
  const place = city || "India";
  const marquee = [...categories, ...categories];

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
        {/* Cinematic hero */}
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-primary">
            <img src={heroImage} alt="Indian small-business artisans on LuvLit" width={1920} height={1088} className="h-full w-full object-cover grayscale" />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/60 to-background" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,transparent,oklch(0.221_0.006_56/0.55))]" />
          </div>

          <div className="mx-auto max-w-6xl px-6 pb-24 pt-28 md:pb-32 md:pt-40">
            <p
              className="eyebrow rise-in text-background/80"
              style={{ animationDelay: "60ms" }}
            >
              Pan-India marketplace for local businesses
            </p>
            <h1
              className="rise-in mt-6 max-w-3xl text-5xl leading-[1.06] text-background md:text-7xl"
              style={{ animationDelay: "160ms" }}
            >
              The small businesses worth
              <span className="shimmer-text"> knowing</span>, near you.
            </h1>
            <p
              className="rise-in mt-7 max-w-xl text-lg text-background/85"
              style={{ animationDelay: "260ms" }}
            >
              Makers, studios, salons and neighbourhood brands — each with their own page. Book an
              appointment, request a quote, or find the right influencer for your brand.
            </p>

            <form
              className="rise-in mt-10 flex flex-col gap-3 rounded-xl border border-background/20 bg-background/95 p-3 shadow-2xl backdrop-blur sm:flex-row"
              style={{ animationDelay: "360ms" }}
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = `/browse?${new URLSearchParams({ city, q })}`;
              }}
            >
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-md border border-border bg-card px-4 py-3.5 text-sm transition-colors focus:border-accent focus:outline-none sm:w-52"
                aria-label="Select your city"
              >
                <option value="">All of India</option>
                {cities.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Try “block print saree”, “bakery”, “wedding photographer”…"
                className="flex-1 rounded-md border border-border bg-card px-4 py-3.5 text-sm transition-colors focus:border-accent focus:outline-none"
                aria-label="Search"
              />
              <button className="rounded-md bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:scale-[1.02] hover:opacity-95 active:scale-100">
                Search
              </button>
            </form>

            <div
              className="rise-in mt-8 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "460ms" }}
            >
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="group flex items-center gap-3 rounded-full border border-background/40 py-2 pl-2 pr-6 text-sm text-background transition-colors hover:border-background"
              >
                <span className="float-slow flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform group-hover:scale-110">
                  ▶
                </span>
                Watch the LuvLit film
              </button>
              <Link
                to="/auth"
                search={{ role: "business" }}
                className="text-sm text-background/80 underline-offset-4 hover:text-background hover:underline"
              >
                List your business free →
              </Link>
            </div>

            <div
              className="rise-in mt-16 grid grid-cols-2 gap-6 border-t border-background/20 pt-8 sm:grid-cols-4"
              style={{ animationDelay: "560ms" }}
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-serif text-3xl text-background md:text-4xl">{s.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-background/70">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scrolling category ribbon */}
        {categories.length > 0 && (
          <section className="overflow-hidden border-y border-border bg-secondary/60 py-4">
            <div className="marquee-track gap-8 whitespace-nowrap">
              {marquee.map((c, i) => (
                <span
                  key={`${c.id}-${i}`}
                  className="flex items-center gap-8 text-xs uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {c.name}
                  <span className="text-accent">◆</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
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

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, i) => (
              <Reveal key={category.id} delay={i * 60}>
                <Link
                  to="/browse/$category"
                  params={{ category: category.name }}
                  search={city ? { city } : undefined}
                  className="surface-card group relative block h-full overflow-hidden p-7 transition-all duration-500 hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_50px_-28px_oklch(0.221_0.006_56/0.5)]"
                >
                  <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent-soft opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <h3 className="relative text-xl">{category.name}</h3>
                  <p className="relative mt-3 text-sm text-muted-foreground">
                    Explore across {place}
                  </p>
                  <span className="relative mt-6 inline-block text-sm text-accent opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                    Browse →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Listings */}
        {(featuredList.length > 0 || recent.length > 0) && (
          <section className="bg-secondary/40 py-20">
            <div className="mx-auto max-w-6xl px-6">
              <Reveal>
                <p className="eyebrow">{featuredList.length ? "Featured" : "Recently joined"}</p>
                <h2 className="mt-3 text-3xl md:text-4xl">
                  {featuredList.length ? "In the spotlight" : "New on LuvLit"}
                </h2>
              </Reveal>
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-24">
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
                  <p className="font-serif text-4xl text-accent transition-transform duration-500 group-hover:-translate-y-1">
                    {s.step}
                  </p>
                  <h3 className="mt-4 text-xl">{s.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Cities */}
        {cities.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 pb-8">
            <Reveal>
              <div className="surface-card p-10">
                <p className="eyebrow">Across India</p>
                <h2 className="mt-3 text-3xl">Find businesses in your city</h2>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  {cities.slice(0, 24).map((c, i) => (
                    <Link
                      key={c.id}
                      to="/browse"
                      search={{ city: c.name }}
                      style={{ transitionDelay: `${i * 15}ms` }}
                      className="rounded-full border border-border px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* For owners */}
        <section className="mx-auto max-w-6xl px-6 py-24">
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
                  Guided setup, appointments, leads and chat included. ₹20 for your first month
                  after, then ₹199/month.
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
