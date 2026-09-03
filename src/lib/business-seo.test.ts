import { describe, expect, it } from "vitest";
import { buildBusinessHead, toProfileBusiness } from "./business-seo";
import type { BusinessDetail, BusinessService } from "./public.types";
import type { Section } from "./website-sections";

type Business = NonNullable<BusinessDetail>;

function makeService(overrides: Partial<BusinessService> & Pick<BusinessService, "name">): BusinessService {
  return {
    id: overrides.name,
    slug: overrides.name,
    description: null,
    price: null,
    duration_minutes: 30,
    category: null,
    image_url: null,
    is_active: true,
    ...overrides,
  };
}

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    slug: "priyas-cakes",
    name: "Priya's Cakes",
    description: null,
    tagline: null,
    categories: [],
    specialities: [],
    business_types: [],
    instagram_url: null,
    whatsapp: null,
    phone: null,
    preferred_contact: null,
    contact_email: null,
    hero_image_url: null,
    about_image_url: null,
    about_text: null,
    logo_url: null,
    gallery_urls: [],
    main_video_url: null,
    short_video_urls: [],
    brand_accent_color: null,
    brand_secondary_color: null,
    button_style: null,
    background_color: null,
    custom_domain: null,
    is_eco_friendly: false,
    view_count: 0,
    operating_hours: null,
    sections: [],
    pages: [],
    template: null,
    corner_style: null,
    density: null,
    review_count: 0,
    review_avg: null,
    reviews: [],
    owner_email_verified: false,
    locations: [],
    delivery_areas: [],
    items: [],
    services: [],
    staff: [],
    ...overrides,
  };
}

function section(partial: Partial<Section> & Pick<Section, "type">): Section {
  return { id: partial.type, visible: true, content: {}, ...partial };
}

function metaDescription(head: ReturnType<typeof buildBusinessHead>): string | undefined {
  return head.meta.find((m) => m.name === "description")?.content;
}

function jsonLd(head: ReturnType<typeof buildBusinessHead>, type: string) {
  return head.scripts.map((s) => JSON.parse(s.children)).find((s) => s["@type"] === type);
}

const URL = "https://priyas-cakes.luvlit.in";

describe("buildBusinessHead", () => {
  it("falls back to the plain description column when there's no website-builder copy", () => {
    const business = makeBusiness({ description: "Custom cakes for every occasion." });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("Custom cakes for every occasion.");
  });

  it("falls back to a generic '<name> on LuvLit.' when there's no description at all", () => {
    const business = makeBusiness({ description: null });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("Priya's Cakes on LuvLit.");
  });

  it("prefers the business's tagline over the plain description column when there's no section copy", () => {
    const business = makeBusiness({
      tagline: "Custom cakes across Kochi",
      description: "The flat description column.",
    });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("Custom cakes across Kochi");
  });

  it("still prefers a visible section's own copy over the tagline", () => {
    const business = makeBusiness({
      tagline: "Custom cakes across Kochi",
      sections: [section({ type: "custom-text", content: { heading: "Fresh daily", body: "Baked to order." } })],
    });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("Fresh daily. Baked to order.");
  });

  it("includes categories and specialities in the keywords meta tag and JSON-LD knowsAbout", () => {
    const business = makeBusiness({ categories: ["Bakers & Patisserie"], specialities: ["Wedding", "Eggless"] });
    const head = buildBusinessHead(business, URL);
    expect(head.meta.find((m) => m.name === "keywords")?.content).toBe("Bakers & Patisserie, Wedding, Eggless");
    expect(jsonLd(head, "LocalBusiness")?.knowsAbout).toEqual(["Bakers & Patisserie", "Wedding", "Eggless"]);
  });

  it("omits the keywords meta tag when there are no categories or specialities", () => {
    const business = makeBusiness({ categories: [], specialities: [] });
    const head = buildBusinessHead(business, URL);
    expect(head.meta.find((m) => m.name === "keywords")).toBeUndefined();
  });

  it("prefers a visible custom-text section's own copy over the description column", () => {
    const business = makeBusiness({
      description: "The flat description column.",
      sections: [section({ type: "custom-text", content: { heading: "Fresh daily", body: "Baked to order." } })],
    });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("Fresh daily. Baked to order.");
  });

  it("ignores an invisible custom-text section and falls back to the description column", () => {
    const business = makeBusiness({
      description: "The flat description column.",
      sections: [section({ type: "custom-text", visible: false, content: { heading: "Hidden", body: "Nope." } })],
    });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("The flat description column.");
  });

  it("uses whichever own-text section appears first in section order", () => {
    const business = makeBusiness({
      sections: [
        section({ type: "promo-banner", content: { heading: "20% off this week" } }),
        section({ type: "custom-text", content: { heading: "About us", body: "Est. 2020." } }),
      ],
    });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("20% off this week");
  });

  it("appends a services summary when it fits within the snippet budget", () => {
    const business = makeBusiness({
      description: "Custom cakes.",
      sections: [section({ type: "services", content: {} })],
      services: [makeService({ name: "Birthday cakes" }), makeService({ name: "Wedding cakes" }), makeService({ name: "Cupcakes" })],
    });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("Custom cakes. Services: Birthday cakes, Wedding cakes, Cupcakes.");
  });

  it("caps the services summary at 4 names even if more are listed", () => {
    const business = makeBusiness({
      description: "Custom cakes.",
      sections: [section({ type: "services", content: {} })],
      services: ["A", "B", "C", "D", "E"].map((name) => makeService({ name })),
    });
    const head = buildBusinessHead(business, URL);
    expect(metaDescription(head)).toBe("Custom cakes. Services: A, B, C, D.");
  });

  it("truncates a long description at a word boundary with an ellipsis, never mid-word", () => {
    const longDescription =
      "We are a family-run bakery specializing in custom celebration cakes, artisan breads, and " +
      "delicate French pastries, proudly serving weddings, birthdays, and corporate events across the city.";
    const business = makeBusiness({ description: longDescription });
    const head = buildBusinessHead(business, URL);
    const desc = metaDescription(head)!;
    expect(desc.length).toBeLessThanOrEqual(156); // 155 + the ellipsis character
    expect(desc.endsWith("…")).toBe(true);
    expect(desc.endsWith(" …")).toBe(false); // no trailing space before the ellipsis
    expect(longDescription.startsWith(desc.slice(0, -1))).toBe(true); // cut, not rewritten
  });

  it("includes og:image and twitter:image only when a hero image is set", () => {
    const withImage = buildBusinessHead(makeBusiness({ hero_image_url: "https://x/img.jpg" }), URL);
    expect(withImage.meta.find((m) => m.property === "og:image")?.content).toBe("https://x/img.jpg");
    expect(withImage.meta.find((m) => m.name === "twitter:image")?.content).toBe("https://x/img.jpg");

    const withoutImage = buildBusinessHead(makeBusiness({ hero_image_url: null }), URL);
    expect(withoutImage.meta.find((m) => m.property === "og:image")).toBeUndefined();
  });

  it("sets the canonical link to the given url", () => {
    const head = buildBusinessHead(makeBusiness(), URL);
    expect(head.links).toEqual([{ rel: "canonical", href: URL }]);
  });

  describe("LocalBusiness JSON-LD", () => {
    it("omits aggregateRating when there are no reviews", () => {
      const head = buildBusinessHead(makeBusiness({ review_count: 0 }), URL);
      const ld = jsonLd(head, "LocalBusiness");
      expect(ld.aggregateRating).toBeUndefined();
    });

    it("includes aggregateRating when there's at least one review", () => {
      const head = buildBusinessHead(makeBusiness({ review_count: 4, review_avg: 4.5 }), URL);
      const ld = jsonLd(head, "LocalBusiness");
      expect(ld.aggregateRating).toEqual({
        "@type": "AggregateRating",
        ratingValue: 4.5,
        reviewCount: 4,
        bestRating: 5,
        worstRating: 1,
      });
    });

    it("includes openingHoursSpecification only when hours are fully set", () => {
      const withHours = buildBusinessHead(
        makeBusiness({ operating_hours: { start: "09:00", end: "18:00", days: [1, 2, 3] } }),
        URL,
      );
      expect(jsonLd(withHours, "LocalBusiness").openingHoursSpecification).toEqual({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday"],
        opens: "09:00",
        closes: "18:00",
      });

      const withoutHours = buildBusinessHead(makeBusiness({ operating_hours: null }), URL);
      expect(jsonLd(withoutHours, "LocalBusiness").openingHoursSpecification).toBeUndefined();
    });
  });

  describe("FAQPage JSON-LD", () => {
    it("is omitted entirely when there's no faq section", () => {
      const head = buildBusinessHead(makeBusiness(), URL);
      expect(jsonLd(head, "FAQPage")).toBeUndefined();
    });

    it("is omitted when the faq section is present but invisible", () => {
      const business = makeBusiness({
        sections: [section({ type: "faq", visible: false, content: { items: [{ q: "Q?", a: "A." }] } })],
      });
      const head = buildBusinessHead(business, URL);
      expect(jsonLd(head, "FAQPage")).toBeUndefined();
    });

    it("only includes entries that have both a question and an answer", () => {
      const business = makeBusiness({
        sections: [
          section({
            type: "faq",
            content: { items: [{ q: "Do you deliver?", a: "Yes." }, { q: "", a: "Orphan answer" }, { q: "No answer", a: "" }] },
          }),
        ],
      });
      const head = buildBusinessHead(business, URL);
      const ld = jsonLd(head, "FAQPage");
      expect(ld.mainEntity).toEqual([
        { "@type": "Question", name: "Do you deliver?", acceptedAnswer: { "@type": "Answer", text: "Yes." } },
      ]);
    });
  });
});

describe("toProfileBusiness", () => {
  it("defaults nullable array-ish fields to empty arrays instead of null/undefined", () => {
    const business = makeBusiness({
      categories: null as unknown as string[],
      business_types: null as unknown as string[],
      gallery_urls: null as unknown as string[],
      short_video_urls: null as unknown as string[],
      locations: null as unknown as Business["locations"],
      delivery_areas: null as unknown as Business["delivery_areas"],
      items: null as unknown as Business["items"],
      staff: null as unknown as Business["staff"],
      reviews: null as unknown as Business["reviews"],
    });
    const profile = toProfileBusiness(business);
    expect(profile.categories).toEqual([]);
    expect(profile.business_types).toEqual([]);
    expect(profile.gallery_urls).toEqual([]);
    expect(profile.short_video_urls).toEqual([]);
    expect(profile.locations).toEqual([]);
    expect(profile.delivery_areas).toEqual([]);
    expect(profile.items).toEqual([]);
    expect(profile.staff).toEqual([]);
    expect(profile.reviews).toEqual([]);
  });

  it("defaults template to 'editorial' when unset", () => {
    const profile = toProfileBusiness(makeBusiness({ template: null }));
    expect(profile.template).toBe("editorial");
  });

  it("passes through scalar fields unchanged", () => {
    const business = makeBusiness({ name: "Test Biz", whatsapp: "+911234567890", is_eco_friendly: true });
    const profile = toProfileBusiness(business);
    expect(profile.name).toBe("Test Biz");
    expect(profile.whatsapp).toBe("+911234567890");
    expect(profile.is_eco_friendly).toBe(true);
  });
});
