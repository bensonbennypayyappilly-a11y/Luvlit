import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/event-card";
import { Reveal } from "@/components/reveal";
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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function EventsIndex() {
  const { events } = Route.useLoaderData() as { events: PublicEvent[] };
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [nearMe, setNearMe] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  function toggleNearMe() {
    if (nearMe) {
      setNearMe(false);
      setLocationMessage(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage("Location access denied — use the city filter instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMe(true);
        setLocationMessage(null);
      },
      () => {
        setLocationMessage("Location access denied — use the city filter instead.");
      },
    );
  }

  const filtered = search.category
    ? events.filter((e) => e.category === search.category)
    : events;

  const sorted = useMemo(() => {
    if (!nearMe || !coords) return filtered;
    const withDistance = filtered.map((e) => {
      const hasCoords = typeof e.latitude === "number" && typeof e.longitude === "number";
      const distance = hasCoords
        ? haversineKm(coords.lat, coords.lng, e.latitude as number, e.longitude as number)
        : null;
      return { event: e, distance };
    });
    withDistance.sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
    return withDistance;
  }, [filtered, nearMe, coords]);

  const rows = nearMe && coords
    ? (sorted as { event: PublicEvent; distance: number | null }[])
    : (filtered as PublicEvent[]).map((event) => ({ event, distance: null as number | null }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Flea markets &amp; events</h1>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter events by city"
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
            aria-label="Filter events by category"
            value={search.category ?? ""}
            onChange={(e) => navigate({ search: { ...search, category: e.target.value || undefined } })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleNearMe}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
              nearMe ? "border-accent bg-accent-soft text-accent-foreground" : "border-border"
            }`}
          >
            {nearMe ? "Near me ✓" : "Near me"}
          </button>
        </div>
        {locationMessage && <p className="mt-2 text-xs text-muted-foreground">{locationMessage}</p>}

        <Reveal className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {rows.map(({ event, distance }) => (
            <EventCard key={event.id} event={event} distanceKm={distance ?? undefined} />
          ))}
        </Reveal>
        {filtered.length === 0 && <p className="mt-14 text-muted-foreground">No events listed here yet.</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
