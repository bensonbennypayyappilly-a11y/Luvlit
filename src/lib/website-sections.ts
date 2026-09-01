/**
 * Website builder section system. A business's public page is an ordered array of these
 * instead of a fixed set of hardcoded fields. Sections are a layout/composition layer, not a
 * data store: anything with an existing relational home (products -> items, staff -> staff,
 * gallery -> gallery_urls, locations -> locations/delivery_areas, hours -> operating_hours)
 * is referenced by the section, never copied into it. Only genuinely freeform content (custom
 * text, FAQ entries, a promo banner's copy, an optional hero tagline) lives in `content`.
 */

import type { Json } from "@/integrations/supabase/types";

export type SectionType =
  // Core — present on every business by default, always meaningful.
  | "hero"
  | "about"
  | "services"
  | "products"
  | "gallery"
  | "contact"
  | "location"
  | "quote"
  // Optional — a business adds/removes/reorders these.
  | "reviews"
  | "faq"
  | "team"
  | "hours"
  | "delivery-areas"
  | "video"
  | "social"
  | "featured-products"
  | "booking"
  | "promo-banner"
  | "custom-text";

export type Section = {
  id: string;
  type: SectionType;
  visible: boolean;
  content: Record<string, Json>;
};

export type FaqContent = { items: { q: string; a: string }[] };
export type PromoBannerContent = { heading: string; body?: string; ctaLabel?: string; ctaHref?: string };
export type CustomTextContent = { heading?: string; body: string };
export type HeroContent = { tagline?: string };
export type AboutContent = { heading?: string };
/** @deprecated Services now have a real table (see `services` in public.types.ts) — a business's
 * services section always renders from that, exactly like `products` renders from `items`. Kept
 * only so any pre-existing section row with old freeform content still parses without crashing. */
export type ServicesContent = { services?: { name: string; description?: string }[] };
export type QuoteContent = { heading?: string; body?: string };
export type FeaturedProductsContent = { itemIds: string[] };

export const CORE_SECTION_TYPES: SectionType[] = [
  "hero",
  "about",
  "services",
  "products",
  "gallery",
  "contact",
  "location",
  "quote",
];

/** Library metadata for the editor's "add a section" picker — not used by the renderer. */
export const SECTION_LIBRARY: Record<SectionType, { label: string; description: string; core: boolean }> = {
  hero: { label: "Hero", description: "Your name, a photo or video, and a short tagline at the top of the page.", core: true },
  about: { label: "About", description: "Your photo and business description.", core: true },
  services: { label: "Services", description: "What you offer — managed in Services.", core: true },
  products: { label: "Products", description: "Your catalogue — managed in Products.", core: true },
  gallery: { label: "Gallery", description: "Photos of your work — managed in Gallery.", core: true },
  contact: { label: "Contact", description: "WhatsApp, email and Instagram.", core: true },
  location: { label: "Location", description: "Your addresses and delivery area.", core: true },
  quote: { label: "Request a quote", description: "The main call-to-action for new enquiries.", core: true },
  reviews: { label: "Reviews", description: "Customer reviews, once you have some.", core: false },
  faq: { label: "FAQ", description: "Answer common questions up front.", core: false },
  team: { label: "Team", description: "Introduce your staff — managed in Staff.", core: false },
  hours: { label: "Opening hours", description: "When you're open — set in Website Settings.", core: false },
  "delivery-areas": { label: "Delivery areas", description: "Cities you deliver or serve.", core: false },
  video: { label: "Video", description: "Short clips shown as a reel — managed in Short Videos.", core: false },
  social: { label: "Social links", description: "Instagram and other links.", core: false },
  "featured-products": { label: "Featured products", description: "Spotlight a few products.", core: false },
  booking: { label: "Booking", description: "Appointment booking — only if you take appointments.", core: false },
  "promo-banner": { label: "Promo banner", description: "A short announcement or offer.", core: false },
  "custom-text": { label: "Custom text", description: "Freeform text block for anything else.", core: false },
};

/** Sections that can't be removed once added — hiding is still allowed except where noted in the editor. */
export const NON_DELETABLE: SectionType[] = ["hero", "contact", "quote"];

function id() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

/**
 * Sensible default section set for a business with no layout yet — used both for brand-new
 * businesses finishing onboarding and to backfill existing businesses so nobody's page goes
 * blank when this system ships. Built from data the business already has; sections for data
 * they don't have (e.g. no locations yet) are still included but simply render nothing until
 * populated, except gallery/products which only get added if there's something to show.
 */
export function buildDefaultSections(business: {
  business_types?: string[] | null;
  gallery_urls?: string[] | null;
  items?: { length: number } | null;
}): Section[] {
  const sections: Section[] = [
    { id: id(), type: "hero", visible: true, content: {} },
    { id: id(), type: "about", visible: true, content: {} },
  ];
  if ((business.business_types ?? []).includes("product") || (business.items?.length ?? 0) > 0) {
    sections.push({ id: id(), type: "products", visible: true, content: {} });
  } else {
    sections.push({ id: id(), type: "services", visible: true, content: {} });
  }
  sections.push({ id: id(), type: "gallery", visible: true, content: {} });
  if ((business.business_types ?? []).includes("appointment")) {
    sections.push({ id: id(), type: "booking", visible: true, content: {} });
  }
  sections.push(
    { id: id(), type: "location", visible: true, content: {} },
    { id: id(), type: "quote", visible: true, content: {} },
    { id: id(), type: "contact", visible: true, content: {} },
  );
  return sections;
}

export function newSection(type: SectionType): Section {
  const defaults: Partial<Record<SectionType, Record<string, Json>>> = {
    faq: { items: [] },
    "promo-banner": { heading: "" },
    "custom-text": { body: "" },
    "featured-products": { itemIds: [] },
  };
  return { id: id(), type, visible: true, content: defaults[type] ?? {} };
}
