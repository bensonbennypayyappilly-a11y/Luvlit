import type { BusinessDetail } from "./public.types";
import type { CustomTextContent, FaqContent, PromoBannerContent, Section } from "./website-sections";

const SCHEMA_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MAX_DESCRIPTION_LENGTH = 155;

/**
 * Looks up the first visible section of a given type. Callers must always pass a business's
 * PUBLISHED `sections` (never `draft_sections`) so unpublished edits never leak into public SEO
 * output — `BusinessDetail` only ever carries the published column, so any caller reading
 * `business.sections` already gets this for free.
 */
function findVisibleSection(sections: Section[] | null | undefined, type: Section["type"]) {
  return (sections ?? []).find((s) => s.type === type && s.visible);
}

/** Joins an optional heading and body into one sentence-ish string, or returns whichever half exists. */
function joinHeadingBody(heading: string, body: string): string | null {
  const h = heading.trim().replace(/[.!?]+$/, "");
  const b = body.trim();
  if (h && b) return `${h}. ${b}`;
  return h || b || null;
}

/** Pulls the business's own freeform marketing copy out of a custom-text or promo-banner section. */
function sectionOwnText(section: Section): string | null {
  if (section.type === "custom-text") {
    const c = section.content as CustomTextContent;
    return joinHeadingBody(c.heading ?? "", c.body ?? "");
  }
  if (section.type === "promo-banner") {
    const c = section.content as PromoBannerContent;
    return joinHeadingBody(c.heading ?? "", c.body ?? "");
  }
  return null;
}

/** Trims to a search-snippet-friendly length at a word boundary, never mid-word — only marks with an ellipsis when it actually cuts something. */
function truncateForSnippet(text: string, max: number): string {
  const flat = text.trim().replace(/\s+/g, " ");
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:—-]+$/, "");
  return `${safe}…`;
}

/**
 * Meta/OG/JSON-LD description for a business. Prefers the business's own deliberately-authored
 * copy from a published custom-text/promo-banner section — whichever appears first in the
 * business's own section order and actually has text — over the flat `description` column,
 * since that's real marketing copy the owner chose to put on their page. Falls back to
 * `description` unchanged for businesses that haven't touched the website builder, so existing
 * behavior is preserved for them. When a services section is present and there's still room left
 * in the snippet budget, appends a short "Services: ..." summary; skipped entirely (never
 * truncating the primary copy to force it in) when it wouldn't fit cleanly.
 */
function buildBusinessDescription(business: NonNullable<BusinessDetail>): string {
  const sections = business.sections ?? [];
  const visible = sections.filter((s) => s.visible);

  const sectionText = visible.map(sectionOwnText).find((t): t is string => !!t) ?? null;
  let desc = (sectionText ?? business.description ?? `${business.name} on LuvLit.`)
    .trim()
    .replace(/\s+/g, " ");

  const servicesSection = findVisibleSection(sections, "services");
  const serviceNames = servicesSection
    ? (business.services ?? [])
        .filter((s) => s.is_active)
        .map((s) => s.name?.trim())
        .filter((n): n is string => !!n)
    : [];

  if (serviceNames.length) {
    const summary = `Services: ${serviceNames.slice(0, 4).join(", ")}.`;
    if (desc.length + 1 + summary.length <= MAX_DESCRIPTION_LENGTH) {
      desc = `${desc} ${summary}`;
    }
  }

  return truncateForSnippet(desc, MAX_DESCRIPTION_LENGTH);
}

/**
 * Shared meta/canonical/JSON-LD builder for a business's public profile page —
 * used at both /business/$id (back-compat, pre-redirect) and the {slug}.luvlit.in
 * subdomain root, so the two routes render identical SEO output for the same data.
 */
export function buildBusinessHead(business: NonNullable<BusinessDetail>, url: string) {
  const desc = buildBusinessDescription(business);
  const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
    { title: `${business.name} — LuvLit` },
    { name: "description", content: desc },
    { property: "og:title", content: business.name },
    { property: "og:description", content: desc },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
  ];
  if (business.hero_image_url) {
    meta.push({ property: "og:image", content: business.hero_image_url });
    meta.push({ name: "twitter:image", content: business.hero_image_url });
  }
  const locations = (business.locations ?? []) as Array<{
    address?: string | null;
    city?: string | null;
    state?: string | null;
  }>;
  const hours = business.operating_hours;
  // FAQ is real, business-authored content (see website-sections.ts) — not a fake/placeholder
  // rich-result, only emitted when the business actually has one and it's currently visible.
  const faqSection = findVisibleSection(business.sections, "faq");
  const faqItems = ((faqSection?.content as FaqContent | undefined)?.items ?? []).filter((f) => f.q && f.a);

  const scripts = [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: business.name,
        description: desc,
        url,
        ...(business.hero_image_url ? { image: business.hero_image_url } : {}),
        ...(business.logo_url ? { logo: business.logo_url } : {}),
        ...(business.contact_email ? { email: business.contact_email } : {}),
        ...(business.categories?.length ? { knowsAbout: business.categories } : {}),
        ...(business.instagram_url ? { sameAs: [business.instagram_url] } : {}),
        // Real reviews only (Phase 10) — omitted entirely until a business has at least one,
        // never a placeholder rating.
        ...(business.review_count > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: business.review_avg,
                reviewCount: business.review_count,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        ...(hours?.start && hours?.end && hours.days?.length
          ? {
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: hours.days.map((d) => SCHEMA_DAY_NAMES[d]).filter(Boolean),
                opens: hours.start,
                closes: hours.end,
              },
            }
          : {}),
        ...(locations.length
          ? {
              address: locations.map((l) => ({
                "@type": "PostalAddress",
                ...(l.address ? { streetAddress: l.address } : {}),
                ...(l.city ? { addressLocality: l.city } : {}),
                ...(l.state ? { addressRegion: l.state } : {}),
                addressCountry: "IN",
              })),
            }
          : {}),
      }),
    },
  ];

  if (faqItems.length) {
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    });
  }

  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts,
  };
}

/** Maps a BusinessDetail into the field allowlist BusinessProfilePreview accepts. */
export function toProfileBusiness(business: NonNullable<BusinessDetail>) {
  return {
    id: business.id,
    name: business.name,
    description: business.description,
    categories: business.categories ?? [],
    business_types: business.business_types ?? [],
    instagram_url: business.instagram_url,
    whatsapp: business.whatsapp,
    contact_email: business.contact_email,
    hero_image_url: business.hero_image_url,
    about_image_url: business.about_image_url,
    logo_url: business.logo_url,
    gallery_urls: business.gallery_urls ?? [],
    main_video_url: business.main_video_url,
    short_video_urls: business.short_video_urls ?? [],
    brand_accent_color: business.brand_accent_color,
    brand_secondary_color: business.brand_secondary_color,
    button_style: business.button_style,
    background_color: business.background_color,
    custom_domain: business.custom_domain,
    is_eco_friendly: business.is_eco_friendly,
    operating_hours: business.operating_hours ?? null,
    sections: business.sections ?? [],
    template: business.template ?? "editorial",
    review_count: business.review_count ?? 0,
    review_avg: business.review_avg,
    reviews: business.reviews ?? [],
    owner_email_verified: business.owner_email_verified ?? false,
    locations: business.locations ?? [],
    delivery_areas: business.delivery_areas ?? [],
    items: business.items ?? [],
    services: business.services ?? [],
    staff: business.staff ?? [],
  };
}
