import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { categoryImage } from "@/lib/category-images";

/**
 * Editorial category card — used by both the homepage's "Shop by category" section (5 cards)
 * and Browse's full category grid (13 cards), so the two stay visually identical and any future
 * change only happens once. Sizing is controlled by the parent grid; this component only
 * decides what's inside a cell, so the same card holds up at Browse's narrow 7-up width and
 * the homepage's wider 5-up one.
 *
 * Composition: full-bleed photograph, uppercase title at the top, circular arrow at the
 * bottom-left. The arrow sits bottom-left rather than bottom-right deliberately — every
 * category photograph is composed with its subject on the right and empty backdrop on the
 * left, so both the title and the arrow land on quiet parts of the image.
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
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-primary shadow-sm outline-none transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-[0_14px_32px_-16px_oklch(0.221_0.006_56/0.5)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={`${category.name} — LuvLit category`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] ${
            showImage ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {!showImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary">
          <span className="text-2xl font-medium text-primary-foreground/70">
            {category.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Two soft scrims rather than one flat wash, so the middle of the photograph — where the
          subject sits — stays fully visible while the type at the top and the arrow at the
          bottom keep their contrast on any image. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-black/55 to-transparent transition-opacity duration-200 group-hover:from-black/65"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-black/40 to-transparent transition-opacity duration-200 group-hover:from-black/50"
      />

      {/* Title — uppercased in CSS, so the canonical category name from the database stays the
          single source of truth and nothing is duplicated per card. */}
      <h3 className="absolute inset-x-0 top-0 break-words px-2.5 pt-2.5 text-[9px] font-medium uppercase leading-[1.35] tracking-[0.1em] text-white/95 drop-shadow-sm sm:px-3 sm:pt-3 sm:text-[10px] sm:tracking-[0.12em] lg:text-[11px] lg:tracking-[0.14em]">
        {category.name}
      </h3>

      <span
        aria-hidden="true"
        className="absolute bottom-2.5 left-2.5 flex size-6 items-center justify-center rounded-full border border-white/50 text-[10px] text-white/90 backdrop-blur-[2px] transition-[background-color,border-color,transform] duration-200 ease-out group-hover:border-white/90 group-hover:bg-white/15 sm:bottom-3 sm:left-3 sm:size-7 sm:text-xs lg:size-8"
      >
        <span className="transition-transform duration-200 ease-out group-hover:translate-x-[3px]">→</span>
      </span>
    </Link>
  );
}
