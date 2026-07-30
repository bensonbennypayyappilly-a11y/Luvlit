import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BusinessCard } from "@/components/business-card";
import { getCategories, getBusinesses } from "@/lib/public.functions";
import { CITIES } from "@/lib/constants";
import type { CategoryRow, PublicBusiness } from "@/lib/public.types";

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
    ],
  }),
  loader: async () => ({
    categories: await getCategories(),
    featured: await getBusinesses({ data: {} }),
  }),
  component: Index,
});

function Index() {
  const { categories, featured } = Route.useLoaderData() as { categories: CategoryRow[]; featured: PublicBusiness[] };
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const featuredList = featured.filter((b) => b.featured).slice(0, 6);
  const recent = featured.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 md:pt-32">
          <p className="eyebrow">Pan-India marketplace</p>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[1.08] md:text-7xl">
            The small businesses worth
            <span className="text-primary"> knowing</span>, near you.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            Discover makers, studios, salons and brands by category and city. Book an appointment,
            request a quote, or find the right influencer for your brand.
          </p>

          <form
            className="mt-12 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = `/browse?${new URLSearchParams({ city, q })}`;
            }}
          >
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-md border border-border bg-card px-4 py-3.5 text-sm sm:w-52"
              aria-label="Select your city"
            >
              <option value="">All of India</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search businesses, brands, makers…"
              className="flex-1 rounded-md border border-border bg-card px-4 py-3.5 text-sm"
              aria-label="Search"
            />
            <button className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Search
            </button>
          </form>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="hairline flex items-end justify-between gap-6 pt-14">
            <div>
              <p className="eyebrow">Browse</p>
              <h2 className="mt-3 text-3xl md:text-4xl">Categories</h2>
            </div>
            <Link
              to="/browse"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              View all →
            </Link>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to="/browse/$category"
                params={{ category: category.name }}
                className="surface-card group p-7 transition-colors hover:border-accent"
              >
                <h3 className="text-xl">{category.name}</h3>
                <p className="mt-3 text-sm text-muted-foreground">Explore across India</p>
              </Link>
            ))}
          </div>
        </section>

        {(featuredList.length > 0 || recent.length > 0) && (
          <section className="mx-auto max-w-6xl px-6 py-16">
            <div className="hairline pt-14">
              <p className="eyebrow">{featuredList.length ? "Featured" : "Recently joined"}</p>
              <h2 className="mt-3 text-3xl md:text-4xl">
                {featuredList.length ? "In the spotlight" : "New on LuvLit"}
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(featuredList.length ? featuredList : recent).map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="surface-card flex flex-col items-start gap-6 p-12 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">For businesses</p>
              <h2 className="mt-3 text-3xl">Your own page, live in minutes.</h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Free listing until 30 November. Guided setup, appointments, leads and chat included.
              </p>
            </div>
            <Link
              to="/auth"
              search={{ role: "business" }}
              className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              List your business
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
