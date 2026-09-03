import { useState } from "react";
import type { SitePage } from "@/lib/website-pages";
import type { SitePageRecord } from "@/lib/public.types";

type EditingPage = SitePage & { visible: boolean };

const RESERVED_LABEL: Record<string, string> = {
  home: "Home",
};

/**
 * Reorder, rename and hide the pages a business's site actually has. Pages themselves are still
 * content-gated (a Products page only exists once there's a product) — this only controls order,
 * nav label and visibility on top of that, exactly like Page Layout does for sections. Every
 * change writes the *complete* page list back as explicit overrides, so partial edits never leave
 * ambiguity about which pages the owner has and hasn't touched.
 */
export function PagesEditor({ pages, onChange }: { pages: EditingPage[]; onChange: (pages: SitePageRecord[]) => void }) {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  function toRecords(list: EditingPage[]): SitePageRecord[] {
    return list.map((p) => ({ id: p.id, slug: p.id, label: p.label, type: p.id as SitePageRecord["type"], visible: p.visible, showInNav: p.visible }));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(toRecords(next));
  }

  function toggleVisible(id: string) {
    onChange(toRecords(pages.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p))));
  }

  function rename(id: string, label: string) {
    onChange(toRecords(pages.map((p) => (p.id === id ? { ...p, label: label || p.label } : p))));
  }

  return (
    <div className="space-y-1.5">
      {pages.map((page, i) => {
        const locked = page.id === "home";
        const renaming = renamingId === page.id;
        return (
          <div
            key={page.id}
            className={`flex items-center gap-2 rounded-[10px] border px-2 py-1.5 transition-colors duration-150 ${
              page.visible ? "border-[#EEEEEE] bg-white" : "border-[#EEEEEE] bg-secondary/30"
            }`}
          >
            <div className="flex shrink-0 flex-col text-muted-foreground/60">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="Move up"
                className="flex h-5 w-6 items-center justify-center rounded-[6px] transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:opacity-25"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                disabled={i === pages.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Move down"
                className="flex h-5 w-6 items-center justify-center rounded-[6px] transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:opacity-25"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            <div className="min-w-0 flex-1 py-1">
              {renaming ? (
                <input
                  autoFocus
                  defaultValue={page.label}
                  onBlur={(e) => {
                    rename(page.id, e.target.value.trim());
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="w-full rounded-md border border-accent/40 bg-white px-2 py-1 text-sm outline-none focus:border-accent"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => !locked && setRenamingId(page.id)}
                  disabled={locked}
                  className={`truncate text-sm font-medium ${locked ? "cursor-default text-foreground/80" : "text-foreground hover:underline"}`}
                  title={locked ? undefined : "Rename"}
                >
                  {RESERVED_LABEL[page.id] ?? page.label}
                </button>
              )}
              <p className="text-xs text-muted-foreground">{page.path}</p>
            </div>

            <button
              type="button"
              onClick={() => !locked && toggleVisible(page.id)}
              disabled={locked}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                page.visible ? "bg-accent-soft text-accent" : "bg-secondary text-muted-foreground"
              } ${locked ? "opacity-50" : "hover:opacity-80"}`}
            >
              {page.visible ? "Shown" : "Hidden"}
            </button>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-muted-foreground">
        Pages appear automatically once they have content — add products, services or photos and their pages will show up here to arrange.
      </p>
    </div>
  );
}
