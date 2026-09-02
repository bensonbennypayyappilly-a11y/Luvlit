import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { EcoBadge } from "@/components/eco-badge";

export type BusinessCardData = {
  id: string;
  name: string;
  description: string | null;
  categories: string[] | null;
  is_eco_friendly: boolean | null;
  thumbnail_url?: string | null;
  logo_url?: string | null;
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
  const cities = Array.from(
    new Set((business.locations ?? []).map((l) => l.city).filter((c): c is string => !!c)),
  );
  const city = cities[0];
  const moreCities = cities.length - 1;
  // A broken/invalid thumbnail URL falls through to the logo, then initials — the card must
  // never show a broken-image icon.
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const hasThumbnail = !!business.thumbnail_url && !thumbnailFailed;
  const hasLogo = !!business.logo_url;

  return (
    <Link
      to="/business/$id"
      params={{ id: business.id }}
      className="surface-card group flex flex-col overflow-hidden rounded-3xl transition-all duration-500 hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_50px_-24px_oklch(0.221_0.006_56/0.45)] active:scale-[0.98] active:duration-150"
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-secondary">
        {hasThumbnail ? (
          <img
            src={business.thumbnail_url!}
            alt={business.name}
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
        ) : hasLogo ? (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <img
              src={business.logo_url!}
              alt={business.name}
              loading="lazy"
              className="max-h-[60%] max-w-[60%] object-contain"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-soft">
            <span className="text-4xl font-medium text-primary/70">{initials(business.name)}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/45 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        {business.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-accent-foreground shadow-sm">
            Featured
          </span>
        )}
        {hasThumbnail && hasLogo && (
          <div className="absolute bottom-3 left-3 flex size-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-sm">
            <img src={business.logo_url!} alt="" className="h-full w-full object-contain" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base transition-colors group-hover:text-primary">{business.name}</h3>
        {(city || moreCities > 0) && (
          <div className="mt-1.5 flex items-center gap-2">
            {city && <p className="truncate text-sm text-muted-foreground">{city}</p>}
            {moreCities > 0 && (
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground">
                +{moreCities} more {moreCities === 1 ? "city" : "cities"}
              </span>
            )}
          </div>
        )}
        {business.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{business.description}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {(business.categories ?? []).slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-full border border-border px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground transition-colors group-hover:border-accent/60"
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
