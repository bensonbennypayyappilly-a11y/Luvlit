import { useEffect, useState } from "react";

export type GalleryItem = {
  id: string;
  image_url: string;
  name: string;
  price?: number | null;
  description?: string | null;
};

/** Responsive asymmetric image grid with hover zoom and a click-to-open lightbox. */
export function GalleryGrid({ items, accent }: { items: GalleryItem[]; accent: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex]);

  return (
    <>
      <div className="grid auto-rows-[220px] grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item, i) => {
          const spanClass =
            i % 5 === 0 ? "col-span-2 row-span-2" : i % 7 === 0 ? "col-span-2" : "col-span-1";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className={`group relative overflow-hidden rounded-lg border border-border ${spanClass}`}
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
        })}
      </div>

      {openIndex != null && items[openIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setOpenIndex(null)}
        >
          <div className="max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={items[openIndex].image_url}
              alt={items[openIndex].name}
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
            <div className="mt-4 text-center text-white">
              <p className="text-lg" style={{ color: accent }}>
                {items[openIndex].name}
              </p>
              {items[openIndex].description && (
                <p className="mt-1 text-sm text-white/70">{items[openIndex].description}</p>
              )}
              {items[openIndex].price != null && (
                <p className="mt-1 text-sm text-white/90">₹{items[openIndex].price}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              className="mx-auto mt-6 block rounded-md border border-white/40 px-5 py-2 text-sm text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
