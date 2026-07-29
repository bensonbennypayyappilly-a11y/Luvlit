import { Link } from "@tanstack/react-router";
import { EcoBadge } from "@/components/eco-badge";

export type BusinessCardData = {
  id: string;
  name: string;
  description: string | null;
  categories: string[] | null;
  is_eco_friendly: boolean | null;
  locations?: { city: string | null }[] | null;
  featured?: boolean;
};

export function BusinessCard({ business }: { business: BusinessCardData }) {
  const city = business.locations?.[0]?.city;
  return (
    <Link
      to="/business/$id"
      params={{ id: business.id }}
      className="surface-card group flex flex-col p-7 transition-colors hover:border-accent"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl">{business.name}</h3>
        {business.featured && <span className="eyebrow shrink-0 pt-1">Featured</span>}
      </div>
      {city && <p className="mt-2 text-sm text-muted-foreground">{city}</p>}
      {business.description && (
        <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{business.description}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(business.categories ?? []).slice(0, 2).map((c) => (
          <span
            key={c}
            className="rounded-full border border-border px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            {c}
          </span>
        ))}
        {business.is_eco_friendly && <EcoBadge />}
      </div>
    </Link>
  );
}
