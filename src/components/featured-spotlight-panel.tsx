import type { PublicBusiness } from "@/lib/public.types";

/**
 * Floating panel near the hero surfacing the top featured businesses in the
 * selected city. Reuses getBusinesses' results (already featured-first sorted)
 * — no second query. Clicking it toggles the "In the spotlight" grid below.
 */
export function FeaturedSpotlightPanel({
  businesses,
  city,
  expanded,
  onToggle,
}: {
  businesses: PublicBusiness[];
  city: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const top = businesses.filter((b) => b.featured).slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="relative z-10 mx-auto -mt-14 max-w-4xl px-6 md:-mt-16">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="surface-card group flex w-full flex-col gap-5 p-6 text-left shadow-[0_24px_60px_-28px_oklch(0_0_0/0.35)] transition-all hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-8"
      >
        <div className="shrink-0">
          <p className="eyebrow">Featured {city ? `in ${city}` : ""}</p>
          <h3 className="mt-1 text-lg">In the spotlight</h3>
        </div>

        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          {top.map((b) => (
            <div key={b.id} className="flex min-w-0 items-center gap-2.5">
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
                {b.logo_url && (
                  <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="truncate text-sm text-foreground">{b.name}</span>
            </div>
          ))}
        </div>

        <span
          aria-hidden
          className={`ml-auto shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
    </div>
  );
}
