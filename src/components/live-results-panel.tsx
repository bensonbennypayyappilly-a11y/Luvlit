import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { BusinessCard } from "@/components/business-card";
import type { PublicBusiness } from "@/lib/public.types";

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
}: {
  query: string;
  businesses: PublicBusiness[];
}) {
  const results = useMemo(() => matchBusinesses(businesses, query), [businesses, query]);
  const isSearching = query.trim().length > 0;

  if (!isSearching) return null;

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
