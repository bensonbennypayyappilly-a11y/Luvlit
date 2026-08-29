import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { BusinessCard } from "@/components/business-card";
import type { CategoryRow, CityRow, PublicBusiness } from "@/lib/public.types";

function buildTrendingChips(categories: CategoryRow[], cities: CityRow[]): string[] {
  if (categories.length === 0 || cities.length === 0) return [];
  const chips: string[] = [];
  const count = Math.min(5, categories.length);
  for (let i = 0; i < count; i++) {
    const city = cities[i % cities.length];
    chips.push(`${categories[i].name} in ${city.name}`);
  }
  return chips;
}

function matchBusinesses(businesses: PublicBusiness[], query: string): PublicBusiness[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return businesses
    .filter((b) => {
      const haystack = [b.name, ...b.categories, ...b.locations.map((l) => l.city)]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    })
    .slice(0, 6);
}

export function LiveResultsPanel({
  query,
  businesses,
  categories,
  cities,
  onChipClick,
}: {
  query: string;
  businesses: PublicBusiness[];
  categories: CategoryRow[];
  cities: CityRow[];
  onChipClick: (chip: string) => void;
}) {
  const chips = useMemo(() => buildTrendingChips(categories, cities), [categories, cities]);
  const results = useMemo(() => matchBusinesses(businesses, query), [businesses, query]);
  const isSearching = query.trim().length > 0;

  if (!isSearching) {
    if (chips.length === 0) return null;
    return (
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trending</span>
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChipClick(chip)}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {chip}
          </button>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No matches yet for "{query}" among businesses already listed — hit Search to check the full
        directory, or{" "}
        <Link to="/post-requirement" className="text-accent underline underline-offset-4">
          post it as a requirement
        </Link>{" "}
        and get matching businesses notified directly.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {results.length} match{results.length === 1 ? "" : "es"} for "{query}"
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {results.map((b) => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
    </div>
  );
}
