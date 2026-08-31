import { useEffect, useRef, useState } from "react";
import {
  NON_DELETABLE,
  SECTION_LIBRARY,
  newSection,
  type CustomTextContent,
  type FaqContent,
  type FeaturedProductsContent,
  type HeroContent,
  type PromoBannerContent,
  type QuoteContent,
  type Section,
  type SectionType,
  type ServicesContent,
} from "@/lib/website-sections";

type ItemOption = { id: string; name: string };

/**
 * Controls presence, order and visibility of a business's page sections, plus inline content
 * editors for the section types that hold genuinely freeform content (services list, FAQ,
 * promo banner, custom text, hero tagline, quote copy). Sections referencing existing data
 * (gallery, products, staff, locations, hours...) are edited where that data already lives —
 * this list only decides whether/where they're shown.
 */
export function SectionListEditor({
  sections,
  onChange,
  items,
}: {
  sections: Section[];
  onChange: (sections: Section[]) => void;
  items: ItemOption[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function update(id: string, patch: Partial<Section>) {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function updateContent(id: string, content: Record<string, unknown>) {
    update(id, { content: content as Section["content"] });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(id: string) {
    onChange(sections.filter((s) => s.id !== id));
  }

  function add(type: SectionType) {
    onChange([...sections, newSection(type)]);
    setAdding(false);
  }

  const usedTypes = new Set(sections.map((s) => s.type));
  const availableToAdd = (Object.keys(SECTION_LIBRARY) as SectionType[]).filter((t) => !usedTypes.has(t));

  return (
    <div className="space-y-2">
      {sections.map((section, i) => {
        const meta = SECTION_LIBRARY[section.type];
        const deletable = !NON_DELETABLE.includes(section.type);
        const isExpanded = expanded === section.id;
        const hasEditor = ["hero", "about", "services", "quote", "faq", "promo-banner", "custom-text", "featured-products"].includes(
          section.type,
        );

        return (
          <div key={section.id} className="rounded-md border border-border bg-card">
            <div className="flex items-center gap-1 p-1">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                  className="flex h-11 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={i === sections.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                  className="flex h-11 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <div className="min-w-0 flex-1 px-1">
                <p className="truncate text-sm font-medium">{meta.label}</p>
                {!section.visible && <p className="text-xs text-muted-foreground">Hidden</p>}
              </div>
              {hasEditor && (
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : section.id)}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border px-3 text-xs hover:border-accent"
                >
                  {isExpanded ? "Done" : "Edit"}
                </button>
              )}
              <button
                type="button"
                onClick={() => update(section.id, { visible: !section.visible })}
                aria-label={section.visible ? "Hide section" : "Show section"}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-xs ${
                  section.visible ? "border-border" : "border-accent bg-accent-soft text-accent"
                }`}
              >
                {section.visible ? "Hide" : "Show"}
              </button>
              {deletable && (
                <button
                  type="button"
                  onClick={() => remove(section.id)}
                  aria-label="Remove section"
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  ✕
                </button>
              )}
            </div>

            {isExpanded && (
              <div className="space-y-3 border-t border-border p-3">
                <SectionContentEditor section={section} items={items} onChange={(c) => updateContent(section.id, c)} />
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Add a section</p>
          <div className="mt-2 space-y-1">
            {availableToAdd.length === 0 && <p className="text-xs text-muted-foreground">All sections added.</p>}
            {availableToAdd.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => add(t)}
                className="block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-secondary"
              >
                <span className="font-medium">{SECTION_LIBRARY[t].label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{SECTION_LIBRARY[t].description}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setAdding(false)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-md border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-accent hover:text-accent"
        >
          + Add a section
        </button>
      )}
    </div>
  );
}

function SectionContentEditor({
  section,
  items,
  onChange,
}: {
  section: Section;
  items: ItemOption[];
  onChange: (content: Record<string, unknown>) => void;
}) {
  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  // Local copy so typing feels instant; only the propagation upstream (a real DB write, via
  // the parent's onImmediateChange) is debounced — otherwise every keystroke fired a save.
  // Structural edits (reorder/hide/delete/add, in the parent component) stay immediate; only
  // free-text content editing goes through this debounce.
  const [local, setLocal] = useState(section.content);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => setLocal(section.content), [section.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(content: Record<string, unknown>) {
    setLocal(content as Section["content"]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(content), 500);
  }

  const editingSection = { ...section, content: local };

  switch (editingSection.type) {
    case "hero": {
      const c = editingSection.content as HeroContent;
      return (
        <input
          value={c.tagline ?? ""}
          onChange={(e) => set({ tagline: e.target.value })}
          placeholder="Short tagline under your name (optional)"
          className={input}
        />
      );
    }

    case "about":
      return (
        <input
          value={(editingSection.content.heading as string) ?? ""}
          onChange={(e) => set({ heading: e.target.value })}
          placeholder="Heading (defaults to 'About [your business]')"
          className={input}
        />
      );

    case "quote": {
      const c = editingSection.content as QuoteContent;
      return (
        <>
          <input
            value={c.heading ?? ""}
            onChange={(e) => set({ ...c, heading: e.target.value })}
            placeholder="Heading (defaults to 'Tell us what you need')"
            className={input}
          />
          <textarea
            rows={2}
            value={c.body ?? ""}
            onChange={(e) => set({ ...c, body: e.target.value })}
            placeholder="Short pitch for why someone should request a quote"
            className={input}
          />
        </>
      );
    }

    case "services": {
      const list = (editingSection.content as ServicesContent).services ?? [];
      return (
        <div className="space-y-2">
          {list.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s.name}
                onChange={(e) => {
                  const next = [...list];
                  next[i] = { ...next[i], name: e.target.value };
                  set({ services: next });
                }}
                placeholder="Service name"
                className={input}
              />
              <button
                type="button"
                onClick={() => set({ services: list.filter((_, idx) => idx !== i) })}
                className="text-muted-foreground hover:text-destructive"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ services: [...list, { name: "" }] })}
            className="text-xs text-accent hover:underline"
          >
            + Add a service
          </button>
        </div>
      );
    }

    case "faq": {
      const list = (editingSection.content as FaqContent).items ?? [];
      return (
        <div className="space-y-3">
          {list.map((it, i) => (
            <div key={i} className="space-y-1.5 rounded-md border border-border p-2.5">
              <input
                value={it.q}
                onChange={(e) => {
                  const next = [...list];
                  next[i] = { ...next[i], q: e.target.value };
                  set({ items: next });
                }}
                placeholder="Question"
                className={input}
              />
              <textarea
                rows={2}
                value={it.a}
                onChange={(e) => {
                  const next = [...list];
                  next[i] = { ...next[i], a: e.target.value };
                  set({ items: next });
                }}
                placeholder="Answer"
                className={input}
              />
              <button
                type="button"
                onClick={() => set({ items: list.filter((_, idx) => idx !== i) })}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ items: [...list, { q: "", a: "" }] })}
            className="text-xs text-accent hover:underline"
          >
            + Add a question
          </button>
        </div>
      );
    }

    case "promo-banner": {
      const c = editingSection.content as PromoBannerContent;
      return (
        <>
          <input value={c.heading ?? ""} onChange={(e) => set({ ...c, heading: e.target.value })} placeholder="Banner heading" className={input} />
          <input value={c.body ?? ""} onChange={(e) => set({ ...c, body: e.target.value })} placeholder="Short line (optional)" className={input} />
          <div className="flex gap-2">
            <input value={c.ctaLabel ?? ""} onChange={(e) => set({ ...c, ctaLabel: e.target.value })} placeholder="Button text" className={input} />
            <input value={c.ctaHref ?? ""} onChange={(e) => set({ ...c, ctaHref: e.target.value })} placeholder="Button link" className={input} />
          </div>
        </>
      );
    }

    case "custom-text": {
      const c = editingSection.content as CustomTextContent;
      return (
        <>
          <input value={c.heading ?? ""} onChange={(e) => set({ ...c, heading: e.target.value })} placeholder="Heading (optional)" className={input} />
          <textarea rows={4} value={c.body ?? ""} onChange={(e) => set({ ...c, body: e.target.value })} placeholder="Text" className={input} />
        </>
      );
    }

    case "featured-products": {
      const ids = new Set((editingSection.content as FeaturedProductsContent).itemIds ?? []);
      if (!items.length) return <p className="text-xs text-muted-foreground">Add products first, in the Products page.</p>;
      return (
        <div className="flex flex-wrap gap-2">
          {items.map((it) => {
            const active = ids.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  const next = new Set(ids);
                  if (active) next.delete(it.id);
                  else next.add(it.id);
                  set({ itemIds: Array.from(next) });
                }}
                className={`inline-flex min-h-11 items-center rounded-full border px-3 text-xs ${active ? "border-accent bg-accent-soft" : "border-border"}`}
              >
                {it.name}
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
}
