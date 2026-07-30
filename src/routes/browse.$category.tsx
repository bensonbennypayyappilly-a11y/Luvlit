import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BusinessCard } from "@/components/business-card";
import { getBusinesses } from "@/lib/public.functions";
import { CITIES } from "@/lib/constants";
import type { PublicBusiness } from "@/lib/public.types";

type Search = { city?: string };

export const Route = createFileRoute("/browse/$category")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    city: typeof search.city === "string" ? search.city : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) =>
    getBusinesses({ data: { category: params.category, city: deps.city } }),
  head: ({ params }) => ({
    meta: [
      { title: `${params.category} businesses across India — LuvLit` },
      {
        name: "description",
        content: `Discover ${params.category} businesses on LuvLit — browse by city, view profiles, book appointments and request quotes.`,
      },
      { property: "og:title", content: `${params.category} on LuvLit` },
      {
        property: "og:description",
        content: `Browse ${params.category} businesses across India by city.`,
      },
    ],
  }),
  component: BrowseCategory,
});

function BrowseCategory() {
  const businesses = Route.useLoaderData() as PublicBusiness[];
  const { category } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [city, setCity] = useState(search.city ?? "");

  const featured = businesses.filter((b) => b.featured);
  const rest = businesses.filter((b) => !b.featured);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="eyebrow">Category</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-4xl md:text-5xl">{category}</h1>
          <select
            value={city}
            onChange={(e) => {
              const next = e.target.value;
              setCity(next);
              navigate({ search: { city: next || undefined } });
            }}
            className="rounded-md border border-border bg-card px-4 py-3 text-sm"
            aria-label="Filter by city"
          >
            <option value="">All of India</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {featured.length > 0 && (
          <section className="mt-14">
            <p className="eyebrow">Featured</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-14">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
          {businesses.length === 0 && (
            <p className="text-muted-foreground">
              No {category} businesses here yet{city ? ` in ${city}` : ""}.
            </p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
