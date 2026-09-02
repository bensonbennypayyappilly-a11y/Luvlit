import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BrowseResultCard } from "@/components/browse-result-card";
import { BrowseFilterBar, type BrowseFilterValue } from "@/components/browse-filter-bar";
import { PaginationBar } from "@/components/pagination-bar";
import { Reveal } from "@/components/reveal";
import { CategoryCard } from "@/components/category-card";
import { getCategories, getBrowseResults } from "@/lib/public.functions";
import type { CategoryRow } from "@/lib/public.types";
import { useAccount } from "@/hooks/use-session";

const PAGE_SIZE = 24;

type Search = BrowseFilterValue & { page?: number };

export const Route = createFileRoute("/browse/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    category: typeof search.category === "string" ? search.category : undefined,
    city: typeof search.city === "string" ? search.city : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    openNow: search.openNow === true || search.openNow === "true" ? true : undefined,
    page: typeof search.page === "number" ? search.page : Number(search.page) || undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    categories: await getCategories(),
    results: await getBrowseResults({
      data: { category: deps.category, city: deps.city, q: deps.q, openNow: deps.openNow, page: deps.page ?? 1, pageSize: PAGE_SIZE },
    }),
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
  const { categories, results } = Route.useLoaderData() as {
    categories: CategoryRow[];
    results: Awaited<ReturnType<typeof getBrowseResults>>;
  };
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  // A signed-in business must never see its own listing while discovering other businesses.
  const { businessId } = useAccount();
  const businesses = businessId ? results.businesses.filter((b) => b.id !== businessId) : results.businesses;

  function updateFilters(patch: Partial<Search>) {
    navigate({ search: { ...search, ...patch, page: "page" in patch ? patch.page : undefined } });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      {/* max-w-7xl, not 6xl: the category grid is 7 cards wide on desktop, and at 1152px each
          card was cramped to ~147px. This gives the grid real width to work with. */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-20">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Browse LuvLit</h1>

        <Reveal className="mt-10">
          <p className="text-sm font-medium text-muted-foreground">Browse by category</p>
          {/* All 13 categories, as 7 + 6 on desktop. `wide` is a project breakpoint at 900px
              (see styles.css): the 7-up layout needs to engage below Tailwind's lg (1024px),
              because a window narrower than 1024 — common with Windows display scaling, or
              simply an un-maximised browser — was otherwise falling back to 4 columns on what
              is really a desktop. Deliberately no 5- or 6-column band: 3 -> 4 -> 7. */}
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 wide:grid-cols-7 wide:gap-3.5">
            {categories.map((category, i) => (
              <CategoryCard key={category.id} category={category} city={search.city} delay={i * 40} />
            ))}
          </div>
        </Reveal>

        <div className="mt-10">
          <BrowseFilterBar categories={categories} value={search} onChange={updateFilters} />
        </div>

        <Reveal className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {businesses.map((b) => (
            <BrowseResultCard key={b.id} business={b} />
          ))}
        </Reveal>
        {businesses.length === 0 && (
          <p className="mt-14 text-muted-foreground">No businesses match these filters yet.</p>
        )}

        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          total={results.total}
          onPageChange={(next) => updateFilters({ page: next })}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
