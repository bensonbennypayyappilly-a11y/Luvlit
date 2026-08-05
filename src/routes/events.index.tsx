import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/event-card";
import { getEvents } from "@/lib/public.functions";
import { CITIES, EVENT_CATEGORIES } from "@/lib/constants";
import type { PublicEvent } from "@/lib/public.types";

type Search = { city?: string; category?: string };

export const Route = createFileRoute("/events/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    city: typeof search.city === "string" ? search.city : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    events: await getEvents({ data: { city: deps.city, limit: 60 } }),
  }),
  head: () => ({
    meta: [
      { title: "Flea markets & events near you — LuvLit" },
      {
        name: "description",
        content: "Discover flea markets, pop-up shops, craft fairs and local events across India on LuvLit.",
      },
      { property: "og:title", content: "Flea markets & events near you — LuvLit" },
      { property: "og:description", content: "Browse upcoming flea markets and events across India." },
    ],
  }),
  component: EventsIndex,
});

function EventsIndex() {
  const { events } = Route.useLoaderData() as { events: PublicEvent[] };
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const filtered = search.category
    ? events.filter((e) => e.category === search.category)
    : events;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Flea markets &amp; events</h1>

        <div className="mt-8 flex flex-wrap gap-3">
          <select
            value={search.city ?? ""}
            onChange={(e) => navigate({ search: { ...search, city: e.target.value || undefined } })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={search.category ?? ""}
            onChange={(e) => navigate({ search: { ...search, category: e.target.value || undefined } })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
        {filtered.length === 0 && <p className="mt-14 text-muted-foreground">No events listed here yet.</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
