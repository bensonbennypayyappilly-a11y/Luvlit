import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useCities } from "@/hooks/use-cities";
import type { CategoryRow } from "@/lib/public.types";

export type BrowseFilterValue = {
  category?: string;
  city?: string;
  q?: string;
  openNow?: boolean;
};

/**
 * Working search/filter bar for /browse and /browse/$category — separate component from the
 * homepage's search-pill.tsx, which stays untouched. Unlike search-pill's "Open now" (kept as
 * a permanently non-functional, frozen control since it's homepage-only), this one's "Open
 * now" actually filters results.
 */
export function BrowseFilterBar({
  categories,
  value,
  onChange,
}: {
  /** Omit when the category is fixed by the route (browse/$category) — no picker is shown then. */
  categories?: CategoryRow[];
  value: BrowseFilterValue;
  onChange: (patch: Partial<BrowseFilterValue>) => void;
}) {
  const cities = useCities();

  // The text input needs its own local state, debounced before it reaches onChange (which
  // triggers a real route navigation/loader re-run): applying every keystroke immediately
  // caused overlapping navigations to race and clobber each other, visibly losing what was
  // typed. Category/city/open-now are single discrete clicks, so they apply immediately.
  const [localQuery, setLocalQuery] = useState(value.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => setLocalQuery(value.q ?? ""), [value.q]);

  function onQueryInput(next: string) {
    setLocalQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ q: next || undefined }), 450);
  }

  return (
    <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex min-w-0 flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <input
          value={localQuery}
          onChange={(e) => onQueryInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (debounceRef.current) clearTimeout(debounceRef.current);
            onChange({ q: localQuery || undefined });
          }}
          placeholder="Search businesses…"
          aria-label="Search businesses"
          className="min-h-11 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      {categories && (
        <select
          value={value.category ?? ""}
          onChange={(e) => onChange({ category: e.target.value || undefined })}
          aria-label="Category"
          className="min-h-11 rounded-md border border-border bg-card px-3 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">Any category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={value.city ?? ""}
        onChange={(e) => onChange({ city: e.target.value || undefined })}
        aria-label="City"
        className="min-h-11 rounded-md border border-border bg-card px-3 text-sm focus:border-accent focus:outline-none"
      >
        <option value="">All of India</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-3 text-sm text-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <input
          type="checkbox"
          checked={!!value.openNow}
          onChange={(e) => onChange({ openNow: e.target.checked || undefined })}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        Open now
      </label>

      {(value.category || value.city || value.q || value.openNow) && (
        <button
          type="button"
          onClick={() => onChange({ category: undefined, city: undefined, q: undefined, openNow: undefined })}
          className="inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
