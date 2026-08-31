/**
 * Curated website style presets — Phase 3. Not separate codebases per template: every
 * template is the same section renderer (business-profile-preview.tsx) reading a small set
 * of style variables, so this stays one system to maintain, not six. A business picks one;
 * the picker is a curated list, never a raw style-control panel, so a page can't be made to
 * look amateur by accident.
 */
export type TemplateId = "studio" | "boutique" | "food" | "professional" | "home-services" | "events";

export type TemplateStyle = {
  label: string;
  description: string;
  /** "full" = tall image-led hero (current Phase 2 default). "compact" = shorter, more text-forward — better when a business leads with credibility/services rather than a single hero shot. */
  hero: "full" | "compact";
  /** Vertical rhythm between sections. */
  spacing: "airy" | "compact";
  /** Corner rounding used across cards, images and tinted section blocks. */
  corners: "soft" | "sharp";
  /** Heading weight/tracking — each template's own typographic feel (Phase 3's "strong
   * typography" goal), not a separate picker layered on top (would just be two "choose a
   * look" controls fighting each other). Tailwind classes applied to every h1/h2 in the page. */
  headingClass: string;
};

export const DEFAULT_TEMPLATE: TemplateId = "studio";

export const TEMPLATES: Record<TemplateId, TemplateStyle> = {
  studio: {
    label: "Studio",
    description: "Clean and spacious — for creative studios, artists, lifestyle brands.",
    hero: "full",
    spacing: "airy",
    corners: "soft",
    headingClass: "",
  },
  boutique: {
    label: "Boutique",
    description: "Product-forward — for retail, fashion and handmade goods.",
    hero: "full",
    spacing: "airy",
    corners: "soft",
    headingClass: "",
  },
  food: {
    label: "Food & Bakery",
    description: "Warm and image-led — for bakeries, cafes and restaurants.",
    hero: "full",
    spacing: "compact",
    corners: "soft",
    headingClass: "font-medium",
  },
  professional: {
    label: "Professional Services",
    description: "Structured and direct — for consultants, agencies and professional services.",
    hero: "compact",
    spacing: "compact",
    corners: "sharp",
    headingClass: "font-semibold tracking-tight",
  },
  "home-services": {
    label: "Home Services",
    description: "Simple and trustworthy — for repair, cleaning and local services.",
    hero: "compact",
    spacing: "compact",
    corners: "sharp",
    headingClass: "font-semibold",
  },
  events: {
    label: "Events & Weddings",
    description: "Editorial and dramatic — for event planners and wedding vendors.",
    hero: "full",
    spacing: "airy",
    corners: "soft",
    headingClass: "font-light tracking-wide",
  },
};

export function templateStyle(id: string | null | undefined): TemplateStyle {
  return TEMPLATES[(id as TemplateId) ?? DEFAULT_TEMPLATE] ?? TEMPLATES[DEFAULT_TEMPLATE];
}
