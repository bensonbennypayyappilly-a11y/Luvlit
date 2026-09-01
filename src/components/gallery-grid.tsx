import { useEffect, useState } from "react";
import type { GalleryDefault } from "@/lib/website-templates";

export type GalleryItem = {
  id: string;
  image_url: string;
  name: string;
  price?: number | null;
  description?: string | null;
};

function useLightbox() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  useEffect(() => {
    if (openIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex]);
  return { openIndex, setOpenIndex };
}

function Lightbox({ items, index, onClose, accent }: { items: GalleryItem[]; index: number; onClose: () => void; accent: string }) {
  const item = items[index];
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6" onClick={onClose}>
      <div className="max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <img src={item.image_url} alt={item.name} className="max-h-[75vh] w-full rounded-lg object-contain" />
        <div className="mt-4 text-center text-white">
          <p className="text-lg" style={{ color: accent }}>
            {item.name}
          </p>
          {item.description && <p className="mt-1 text-sm text-white/70">{item.description}</p>}
          {item.price != null && <p className="mt-1 text-sm text-white/90">₹{item.price}</p>}
        </div>
        <button type="button" onClick={onClose} className="mx-auto mt-6 block rounded-md border border-white/40 px-5 py-2 text-sm text-white">
          Close
        </button>
      </div>
    </div>
  );
}

function Tile({
  item,
  onClick,
  className = "",
  aspect = "aspect-square",
  rounded = "rounded-lg",
}: {
  item: GalleryItem;
  onClick: () => void;
  className?: string;
  aspect?: string;
  rounded?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block w-full overflow-hidden border border-border ${rounded} ${aspect} ${className}`}
    >
      <img
        src={item.image_url}
        alt={item.name}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/0 to-black/0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="text-sm font-medium text-white">{item.name}</p>
        {item.price != null && <p className="text-xs text-white/80">₹{item.price}</p>}
      </div>
    </button>
  );
}

/**
 * One reusable gallery component covering every layout a template needs — the template picks
 * `layout`, the caller never hand-builds a bespoke grid per combination. `featured` (one large
 * lead image + a supporting row) suits an editorial/gallery-led template; `masonry` suits an
 * image-rich, less symmetric one; `grid-3`/`grid-2` are evenly-spaced catalogue/portfolio grids.
 */
export function GalleryGrid({
  items,
  accent,
  layout = "grid-3",
  rounded = "rounded-lg",
}: {
  items: GalleryItem[];
  accent: string;
  layout?: GalleryDefault;
  rounded?: string;
}) {
  const { openIndex, setOpenIndex } = useLightbox();
  if (!items.length) return null;

  if (layout === "featured") {
    const [lead, ...rest] = items;
    return (
      <>
        <div className="grid gap-4">
          <Tile item={lead} onClick={() => setOpenIndex(0)} aspect="aspect-[16/9]" rounded={rounded} />
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {rest.slice(0, 8).map((item, i) => (
                <Tile key={item.id} item={item} onClick={() => setOpenIndex(i + 1)} rounded={rounded} />
              ))}
            </div>
          )}
        </div>
        {openIndex != null && <Lightbox items={items} index={openIndex} onClose={() => setOpenIndex(null)} accent={accent} />}
      </>
    );
  }

  if (layout === "masonry") {
    return (
      <>
        <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
          {items.map((item, i) => (
            <div key={item.id} className="break-inside-avoid">
              <Tile
                item={item}
                onClick={() => setOpenIndex(i)}
                aspect={i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/5]"}
                rounded={rounded}
              />
            </div>
          ))}
        </div>
        {openIndex != null && <Lightbox items={items} index={openIndex} onClose={() => setOpenIndex(null)} accent={accent} />}
      </>
    );
  }

  if (layout === "grid-2") {
    return (
      <>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {items.map((item, i) => (
            <Tile key={item.id} item={item} onClick={() => setOpenIndex(i)} aspect="aspect-[4/5]" rounded={rounded} />
          ))}
        </div>
        {openIndex != null && <Lightbox items={items} index={openIndex} onClose={() => setOpenIndex(null)} accent={accent} />}
      </>
    );
  }

  // grid-3 — even catalogue-style grid, the default.
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item, i) => (
          <Tile key={item.id} item={item} onClick={() => setOpenIndex(i)} rounded={rounded} />
        ))}
      </div>
      {openIndex != null && <Lightbox items={items} index={openIndex} onClose={() => setOpenIndex(null)} accent={accent} />}
    </>
  );
}
