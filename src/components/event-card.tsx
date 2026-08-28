import { Link } from "@tanstack/react-router";
import { isStoragePath, useMediaUrl } from "@/components/media-uploader";

export type EventCardData = {
  id: string;
  title: string;
  city: string | null;
  category: string | null;
  start_date: string;
  end_date: string | null;
  image_urls?: string[] | null;
  is_featured?: boolean;
  featured_until?: string | null;
};

function isCurrentlyFeatured(e: EventCardData) {
  return !!e.is_featured && !!e.featured_until && new Date(e.featured_until) > new Date();
}

export function EventCard({ event, distanceKm }: { event: EventCardData; distanceKm?: number }) {
  const start = new Date(event.start_date);
  const day = start.toLocaleDateString("en-IN", { day: "2-digit" });
  const month = start.toLocaleDateString("en-IN", { month: "short" });
  const rawHero = event.image_urls?.[0] ?? null;
  const resolvedHero = useMediaUrl(rawHero, "event-media");
  const hero = rawHero ? (isStoragePath(rawHero) ? resolvedHero : rawHero) : null;
  const featured = isCurrentlyFeatured(event);

  return (
    <Link
      to="/events/$id"
      params={{ id: event.id }}
      className="surface-card group flex aspect-square flex-col overflow-hidden rounded-3xl transition-all duration-500 hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_50px_-24px_oklch(0.221_0.006_56/0.45)]"
    >
      <div className="relative h-[55%] w-full shrink-0 overflow-hidden bg-secondary">
        {hero ? (
          <img
            src={hero}
            alt={event.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-soft">
            <span className="text-4xl font-medium text-primary/70">{month}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/45 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        {featured && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-accent-foreground shadow-sm">
            Featured
          </span>
        )}
        <div className="absolute bottom-3 left-3 flex flex-col items-center justify-center rounded-xl border border-border bg-card px-3 py-1.5 leading-none shadow-sm">
          <span className="text-lg font-medium">{day}</span>
          <span className="text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground">{month}</span>
        </div>
      </div>

      <div className="flex h-[45%] flex-col p-4">
        <h3 className="truncate text-base transition-colors group-hover:text-primary">{event.title}</h3>
        {event.city && <p className="mt-1.5 truncate text-sm text-muted-foreground">{event.city}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {event.category && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground transition-colors group-hover:border-accent/60">
              {event.category}
            </span>
          )}
          {typeof distanceKm === "number" && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.6875rem] text-muted-foreground">
              {distanceKm.toFixed(1)} km away
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
