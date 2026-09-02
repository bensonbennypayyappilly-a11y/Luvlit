import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BrowseResultCard } from "@/components/browse-result-card";
import { BrowseFilterBar, type BrowseFilterValue } from "@/components/browse-filter-bar";
import { PaginationBar } from "@/components/pagination-bar";
import { Reveal } from "@/components/reveal";
import { getBrowseResults } from "@/lib/public.functions";
import { useAccount } from "@/hooks/use-session";

const PAGE_SIZE = 24;

type Search = Omit<BrowseFilterValue, "category"> & { page?: number };

export const Route = createFileRoute("/browse/$category")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    city: typeof search.city === "string" ? search.city : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    openNow: search.openNow === true || search.openNow === "true" ? true : undefined,
    page: typeof search.page === "number" ? search.page : Number(search.page) || undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) =>
    getBrowseResults({
      data: { category: params.category, city: deps.city, q: deps.q, openNow: deps.openNow, page: deps.page ?? 1, pageSize: PAGE_SIZE },
    }),
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
  const results = Route.useLoaderData() as Awaited<ReturnType<typeof getBrowseResults>>;
  const { category } = Route.useParams();
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="eyebrow">Category</p>
        <h1 className="mt-4 text-4xl md:text-5xl">{category}</h1>

        <div className="mt-10">
          <BrowseFilterBar value={search} onChange={updateFilters} />
        </div>

        <Reveal className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {businesses.map((b) => (
            <BrowseResultCard key={b.id} business={b} />
          ))}
        </Reveal>
        {businesses.length === 0 && (
          <p className="mt-14 text-muted-foreground">
            No {category} businesses match these filters yet.
          </p>
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
