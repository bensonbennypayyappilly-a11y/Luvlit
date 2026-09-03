import { useState } from "react";
import type { EditingPage } from "@/lib/website-pages";
import type { SitePageRecord } from "@/lib/public.types";

const RESERVED_LABEL: Record<string, string> = {
  home: "Home",
};

/** Built-in path segments a custom page's own slug must never collide with — the 6 reserved
 * pages plus the two other reserved subdomain routes (`/post-requirement`, `/browse` aren't
 * subdomain routes, but products/services detail pages are — see `products.$slug`). */
const RESERVED_PAGE_SLUGS = new Set(["about", "products", "services", "gallery", "appointments", "contact", "post-requirement"]);

function slugify(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reorder, rename and hide the pages a business's site actually has, plus add/edit/remove plain
 * custom pages (a heading + text body — the simplest genuinely useful page beyond the 6 built-in
 * ones, e.g. Policies or Our Story). Built-in pages stay content-gated (a Products page only
 * exists once there's a product) — this only controls order, nav label and visibility on top of
 * that. Every change writes the *complete* page list back as explicit overrides, so partial
 * edits never leave ambiguity about which pages the owner has and hasn't touched.
 */
export function PagesEditor({ pages, onChange }: { pages: EditingPage[]; onChange: (pages: SitePageRecord[]) => void }) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  function toRecords(list: EditingPage[]): SitePageRecord[] {
    return list.map((p) => ({
      id: p.id,
      slug: p.slug,
      label: p.label,
      type: p.custom ? "custom" : (p.id as SitePageRecord["type"]),
      visible: p.visible,
      showInNav: p.visible,
      ...(p.custom ? { content: p.content } : {}),
    }));
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

  function updateContent(id: string, content: { heading?: string; body?: string }) {
    onChange(toRecords(pages.map((p) => (p.id === id ? { ...p, content } : p))));
  }

  function remove(id: string) {
    onChange(toRecords(pages.filter((p) => p.id !== id)));
  }

  function addPage() {
    const label = newLabel.trim();
    if (!label) return;
    const base = slugify(label) || "page";
    const existingSlugs = new Set(pages.map((p) => p.slug));
    let slug = base;
    let n = 1;
    while (RESERVED_PAGE_SLUGS.has(slug) || existingSlugs.has(slug)) {
      n += 1;
      slug = `${base}-${n}`;
    }
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const next: EditingPage[] = [
      ...pages,
      { id, label, path: `/${slug}`, visible: true, custom: true, slug, content: { heading: label, body: "" } },
    ];
    onChange(toRecords(next));
    setNewLabel("");
    setAdding(false);
    setEditingContentId(id);
  }

  return (
    <div className="space-y-1.5">
      {pages.map((page, i) => {
        const locked = page.id === "home";
        const renaming = renamingId === page.id;
        const editingContent = editingContentId === page.id;
        return (
          <div
            key={page.id}
            className={`rounded-[10px] border transition-colors duration-150 ${page.visible ? "border-[#EEEEEE] bg-white" : "border-[#EEEEEE] bg-secondary/30"}`}
          >
            <div className="flex items-center gap-2 px-2 py-1.5">
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

              {page.custom && (
                <button
                  type="button"
                  onClick={() => setEditingContentId(editingContent ? null : page.id)}
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                >
                  {editingContent ? "Done" : "Edit"}
                </button>
              )}

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

              {page.custom && (
                <button
                  type="button"
                  onClick={() => remove(page.id)}
                  aria-label={`Delete ${page.label}`}
                  className="shrink-0 text-muted-foreground/60 transition-colors hover:text-destructive"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {page.custom && editingContent && (
              <div className="builder-pop-in space-y-2.5 border-t border-[#EEEEEE] p-3">
                <textarea
                  rows={4}
                  value={page.content?.body ?? ""}
                  onChange={(e) => updateContent(page.id, { ...page.content, body: e.target.value })}
                  placeholder="What goes on this page?"
                  className="w-full rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-accent"
                />
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-[10px] border border-[#EEEEEE] bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">New page</p>
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPage()}
            placeholder="e.g. Our Policies"
            className="mt-2 w-full rounded-[8px] border border-[#EAEAEA] bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={addPage} className="rounded-[8px] bg-accent px-3 py-1.5 text-xs font-medium text-white">
              Add page
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewLabel("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#EAEAEA] py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:border-accent hover:text-accent"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add a page
        </button>
      )}

      <p className="pt-1 text-xs text-muted-foreground">
        Products, Services, Gallery and other built-in pages appear automatically once they have content.
      </p>
    </div>
  );
}
