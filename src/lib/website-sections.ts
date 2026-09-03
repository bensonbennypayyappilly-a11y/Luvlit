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
  | "custom-text"
  // Signature — two per template, only offered in "Add Section" while that template is active,
  // and only rendered with real content on the template they belong to (see `SIGNATURE_TEMPLATE`
  // and the template-switch handling in the editor). Content-driven, never fabricated.
  | "editorial-spread"
  | "collection-spotlight"
  | "process-timeline"
  | "capability-grid"
  | "product-story"
  | "benefits-strip"
  | "visual-strip"
  | "featured-work"
  | "story-collage"
  | "atmospheric-cta";

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

export type ProcessTimelineContent = { steps: { title: string; body?: string }[] };
export type CapabilityGridContent = { items: { title: string; body?: string }[] };
export type BenefitsStripContent = { items: { title: string; body?: string }[] };
export type ProductStoryContent = { itemId?: string; heading?: string };
export type FeaturedWorkContent = { heading?: string; body?: string };
export type StoryCollageContent = { heading?: string; body?: string };
export type AtmosphericCtaContent = { heading?: string; body?: string; ctaLabel?: string };
export type CollectionSpotlightContent = { itemIds: string[]; heading?: string };
export type EditorialSpreadContent = { heading?: string; body?: string };

/** Which template each signature section belongs to — only offered in "Add Section" while that
 * template is active, and only rendered with its real layout on that template (see §19: a
 * signature section left over from a since-switched-away-from template is hidden, never deleted,
 * so this map is also what the editor uses to detect "unsupported after a template switch"). */
export const SIGNATURE_TEMPLATE: Partial<Record<SectionType, string>> = {
  "editorial-spread": "editorial",
  "collection-spotlight": "editorial",
  "process-timeline": "modern-business",
  "capability-grid": "modern-business",
  "product-story": "catalogue",
  "benefits-strip": "catalogue",
  "visual-strip": "experience",
  "featured-work": "experience",
  "story-collage": "story",
  "atmospheric-cta": "story",
};

/** Which small preview illustration the "Add Section" picker shows for each type (§12) — a
 * shape family, not a full mockup per type, so an owner gets a real sense of a section's
 * composition (full-bleed banner vs. a grid vs. a list of links) without needing 29 bespoke
 * illustrations. */
export type SectionPreviewShape = "hero" | "split" | "grid" | "text" | "list" | "cta" | "media" | "cards" | "spotlight" | "collage" | "timeline";
export const SECTION_PREVIEW_SHAPE: Record<SectionType, SectionPreviewShape> = {
  hero: "hero",
  about: "split",
  services: "grid",
  products: "grid",
  gallery: "grid",
  contact: "list",
  location: "list",
  quote: "cta",
  reviews: "cards",
  faq: "text",
  team: "cards",
  hours: "list",
  "delivery-areas": "list",
  video: "media",
  social: "list",
  "featured-products": "grid",
  booking: "cta",
  "promo-banner": "cta",
  "custom-text": "text",
  "editorial-spread": "split",
  "collection-spotlight": "grid",
  "process-timeline": "timeline",
  "capability-grid": "cards",
  "product-story": "spotlight",
  "benefits-strip": "cards",
  "visual-strip": "grid",
  "featured-work": "spotlight",
  "story-collage": "collage",
  "atmospheric-cta": "cta",
};

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
  about: { label: "About", description: "Your photo and your story.", core: true },
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
  "editorial-spread": { label: "Editorial spread", description: "A large photo paired with a story, magazine-style.", core: false },
  "collection-spotlight": { label: "Collection spotlight", description: "A curated, editorial-sized showcase of a few products.", core: false },
  "process-timeline": { label: "Process timeline", description: "Walk through how you work, step by step.", core: false },
  "capability-grid": { label: "Capability grid", description: "A grid of what you offer or specialise in.", core: false },
  "product-story": { label: "Product story", description: "Tell the story behind one hero product.", core: false },
  "benefits-strip": { label: "Benefits", description: "A short row of reasons to choose you.", core: false },
  "visual-strip": { label: "Visual strip", description: "A full-width strip of your work, image-led.", core: false },
  "featured-work": { label: "Featured work", description: "One standout photo with a caption.", core: false },
  "story-collage": { label: "Story collage", description: "A layered collage of photos with a narrative.", core: false },
  "atmospheric-cta": { label: "Atmospheric CTA", description: "A bold, full-bleed moment mid-page with a call to action.", core: false },
};

/** Sections that can't be removed once added — hiding is still allowed except where noted in the editor. */
export const NON_DELETABLE: SectionType[] = ["hero", "contact", "quote"];

/** Groups the "Add Section" picker into the three tiers from the rebuild spec — Universal
 * (always meaningful), Content (driven by real products/services/media data), and Template
 * Signature (only offered while the matching template is active — see `SIGNATURE_TEMPLATE`). */
export type SectionCategory = "universal" | "content" | "signature";
export const SECTION_CATEGORY: Record<SectionType, SectionCategory> = {
  hero: "universal",
  about: "universal",
  contact: "universal",
  location: "universal",
  quote: "universal",
  social: "universal",
  faq: "universal",
  hours: "universal",
  "delivery-areas": "universal",
  "promo-banner": "universal",
  "custom-text": "universal",
  video: "universal",
  services: "content",
  products: "content",
  "featured-products": "content",
  gallery: "content",
  reviews: "content",
  team: "content",
  booking: "content",
  "editorial-spread": "signature",
  "collection-spotlight": "signature",
  "process-timeline": "signature",
  "capability-grid": "signature",
  "product-story": "signature",
  "benefits-strip": "signature",
  "visual-strip": "signature",
  "featured-work": "signature",
  "story-collage": "signature",
  "atmospheric-cta": "signature",
};

/** What real content a business currently has — the only inputs `recommendSections` uses.
 * Deterministic, no AI: a section is recommended purely because the data it would show already
 * exists and isn't on the page yet. */
export type ContentSignals = {
  hasProducts: boolean;
  hasServices: boolean;
  hasGallery: boolean;
  hasReviews: boolean;
  hasAppointments: boolean;
  hasDeliveryAreas: boolean;
};

/** Section types worth suggesting first, given what the business actually has and hasn't
 * already added — never recommends a section with nothing to show (§11). */
export function recommendSections(signals: ContentSignals, usedTypes: Set<SectionType>): SectionType[] {
  const recs: SectionType[] = [];
  if (signals.hasProducts && !usedTypes.has("featured-products")) recs.push("featured-products");
  if (signals.hasServices && !usedTypes.has("services")) recs.push("services");
  if (signals.hasGallery && !usedTypes.has("gallery")) recs.push("gallery");
  if (signals.hasReviews && !usedTypes.has("reviews")) recs.push("reviews");
  if (signals.hasAppointments && !usedTypes.has("booking")) recs.push("booking");
  if (signals.hasDeliveryAreas && !usedTypes.has("delivery-areas")) recs.push("delivery-areas");
  return recs;
}

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
  services?: { length: number } | null;
}): Section[] {
  const sections: Section[] = [
    { id: id(), type: "hero", visible: true, content: {} },
    { id: id(), type: "about", visible: true, content: {} },
  ];
  // A mixed product+service business gets both sections — one or the other only when the
  // business genuinely has just one kind of offering (or business_types hints at only one).
  const hasProducts = (business.business_types ?? []).includes("product") || (business.items?.length ?? 0) > 0;
  const hasServices = (business.business_types ?? []).includes("appointment") || (business.services?.length ?? 0) > 0;
  if (hasProducts) sections.push({ id: id(), type: "products", visible: true, content: {} });
  if (hasServices || !hasProducts) sections.push({ id: id(), type: "services", visible: true, content: {} });
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
    "process-timeline": { steps: [] },
    "capability-grid": { items: [] },
    "benefits-strip": { items: [] },
    "collection-spotlight": { itemIds: [] },
  };
  return { id: id(), type, visible: true, content: defaults[type] ?? {} };
}
