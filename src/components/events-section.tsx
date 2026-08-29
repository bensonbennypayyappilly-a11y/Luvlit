import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/lib/public.functions";
import { EventCard } from "@/components/event-card";
import { CardGridSkeleton } from "@/components/ui/skeleton-shapes";

export function EventsSection({ city }: { city?: string }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events-section", city ?? null],
    queryFn: () => getEvents({ data: { city, limit: 6 } }),
  });

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Flea markets &amp; events</h2>
        </div>
        <div className="mt-6">
          <CardGridSkeleton count={3} />
        </div>
      </section>
    );
  }
  if (!events || events.length === 0) {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Flea markets &amp; events</h2>
          <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">
            See all →
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          No events on right now — check back soon.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Flea markets &amp; events</h2>
        <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">
          See all →
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}
