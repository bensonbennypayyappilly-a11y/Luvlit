import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { categoryImage } from "@/lib/category-images";

/**
 * Photo-led category card — used by both the homepage's "Shop by category" section (5 cards)
 * and Browse's full category grid (13 cards), so the two stay visually identical and any future
 * change only happens once. Sizing is controlled by the parent grid; this component only
 * decides what's inside a cell.
 */
export function CategoryCard({
  category,
  city,
  delay = 0,
}: {
  category: { id: string; name: string };
  city?: string;
  delay?: number;
}) {
  const src = categoryImage(category.name);
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A server-rendered <img> can finish failing to load before React hydrates and attaches
  // onError, so the error event fires with nobody listening — the classic SSR image-error gap.
  // Checking complete+naturalWidth once mounted catches that case; onError still covers a
  // failure that happens later (e.g. a flaky network request after hydration).
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, []);

  const showImage = !!src && !broken;

  return (
    <Link
      to="/browse/$category"
      params={{ category: category.name }}
      search={city ? { city } : undefined}
      aria-label={`Browse ${category.name}`}
      style={{ transitionDelay: `${delay}ms` }}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-secondary shadow-sm outline-none transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_oklch(0.221_0.006_56/0.4)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={`${category.name} — LuvLit category`}
          loading="lazy"
          onError={() => setBroken(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07] ${showImage ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {!showImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary">
          <span className="text-3xl font-medium text-primary-foreground/80">
            {category.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Scrim anchored top-left, sized to the text rather than washing the whole image. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-foreground/65 via-foreground/20 to-transparent transition-opacity duration-500 group-hover:from-foreground/75"
      />

      <div className="absolute left-3.5 top-3.5 right-3.5 flex items-start gap-1.5">
        <h3 className="min-w-0 flex-1 text-[0.95rem] font-medium leading-tight text-background drop-shadow-sm">
          {category.name}
        </h3>
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center text-background transition-transform duration-300 ease-out group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}
