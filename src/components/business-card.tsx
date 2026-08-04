import { Link } from "@tanstack/react-router";
import { EcoBadge } from "@/components/eco-badge";

export type BusinessCardData = {
  id: string;
  name: string;
  description: string | null;
  categories: string[] | null;
  is_eco_friendly: boolean | null;
  hero_image_url?: string | null;
  locations?: { city: string | null }[] | null;
  featured?: boolean;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function BusinessCard({ business }: { business: BusinessCardData }) {
  const city = business.locations?.[0]?.city;
  return (
    <Link
      to="/business/$id"
      params={{ id: business.id }}
      className="surface-card group flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_50px_-24px_oklch(0.221_0.006_56/0.45)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
        {business.hero_image_url ? (
          <img
            src={business.hero_image_url}
            alt={business.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-soft">
            <span className="font-serif text-4xl text-primary/70">{initials(business.name)}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/45 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        {business.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-accent-foreground shadow-sm">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl transition-colors group-hover:text-primary">{business.name}</h3>
        {city && <p className="mt-1.5 text-sm text-muted-foreground">{city}</p>}
        {business.description && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{business.description}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-1">
          {(business.categories ?? []).slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-full border border-border px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground transition-colors group-hover:border-accent/60"
            >
              {c}
            </span>
          ))}
          {business.is_eco_friendly && <EcoBadge />}
        </div>
      </div>
    </Link>
  );
}
