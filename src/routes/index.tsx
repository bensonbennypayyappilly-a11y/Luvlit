import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BusinessCard } from "@/components/business-card";
import { FaqSection } from "@/components/faq-section";
import { Reveal } from "@/components/reveal";
import { SearchPill } from "@/components/search-pill";
import { FeaturedSpotlightPanel } from "@/components/featured-spotlight-panel";
import { EventsSection } from "@/components/events-section";
import { getCategories, getBusinesses, getCities, getSubdomainBusiness } from "@/lib/public.functions";
import { buildBusinessHead, toProfileBusiness } from "@/lib/business-seo";
import { BusinessProfilePreview } from "@/components/business-profile-preview";
import type { CategoryRow, CityRow, PublicBusiness } from "@/lib/public.types";
import { PLANS } from "@/lib/constants";
import heroImage from "@/assets/luvlit-hero.jpg";

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => {
    if (loaderData?.type === "business") {
      return buildBusinessHead(loaderData.business, `https://${loaderData.business.slug}.luvlit.in/`);
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
    // A request to {slug}.luvlit.in/ renders that business's public profile here
    // instead of the marketplace homepage — see getSubdomainBusiness for the
    // Host-header matching logic. Any other host (localhost, *.vercel.app, luvlit.in
    // itself) falls through to the normal homepage below.
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
  { title: "A website of your own", body: "A branded page with your colours, catalog and videos — live in minutes, no developer." },
  { title: "AI-matched leads", body: "Customers post requirements; our engine matches them to your business instantly — no manual searching." },
  { title: "Appointments on autopilot", body: "Publish staff, working hours and slots. Customers book without a phone call." },
  { title: "Made for Indian shops", body: "WhatsApp-first contact, multi-city franchises, pan-India delivery and UPI-friendly pricing." },
];

/** Scroll-triggered count-up for a stat string like "54", "0+" or "₹0" — animates the numeric part, keeps any prefix/suffix. */
function AnimatedStat({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = value.match(/^(\D*)(\d+)(\D*)$/);
    const el = ref.current;
    if (!match || !el || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }
    const [, prefix, digits, suffix] = match;
    const target = parseInt(digits, 10);
    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const duration = 1100;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(`${prefix}${Math.round(target * eased)}${suffix}`);
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <p ref={ref} className={className}>
      {display}
    </p>
  );
}

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
  const [spotlightOpen, setSpotlightOpen] = useState(false);
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
        {/* Hero — light two-column layout: search left, photo collage + floating pitch cards right */}
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-secondary/60 to-background pb-8 pt-10 md:pb-10 md:pt-12">
          <div className="ambient-glow-soft absolute inset-0 -z-10" aria-hidden="true" />

          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <p className="eyebrow rise-in" style={{ animationDelay: "60ms" }}>
                  Pan-India marketplace for local businesses
                </p>
                <h1
                  className="headline rise-in mt-5 max-w-xl text-4xl sm:text-5xl lg:text-6xl"
                  style={{ animationDelay: "160ms" }}
                >
                  Local businesses worth knowing.
                </h1>
                <p
                  className="rise-in mt-5 max-w-xl text-lg text-muted-foreground"
                  style={{ animationDelay: "260ms" }}
                >
                  Makers, studios, salons and neighbourhood brands — each with their own page. Book,
                  message, or get a quote in minutes.
                </p>

                <div
                  className="rise-in mt-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3.5 py-1.5 text-xs font-medium text-accent"
                  style={{ animationDelay: "320ms" }}
                >
                  <span className="scan-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  AI-powered Business Finder — smarter search, instant matches
                </div>

                <div className="rise-in mt-6" style={{ animationDelay: "380ms" }}>
                  <SearchPill categories={categories} city={city} onCityChange={setCity} />
                </div>

                {categories.length > 0 && (
                  <div
                    className="rise-in mt-4 flex flex-wrap items-center gap-2"
                    style={{ animationDelay: "440ms" }}
                  >
                    <span className="text-xs text-muted-foreground">Popular:</span>
                    {categories.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        to="/browse"
                        search={{ q: c.name }}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo collage + floating cards — desktop only */}
              <div className="relative hidden h-[420px] lg:block">
                <div
                  className="spin-slow absolute -right-12 -top-12 h-64 w-64 rounded-full border border-accent/15"
                  aria-hidden="true"
                />
                <div className="ken-burns absolute right-0 top-0 h-[340px] w-[68%] overflow-hidden rounded-[2rem] shadow-2xl">
                  <img src={heroImage} alt="Local business owner at work" className="h-full w-full object-cover" />
                </div>
                <div className="absolute bottom-0 left-0 h-[190px] w-[46%] overflow-hidden rounded-3xl border-[6px] border-background shadow-xl">
                  <img
                    src={heroImage}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "75% 25%" }}
                  />
                </div>
                <div
                  className="float-slow surface-card absolute left-2 top-8 w-36 p-4 shadow-lg"
                  style={{ animationDelay: "0.4s" }}
                >
                  <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">Live now</p>
                  <AnimatedStat value={`${cities.length || 0}`} className="mt-1 font-display text-2xl text-foreground" />
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">cities across India</p>
                </div>
                <div
                  className="float-slow surface-card absolute -right-4 bottom-2 w-56 p-5 shadow-xl"
                  style={{ animationDelay: "1.1s" }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-accent">
                    ↗
                  </span>
                  <p className="mt-3 font-display text-lg">List your business</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Get discovered by customers actively looking for what you do.
                  </p>
                  <Link
                    to="/auth"
                    search={{ role: "business" }}
                    className="mt-3 inline-block text-xs font-semibold text-accent"
                  >
                    Join LuvLit →
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div
              className="rise-in mt-8 grid grid-cols-2 gap-6 rounded-2xl border border-border bg-card/70 p-6 sm:grid-cols-4"
              style={{ animationDelay: "500ms" }}
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <AnimatedStat value={s.value} className="font-display text-2xl text-foreground md:text-3xl" />
                  <p className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Floating featured panel — expands the spotlight grid below */}
        <FeaturedSpotlightPanel
          businesses={featured}
          city={city}
          expanded={spotlightOpen}
          onToggle={() => setSpotlightOpen((v) => !v)}
        />

        {/* Scrolling category ribbon */}
        {categories.length > 0 && (
          <section className="mt-8 overflow-hidden border-y border-border bg-secondary/60 py-4">
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
        <section className="mx-auto max-w-6xl px-6 py-16">
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

        {/* Listings — expanded by the floating spotlight panel above */}
        {(featuredList.length > 0 || recent.length > 0) && spotlightOpen && (
          <section className="bg-secondary/40 py-16">
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

        {/* For owners — intro left, perks + growth CTA right */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <Reveal>
              <div className="lg:sticky lg:top-28">
                <p className="eyebrow">For business owners</p>
                <h2 className="mt-3 max-w-sm text-3xl md:text-4xl">
                  Your own website, and the leads to fill it.
                </h2>
              </div>
            </Reveal>

            <div>
              <div className="grid gap-5 sm:grid-cols-2">
                {OWNER_PERKS.map((p, i) => (
                  <Reveal key={p.title} delay={i * 90}>
                    <div className="surface-card h-full p-6 transition-all duration-500 hover:-translate-y-1 hover:border-accent">
                      <h3 className="text-lg">{p.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal>
                <div className="relative mt-5 overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground md:p-10">
                  <div
                    className="spin-slow absolute -bottom-24 -right-16 h-64 w-64 rounded-full border border-primary-foreground/10"
                    aria-hidden="true"
                  />
                  <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
                        Launch offer
                      </p>
                      <h2 className="mt-3 text-2xl text-primary-foreground md:text-3xl">
                        Free listing until 30 November.
                      </h2>
                      <p className="mt-3 max-w-lg text-sm text-primary-foreground/80">
                        Guided setup, appointments, leads and chat included. ₹{PLANS.base.introPrice} for your first
                        month after, then ₹{PLANS.base.price}/month.
                      </p>
                    </div>
                    <Link
                      to="/auth"
                      search={{ role: "business" }}
                      className="shrink-0 rounded-md bg-background px-8 py-3.5 text-sm font-medium text-foreground transition-transform hover:scale-[1.03]"
                    >
                      List your business
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <p className="eyebrow">How LuvLit works</p>
            <h2 className="mt-3 max-w-2xl text-3xl md:text-4xl">
              From a search to a booking, in three steps.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
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

        <EventsSection city={city || undefined} />

        <FaqSection />
      </main>

      <SiteFooter />
    </div>
  );
}
