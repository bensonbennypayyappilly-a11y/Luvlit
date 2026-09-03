import { buildDefaultSections, SIGNATURE_TEMPLATE, type Section } from "./website-sections";

/** Every signature section type, regardless of which template it belongs to — added to Home's
 * section list for every template so each one is reachable once a business is on the matching
 * template (`renderSectionBlock` in `section-renderer.tsx` is what actually hides a signature
 * section on a template that doesn't own it, not this list). */
const SIGNATURE_SECTION_TYPES = Object.keys(SIGNATURE_TEMPLATE) as Section["type"][];
import type { SiteBusiness } from "./website-site-types";
import type { TemplateId } from "./website-templates";
import type { SitePageRecord } from "./public.types";

export type PageId = "home" | "about" | "products" | "services" | "gallery" | "appointments" | "contact";

/** `id` is a `PageId` for the 6 built-in pages, or a custom page's own uuid — widened to `string`
 * so both fit one type without a discriminated union rippling through every consumer. */
export type SitePage = { id: string; label: string; path: string };

type PageInput = Pick<SiteBusiness, "sections" | "business_types" | "items" | "services">;

function isVisible(sections: Section[], type: Section["type"]) {
  return sections.some((s) => s.type === type && s.visible);
}

/**
 * The content-gated candidate set — never an empty page just to pad the nav. This is the
 * fallback (and the seed) for `deriveSitePages`; a business that hasn't touched the Pages panel
 * gets exactly this, unchanged from before the Pages panel existed.
 */
function candidatePages({ sections, business_types, items, services }: PageInput): SitePage[] {
  const pages: SitePage[] = [{ id: "home", label: "Home", path: "/" }];

  if (isVisible(sections, "about") || isVisible(sections, "team") || isVisible(sections, "faq")) {
    pages.push({ id: "about", label: "About", path: "/about" });
  }

  const hasItems = items.some((i) => i.is_active);
  const showProducts = hasItems && (isVisible(sections, "products") || isVisible(sections, "featured-products"));
  if (showProducts) pages.push({ id: "products", label: "Products", path: "/products" });

  const hasServices = services.some((s) => s.is_active);
  if (hasServices && isVisible(sections, "services")) {
    pages.push({ id: "services", label: "Services", path: "/services" });
  }

  if (isVisible(sections, "gallery")) {
    pages.push({ id: "gallery", label: "Gallery", path: "/gallery" });
  }

  if ((business_types ?? []).includes("appointment") && isVisible(sections, "booking")) {
    pages.push({ id: "appointments", label: "Book", path: "/appointments" });
  }

  pages.push({ id: "contact", label: "Contact", path: "/contact" });
  return pages;
}

/**
 * Derives which pages a business's public site actually has, and in what order/with what nav
 * labels — used both by the nav (to know what links to show) and by each page route (to know
 * whether it should render or 404) so the two can never disagree.
 *
 * `overrides` is the owner's own Pages-panel edits (`businesses.pages`, resolved via
 * `resolvePages`): reorder, rename, hide. An untouched business (`overrides` empty) gets exactly
 * `candidatePages`'s content-gated default, unchanged from before the Pages panel existed. Once
 * an owner has customized anything, overrides win — a hidden page disappears even if it has
 * content, a renamed page's own label sticks — but a page that only just became available (e.g.
 * their first product) still appears, appended after whatever they've already arranged, so new
 * content is never silently hidden.
 */
export function deriveSitePages(input: PageInput, overrides: SitePageRecord[] = []): SitePage[] {
  const candidates = candidatePages(input);
  if (overrides.length === 0) return candidates;

  const byId = new Map(candidates.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const ordered: SitePage[] = [];
  for (const o of overrides) {
    seen.add(o.id);
    if (o.visible === false) continue;
    if (o.type === "custom") {
      ordered.push({ id: o.id, label: o.label, path: `/${o.slug}` });
      continue;
    }
    const candidate = byId.get(o.id as PageId);
    if (!candidate) continue;
    ordered.push({ ...candidate, label: o.label?.trim() || candidate.label });
  }
  for (const c of candidates) {
    if (!seen.has(c.id)) ordered.push(c);
  }
  return ordered;
}

/** Every content-gated candidate page, in the owner's own arranged order where they've set one,
 * INCLUDING pages they've hidden (unlike `deriveSitePages`, which drops hidden pages entirely) —
 * this is what the Pages panel itself needs to show, so a hidden page stays editable/restorable
 * rather than disappearing from the editor along with the live site. */
export type EditingPage = SitePage & { visible: boolean; custom: boolean; slug: string; content?: SitePageRecord["content"] };

export function pagesForEditing(input: PageInput, overrides: SitePageRecord[]): EditingPage[] {
  const candidates = candidatePages(input);
  if (overrides.length === 0) return candidates.map((c) => ({ ...c, visible: true, custom: false, slug: c.id }));

  const byId = new Map(candidates.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const ordered: EditingPage[] = [];
  for (const o of overrides) {
    seen.add(o.id);
    if (o.type === "custom") {
      ordered.push({ id: o.id, label: o.label, path: `/${o.slug}`, visible: o.visible !== false, custom: true, slug: o.slug, content: o.content });
      continue;
    }
    const candidate = byId.get(o.id as PageId);
    if (!candidate) continue;
    ordered.push({ ...candidate, label: o.label?.trim() || candidate.label, visible: o.visible !== false, custom: false, slug: candidate.id });
  }
  for (const c of candidates) {
    if (!seen.has(c.id)) ordered.push({ ...c, visible: true, custom: false, slug: c.id });
  }
  return ordered;
}

/** A business that has never opened the Pages panel has `pages: []` (and `draft_pages: null`) —
 * this resolves to the empty override set so `deriveSitePages` falls back to its content-gated
 * default, exactly matching pre-Pages-panel behaviour. */
export function resolvePages(business: { pages?: SitePageRecord[] | null }): SitePageRecord[] {
  return business.pages ?? [];
}

/** Which section types belong on the Home page — a curated preview, not the full site. Every
 * other page (About, Products, Services, Gallery, Contact) shows that topic's sections in full;
 * Home exists to give a fast overview and funnel into them. Template-dependent: Catalogue's
 * home is a storefront (product browsing up front, no inline About/Gallery — those still get
 * their own pages via deriveSitePages, just not shown inline on Home); every other template
 * keeps the original curated-preview composition. */
export const HOME_SECTION_TYPES: Section["type"][] = [
  "hero",
  "about",
  "featured-products",
  "services",
  "gallery",
  "reviews",
  "promo-banner",
  "quote",
  ...SIGNATURE_SECTION_TYPES,
];

const CATALOGUE_HOME_SECTION_TYPES: Section["type"][] = [
  "hero",
  "products",
  "featured-products",
  "services",
  "reviews",
  "promo-banner",
  "quote",
  ...SIGNATURE_SECTION_TYPES,
];

function homeSectionTypesFor(templateId: TemplateId): Section["type"][] {
  return templateId === "catalogue" ? CATALOGUE_HOME_SECTION_TYPES : HOME_SECTION_TYPES;
}

export const ABOUT_SECTION_TYPES: Section["type"][] = ["about", "team", "faq"];
export const PRODUCTS_SECTION_TYPES: Section["type"][] = ["products"];
export const SERVICES_SECTION_TYPES: Section["type"][] = ["services", "quote"];
export const GALLERY_SECTION_TYPES: Section["type"][] = ["gallery", "video"];
export const APPOINTMENTS_SECTION_TYPES: Section["type"][] = ["booking"];
export const CONTACT_SECTION_TYPES: Section["type"][] = ["location", "delivery-areas", "hours", "contact", "social"];

const PAGE_SECTION_TYPES: Record<Exclude<PageId, "home">, Section["type"][]> = {
  about: ABOUT_SECTION_TYPES,
  products: PRODUCTS_SECTION_TYPES,
  services: SERVICES_SECTION_TYPES,
  gallery: GALLERY_SECTION_TYPES,
  appointments: APPOINTMENTS_SECTION_TYPES,
  contact: CONTACT_SECTION_TYPES,
};

/** Visible sections belonging to one page, in the business's own order. */
export function sectionsForPage(sections: Section[], pageId: PageId, templateId: TemplateId): Section[] {
  const types = pageId === "home" ? homeSectionTypesFor(templateId) : PAGE_SECTION_TYPES[pageId];
  return sections.filter((s) => s.visible && types.includes(s.type));
}

/** A business that has never opened the website builder has `sections: []` — this falls back
 * to a sensible generated default so their page is never blank, without needing a migration
 * to backfill every existing row. */
export function resolveSections(business: Pick<SiteBusiness, "sections" | "business_types" | "items" | "services">): Section[] {
  return business.sections.length
    ? business.sections
    : buildDefaultSections({
        business_types: business.business_types,
        items: { length: business.items.length, ids: business.items.filter((i) => i.is_active).map((i) => i.id) },
        services: { length: business.services.length },
      });
}
