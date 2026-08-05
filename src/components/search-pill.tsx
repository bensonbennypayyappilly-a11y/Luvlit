import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCities } from "@/hooks/use-cities";
import type { CategoryRow } from "@/lib/public.types";

/**
 * One large full-width search pill: city, free-text and a filter dropdown
 * (category, city, "open now", and a disabled price-range placeholder).
 * Submits to /browse with the params that route already accepts.
 */
export function SearchPill({
  categories = [],
  city: controlledCity,
  onCityChange,
}: {
  categories?: CategoryRow[];
  city?: string;
  onCityChange?: (city: string) => void;
}) {
  const cities = useCities();
  const navigate = useNavigate();
  const [internalCity, setInternalCity] = useState(controlledCity ?? "");
  const city = controlledCity ?? internalCity;
  const setCity = (value: string) => {
    setInternalCity(value);
    onCityChange?.(value);
  };
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const submit = () => {
    void navigate({
      to: "/browse",
      search: {
        city: city || undefined,
        q: [q, category].filter(Boolean).join(" ").trim() || undefined,
      },
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative w-full"
    >
      <div className="search-pill flex w-full flex-col gap-2 p-2 sm:rounded-3xl md:flex-row md:items-center md:gap-0 md:rounded-full md:p-2 md:h-16">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Select your city"
          className="min-w-0 rounded-full bg-transparent px-5 py-3 text-sm text-foreground focus:outline-none md:h-full md:w-48 md:border-r md:border-border"
        >
          <option value="">All of India</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search “block print saree”, “bakery”, “wedding photographer”…"
          aria-label="Search"
          className="min-w-0 flex-1 rounded-full bg-transparent px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="flex items-center gap-2 px-1 md:pr-1">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-4 py-2.5 text-xs uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            Filters {category || openNow ? "•" : ""}
          </button>
          <button
            type="submit"
            className="whitespace-nowrap rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-all hover:scale-[1.02] hover:opacity-95 active:scale-100"
          >
            Search
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="surface-card absolute left-0 right-0 top-full z-20 mt-3 grid gap-5 p-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Category</p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">Any category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">City</p>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">All of India</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-between">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => setOpenNow(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Open now
            </label>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Price range
              </p>
              <select
                disabled
                className="mt-2 w-full cursor-not-allowed rounded-md border border-border bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground"
              >
                <option>Coming soon</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-3 flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setCategory("");
                setOpenNow(false);
                setFiltersOpen(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltersOpen(false);
                submit();
              }}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
