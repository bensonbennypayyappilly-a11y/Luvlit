import { buildDefaultSections, type Section } from "./website-sections";
import type { SiteBusiness } from "./website-site-types";
import type { TemplateId } from "./website-templates";

export type PageId = "home" | "about" | "products" | "services" | "gallery" | "appointments" | "contact";

export type SitePage = { id: PageId; label: string; path: string };

type PageInput = Pick<SiteBusiness, "sections" | "business_types" | "items" | "services">;

function isVisible(sections: Section[], type: Section["type"]) {
  return sections.some((s) => s.type === type && s.visible);
}

/**
 * Derives which pages a business's public site actually has from real content — never an
 * empty page just to pad the nav. Used both by the nav (to know what links to show) and by
 * each page route (to know whether it should render or 404) so the two can never disagree.
 * Doesn't create pages for content-free sections; doesn't force irrelevant pages onto a
 * business that doesn't use that feature.
 */
export function deriveSitePages({ sections, business_types, items, services }: PageInput): SitePage[] {
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
];

const CATALOGUE_HOME_SECTION_TYPES: Section["type"][] = [
  "hero",
  "products",
  "featured-products",
  "services",
  "reviews",
  "promo-banner",
  "quote",
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
export function resolveSections(business: Pick<SiteBusiness, "sections" | "business_types" | "items">): Section[] {
  return business.sections.length
    ? business.sections
    : buildDefaultSections({ business_types: business.business_types, items: { length: business.items.length } });
}
