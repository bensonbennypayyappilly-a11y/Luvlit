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
} from "@/lib/website-sections";
import { ColorField } from "@/components/website-builder/color-field";

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
    <div className="space-y-1.5">
      {sections.map((section, i) => {
        const meta = SECTION_LIBRARY[section.type];
        const deletable = !NON_DELETABLE.includes(section.type);
        const isExpanded = expanded === section.id;

        return (
          <div
            key={section.id}
            className={`rounded-[10px] border transition-colors duration-150 ${
              isExpanded ? "border-accent/30 bg-accent-soft/40" : "border-[#EEEEEE] bg-white"
            }`}
          >
            <div className="flex items-center gap-0.5 py-1 pl-1 pr-2">
              <div className="flex shrink-0 flex-col text-muted-foreground/60">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                  className="flex h-6 w-7 items-center justify-center rounded-[6px] transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:opacity-25"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={i === sections.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                  className="flex h-6 w-7 items-center justify-center rounded-[6px] transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:opacity-25"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
              <div className="min-w-0 flex-1 px-2 py-1.5">
                <p className="truncate text-[13px] font-medium">{meta.label}</p>
                {!section.visible && <p className="text-[11px] text-muted-foreground">Hidden</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : section.id)}
                  className={`inline-flex h-8 items-center rounded-[8px] px-2.5 text-xs font-medium transition-colors ${
                    isExpanded ? "bg-accent text-white" : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
                  }`}
                >
                  {isExpanded ? "Done" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => update(section.id, { visible: !section.visible })}
                  aria-label={section.visible ? "Hide section" : "Show section"}
                  className={`inline-flex h-8 items-center rounded-[8px] px-2.5 text-xs font-medium transition-colors ${
                    section.visible ? "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground" : "text-accent"
                  }`}
                >
                  {section.visible ? "Hide" : "Show"}
                </button>
                {deletable && (
                  <button
                    type="button"
                    onClick={() => remove(section.id)}
                    aria-label="Remove section"
                    className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="builder-pop-in space-y-3 border-t border-accent/20 p-3">
                <SectionContentEditor section={section} items={items} onChange={(c) => updateContent(section.id, c)} />
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-[10px] border border-[#EEEEEE] bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Add a section</p>
          <div className="mt-2 space-y-0.5">
            {availableToAdd.length === 0 && <p className="text-xs text-muted-foreground">All sections added.</p>}
            {availableToAdd.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => add(t)}
                className="block w-full rounded-[8px] px-2.5 py-2 text-left text-sm transition-colors hover:bg-[#FAFAFA]"
              >
                <span className="font-medium">{SECTION_LIBRARY[t].label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{SECTION_LIBRARY[t].description}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setAdding(false)} className="mt-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            Cancel
          </button>
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
          Add a section
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
  const input =
    "w-full rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-accent";

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
  const backgroundColor = typeof local.backgroundColor === "string" ? local.backgroundColor : "";
  const textColor = typeof local.textColor === "string" ? local.textColor : "";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Background"
          value={backgroundColor || null}
          defaultColor="#ffffff"
          onChange={(hex) => set({ ...local, backgroundColor: hex })}
          onClear={
            backgroundColor
              ? () => {
                  const { backgroundColor: _drop, ...rest } = local;
                  set(rest);
                }
              : undefined
          }
        />
        <ColorField
          label="Text colour"
          value={textColor || null}
          defaultColor="#000000"
          onChange={(hex) => set({ ...local, textColor: hex })}
          onClear={
            textColor
              ? () => {
                  const { textColor: _drop, ...rest } = local;
                  set(rest);
                }
              : undefined
          }
        />
      </div>
      <p className="text-xs text-muted-foreground/80">
        Applies to this section's headings and body text. Muted/secondary text keeps its own subtler shade.
      </p>
      <SectionTypeEditor editingSection={editingSection} items={items} input={input} set={set} />
    </>
  );
}

function SectionTypeEditor({
  editingSection,
  items,
  input,
  set,
}: {
  editingSection: Section;
  items: ItemOption[];
  input: string;
  set: (content: Record<string, unknown>) => void;
}) {
  const local = editingSection.content;

  switch (editingSection.type) {
    case "hero": {
      const c = editingSection.content as HeroContent;
      return (
        <input
          value={c.tagline ?? ""}
          onChange={(e) => set({ ...local, tagline: e.target.value })}
          placeholder="Short tagline under your name (optional)"
          className={input}
        />
      );
    }

    case "about":
      return (
        <input
          value={(editingSection.content.heading as string) ?? ""}
          onChange={(e) => set({ ...local, heading: e.target.value })}
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

    case "faq": {
      const list = (editingSection.content as FaqContent).items ?? [];
      return (
        <div className="space-y-3">
          {list.map((it, i) => (
            <div key={i} className="space-y-1.5 rounded-[10px] border border-[#EEEEEE] p-2.5">
              <input
                value={it.q}
                onChange={(e) => {
                  const next = [...list];
                  next[i] = { ...next[i], q: e.target.value };
                  set({ ...local, items: next });
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
                  set({ ...local, items: next });
                }}
                placeholder="Answer"
                className={input}
              />
              <button
                type="button"
                onClick={() => set({ ...local, items: list.filter((_, idx) => idx !== i) })}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ ...local, items: [...list, { q: "", a: "" }] })}
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
                  set({ ...local, itemIds: Array.from(next) });
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
