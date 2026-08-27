import type { BusinessDetail } from "./public.types";

/**
 * Shared meta/canonical/JSON-LD builder for a business's public profile page —
 * used at both /business/$id (back-compat, pre-redirect) and the {slug}.luvlit.in
 * subdomain root, so the two routes render identical SEO output for the same data.
 */
export function buildBusinessHead(business: NonNullable<BusinessDetail>, url: string) {
  const desc = (business.description ?? `${business.name} on LuvLit.`).slice(0, 155);
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
  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: [
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
    ],
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
    logo_url: business.logo_url,
    gallery_urls: business.gallery_urls ?? [],
    main_video_url: business.main_video_url,
    short_video_urls: business.short_video_urls ?? [],
    brand_accent_color: business.brand_accent_color,
    is_eco_friendly: business.is_eco_friendly,
    locations: business.locations ?? [],
    delivery_areas: business.delivery_areas ?? [],
    items: business.items ?? [],
  };
}
