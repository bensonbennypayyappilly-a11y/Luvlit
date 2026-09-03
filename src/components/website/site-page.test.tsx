import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BusinessSitePage } from "./site-page";
import { TEMPLATE_LIST } from "@/lib/website-templates";
import { buildDefaultSections, newSection, type Section } from "@/lib/website-sections";
import { deriveSitePages, type PageId } from "@/lib/website-pages";
import type { SiteBusiness } from "@/lib/website-site-types";

// The site renderer is deliberately server-renderable: no effects run during renderToStaticMarkup,
// so signed-URL resolution and the booking widget's fetch never fire. Only the router hooks need
// standing in for, since they read context that doesn't exist outside a RouterProvider.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: React.ReactNode; to?: string }) => <a href={to}>{children}</a>,
  useNavigate: () => () => {},
  useRouterState: () => "/",
  useRouter: () => ({ navigate: () => {} }),
}));

function render(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** A business with something in every field, so each section type has real content to render. */
function makeBusiness(overrides: Partial<SiteBusiness> = {}): SiteBusiness {
  const base: SiteBusiness = {
    id: "biz-1",
    name: "Priya's Cakes",
    description: "Small-batch celebration cakes, baked to order in Jaipur.",
    tagline: null,
    categories: ["Bakers & Patisserie"],
    specialities: [],
    business_types: ["product", "appointment"],
    instagram_url: "https://instagram.com/priyascakes",
    whatsapp: "+91 98765 43210",
    phone: null,
    preferred_contact: null,
    contact_email: "hello@priyascakes.in",
    hero_image_url: "https://example.test/hero.jpg",
    about_image_url: null,
    about_text: "Small-batch celebration cakes, baked to order in Jaipur.",
    logo_url: "https://example.test/logo.png",
    gallery_urls: ["https://example.test/g1.jpg", "https://example.test/g2.jpg", "https://example.test/g3.jpg"],
    main_video_url: "https://youtu.be/abc123",
    short_video_urls: ["https://example.test/short.mp4"],
    brand_accent_color: "#9C5B44",
    brand_secondary_color: null,
    button_style: null,
    background_color: null,
    custom_domain: null,
    is_eco_friendly: true,
    operating_hours: { start: "10:00", end: "19:00", days: [1, 2, 3, 4, 5] },
    sections: [],
    pages: [],
    template: "editorial",
    corner_style: null,
    density: null,
    image_treatment: null,
    review_count: 2,
    review_avg: 4.5,
    reviews: [
      { id: "r1", rating: 5, comment: "Beautiful cake.", created_at: "2026-01-01" },
      { id: "r2", rating: 4, comment: null, created_at: "2026-01-02" },
    ],
    owner_email_verified: true,
    locations: [{ id: "l1", address: "12 MI Road", city: "Jaipur", state: "Rajasthan", is_primary: true }],
    delivery_areas: [{ id: "d1", city: "Jaipur", is_pan_india: false }],
    items: [
      { id: "i1", slug: "truffle-cake", name: "Truffle cake", description: "Dark chocolate", price: 1200, image_url: "https://example.test/i1.jpg", category: "Cakes", is_active: true },
    ],
    services: [
      { id: "s1", slug: "custom-cake-consult", name: "Custom cake consult", description: "Plan your cake", price: 500, duration_minutes: 30, category: null, image_url: null, is_active: true },
    ],
    staff: [{ id: "st1", name: "Priya", specializations: ["Bakers & Patisserie"], slot_duration_minutes: 30 }],
    ...overrides,
  };
  // Every section type visible, so one pass exercises the whole renderer rather than just the defaults.
  const everySection: Section[] = [
    ...buildDefaultSections({ business_types: base.business_types, items: { length: base.items.length } }),
    newSection("reviews"),
    newSection("faq"),
    newSection("team"),
    newSection("hours"),
    newSection("delivery-areas"),
    newSection("video"),
    newSection("social"),
    newSection("featured-products"),
    newSection("promo-banner"),
    newSection("custom-text"),
  ];
  return { ...base, sections: overrides.sections ?? everySection };
}

const ALL_PAGES: PageId[] = ["home", "about", "products", "services", "gallery", "appointments", "contact"];

describe("BusinessSitePage", () => {
  it.each(TEMPLATE_LIST.map((t) => t.id))("renders every page without crashing on the %s template", (template) => {
    const business = makeBusiness({ template });
    for (const page of ALL_PAGES) {
      const html = render(<BusinessSitePage business={business} page={page} />);
      expect(html).toContain("Priya&#x27;s Cakes");
    }
  });

  it("renders the nav from derived pages, with no link to a page the business doesn't have", () => {
    // No products, no services, no appointments -> those pages must not appear in the nav.
    const business = makeBusiness({ items: [], services: [], business_types: [], staff: [] });
    const html = render(<BusinessSitePage business={business} page="home" />);
    const pages = deriveSitePages({ ...business, sections: business.sections });
    const paths = pages.map((p) => p.path);

    expect(paths).not.toContain("/products");
    expect(paths).not.toContain("/services");
    expect(paths).not.toContain("/appointments");
    expect(html).not.toContain('href="/products"');
    expect(html).not.toContain('href="/services"');
    expect(html).not.toContain('href="/appointments"');
    // Home and Contact are always real pages.
    expect(html).toContain('href="/contact"');
  });

  it("omits an empty section entirely on the published site", () => {
    const business = makeBusiness({ items: [], services: [], gallery_urls: [] });
    const html = render(<BusinessSitePage business={business} page="home" />);
    expect(html).not.toContain("Only you can see this");
  });

  it("shows a placeholder for an empty section in preview mode instead of silently vanishing", () => {
    const business = makeBusiness({ items: [], services: [], gallery_urls: [] });
    const html = render(<BusinessSitePage business={business} page="home" preview />);
    expect(html).toContain("Only you can see this");
  });

  it("renders the same business content regardless of template — data is independent of presentation", () => {
    const business = makeBusiness();
    for (const t of TEMPLATE_LIST) {
      const html = render(<BusinessSitePage business={{ ...business, template: t.id }} page="products" />);
      expect(html).toContain("Truffle cake");
      expect(html).toContain("1200");
    }
  });

  it("falls back to generated default sections for a business that never opened the builder", () => {
    const business = makeBusiness({ sections: [] });
    const html = render(<BusinessSitePage business={business} page="home" />);
    expect(html).toContain("Priya&#x27;s Cakes");
  });

  it("renders a business with almost no content without crashing", () => {
    const bare = makeBusiness({
      description: null,
      hero_image_url: null,
      logo_url: null,
      gallery_urls: [],
      main_video_url: null,
      short_video_urls: [],
      instagram_url: null,
      whatsapp: null,
      contact_email: null,
      operating_hours: null,
      items: [],
      services: [],
      staff: [],
      reviews: [],
      review_count: 0,
      review_avg: null,
      locations: [],
      delivery_areas: [],
      business_types: [],
    });
    for (const page of ALL_PAGES) {
      expect(() => render(<BusinessSitePage business={bare} page={page} />)).not.toThrow();
    }
  });
});
