/**
 * Curated website templates — 5 built-in professional presets, each a genuinely different
 * layout/composition, all reading the same renderer (`src/components/website/section-renderer.tsx`)
 * and the same business/section data. A business's data — sections, products, services, staff,
 * images — never changes when switching templates; only these style/layout choices do. Business
 * owners never see raw typography/spacing controls, only this curated set, per the project's
 * "protect the output's quality" rule.
 */
export type TemplateId = "editorial" | "modern-business" | "catalogue" | "experience" | "story";

export type NavStyle = "bar-solid" | "bar-dark" | "minimal-underline";
export type HeroStyle = "split" | "full-bleed" | "centered-minimal" | "image-right";
export type GalleryDefault = "grid-3" | "grid-2" | "masonry" | "featured";
export type CardStyle = "bordered" | "shadow" | "flat-divide" | "editorial-frame";

export type TemplateStyle = {
  id: TemplateId;
  label: string;
  description: string;
  suitedFor: string;
  /** Default accent shown in previews before a business picks their own brand colour —
   * business_accent_color always wins once set; this is only a starting point. */
  previewAccent: string;
  previewSurface: string;
  navStyle: NavStyle;
  hero: HeroStyle;
  spacing: "airy" | "compact";
  corners: "soft" | "sharp";
  cardStyle: CardStyle;
  gallery: GalleryDefault;
  headingFont: "serif" | "sans-bold" | "sans-tight" | "sans-light";
  headingClass: string;
  bodyClass: string;
  /** Whether section eyebrows (small uppercase labels above headings) are shown — some
   * templates read cleaner without them. */
  showEyebrows: boolean;
};

export const DEFAULT_TEMPLATE: TemplateId = "editorial";

export const TEMPLATES: Record<TemplateId, TemplateStyle> = {
  editorial: {
    id: "editorial",
    label: "Editorial",
    description: "Elegant and image-forward, with a dark, gallery-like feel — full-bleed hero, generous whitespace, refined type.",
    suitedFor: "Jewellery, boutiques, fashion, fine craft",
    previewAccent: "#B08D57",
    previewSurface: "#14140F",
    navStyle: "bar-dark",
    hero: "full-bleed",
    spacing: "airy",
    corners: "soft",
    cardStyle: "editorial-frame",
    gallery: "featured",
    headingFont: "serif",
    headingClass: "font-medium tracking-tight",
    bodyClass: "leading-relaxed",
    showEyebrows: true,
  },
  "modern-business": {
    id: "modern-business",
    label: "Modern Business",
    description: "Direct and trustworthy — service grid up front, clear process, strong CTAs. Built for businesses that get hired, not browsed.",
    suitedFor: "Home services, repair, trades, agencies",
    previewAccent: "#1E3A5F",
    previewSurface: "#F7F8FA",
    navStyle: "bar-solid",
    hero: "split",
    spacing: "compact",
    corners: "sharp",
    cardStyle: "bordered",
    gallery: "grid-3",
    headingFont: "sans-bold",
    headingClass: "font-bold tracking-tight",
    bodyClass: "leading-normal",
    showEyebrows: false,
  },
  catalogue: {
    id: "catalogue",
    label: "Catalogue",
    description: "Product-first, shop-by-category — built like a real storefront, not a landing page.",
    suitedFor: "Boutiques, bakeries, home décor, handmade, gifts",
    previewAccent: "#5B6E4E",
    previewSurface: "#FAF8F2",
    navStyle: "bar-solid",
    hero: "image-right",
    spacing: "compact",
    corners: "soft",
    cardStyle: "shadow",
    gallery: "grid-3",
    headingFont: "sans-tight",
    headingClass: "font-semibold tracking-tight",
    bodyClass: "leading-normal",
    showEyebrows: true,
  },
  experience: {
    id: "experience",
    label: "Experience",
    description: "Calm and considered, appointment-led — service cards with price and duration, gallery-rich, built to get a booking.",
    suitedFor: "Salons, spas, wellness, fitness, clinics",
    previewAccent: "#6B5B3E",
    previewSurface: "#F3EFE7",
    navStyle: "bar-solid",
    hero: "full-bleed",
    spacing: "airy",
    corners: "soft",
    cardStyle: "shadow",
    gallery: "masonry",
    headingFont: "serif",
    headingClass: "font-normal",
    bodyClass: "leading-relaxed",
    showEyebrows: true,
  },
  story: {
    id: "story",
    label: "Story",
    description: "Minimal, black-and-white, portfolio-led — lets the work speak, built around narrative and craft.",
    suitedFor: "Photographers, designers, coaches, consultants, freelancers",
    previewAccent: "#171717",
    previewSurface: "#FFFFFF",
    navStyle: "minimal-underline",
    hero: "centered-minimal",
    spacing: "airy",
    corners: "sharp",
    cardStyle: "flat-divide",
    gallery: "grid-2",
    headingFont: "sans-light",
    headingClass: "font-light tracking-tight",
    bodyClass: "leading-relaxed",
    showEyebrows: false,
  },
};

export const TEMPLATE_LIST: TemplateStyle[] = [
  TEMPLATES.editorial,
  TEMPLATES["modern-business"],
  TEMPLATES.catalogue,
  TEMPLATES.experience,
  TEMPLATES.story,
];

export function templateStyle(id: string | null | undefined): TemplateStyle {
  return TEMPLATES[(id as TemplateId) ?? DEFAULT_TEMPLATE] ?? TEMPLATES[DEFAULT_TEMPLATE];
}
