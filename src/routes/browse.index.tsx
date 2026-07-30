import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BusinessCard } from "@/components/business-card";
import { getCategories, getBusinesses } from "@/lib/public.functions";
import type { CategoryRow, PublicBusiness } from "@/lib/public.types";

type Search = { city?: string; q?: string };

export const Route = createFileRoute("/browse/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    city: typeof search.city === "string" ? search.city : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    categories: await getCategories(),
    businesses: await getBusinesses({ data: { city: deps.city, q: deps.q } }),
  }),
  head: () => ({
    meta: [
      { title: "Browse businesses by category & city — LuvLit" },
      {
        name: "description",
        content:
          "Browse every category on LuvLit — salons, home décor, handmade, gifts, photography and more — filtered by your city.",
      },
      { property: "og:title", content: "Browse businesses by category & city — LuvLit" },
      {
        property: "og:description",
        content: "Find small businesses and brands across India, filtered by category and city.",
      },
    ],
  }),
  component: BrowseIndex,
});

function BrowseIndex() {
  const { categories, businesses } = Route.useLoaderData() as { categories: CategoryRow[]; businesses: PublicBusiness[] };
  const search = Route.useSearch();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Browse LuvLit</h1>
        {(search.city || search.q) && (
          <p className="mt-4 text-muted-foreground">
            {search.q ? `“${search.q}”` : "All businesses"}
            {search.city ? ` in ${search.city}` : " across India"}
          </p>
        )}

        <div className="mt-12 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/browse/$category"
              params={{ category: c.name }}
              className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-accent"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
        {businesses.length === 0 && (
          <p className="mt-14 text-muted-foreground">No businesses listed here yet.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
