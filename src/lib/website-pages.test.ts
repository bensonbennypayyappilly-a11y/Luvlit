import { describe, expect, it } from "vitest";
import { buildDefaultSections } from "./website-sections";
import { deriveSitePages, pagesForEditing } from "./website-pages";
import type { SitePageRecord } from "./public.types";

function input() {
  const business_types = ["product", "appointment"];
  const items = [{ id: "i1", slug: "i1", name: "Item", description: null, price: null, image_url: null, category: null, is_active: true }];
  const services = [
    { id: "s1", slug: "s1", name: "Service", description: null, price: null, duration_minutes: 30, category: null, image_url: null, is_active: true },
  ];
  const sections = buildDefaultSections({ business_types, items: { length: items.length }, services: { length: services.length } });
  return { sections, business_types, items, services };
}

const FULL_DEFAULT_ORDER = ["home", "about", "products", "services", "gallery", "appointments", "contact"];

describe("deriveSitePages", () => {
  it("returns the content-gated default order when there are no overrides", () => {
    const pages = deriveSitePages(input());
    expect(pages.map((p) => p.id)).toEqual(FULL_DEFAULT_ORDER);
  });

  it("reorders pages per the owner's overrides, appending everything unmentioned after", () => {
    const overrides: SitePageRecord[] = [
      { id: "services", slug: "services", label: "Services", type: "services", visible: true, showInNav: true },
      { id: "home", slug: "home", label: "Home", type: "home", visible: true, showInNav: true },
    ];
    const pages = deriveSitePages(input(), overrides);
    expect(pages.map((p) => p.id)).toEqual(["services", "home", "about", "products", "gallery", "appointments", "contact"]);
  });

  it("drops a page the owner explicitly hid, even though it has content", () => {
    const overrides: SitePageRecord[] = [
      { id: "products", slug: "products", label: "Products", type: "products", visible: false, showInNav: false },
    ];
    const pages = deriveSitePages(input(), overrides);
    expect(pages.some((p) => p.id === "products")).toBe(false);
  });

  it("applies a custom nav label", () => {
    const overrides: SitePageRecord[] = [
      { id: "services", slug: "services", label: "What we offer", type: "services", visible: true, showInNav: true },
    ];
    const pages = deriveSitePages(input(), overrides);
    expect(pages.find((p) => p.id === "services")?.label).toBe("What we offer");
  });

  it("still surfaces a page that only just became available, appended after the owner's arranged pages", () => {
    // The owner only ever arranged "contact" to the front — every other candidate page (never
    // mentioned in overrides, as if it appeared after they last touched Pages) still shows up.
    const overrides: SitePageRecord[] = [
      { id: "contact", slug: "contact", label: "Contact", type: "contact", visible: true, showInNav: true },
    ];
    const pages = deriveSitePages(input(), overrides);
    expect(pages.map((p) => p.id)).toEqual(["contact", "home", "about", "products", "services", "gallery", "appointments"]);
  });
});

describe("pagesForEditing", () => {
  it("includes hidden pages (unlike deriveSitePages) so they stay editable", () => {
    const overrides: SitePageRecord[] = [
      { id: "products", slug: "products", label: "Products", type: "products", visible: false, showInNav: false },
    ];
    const editing = pagesForEditing(input(), overrides);
    const products = editing.find((p) => p.id === "products");
    expect(products).toBeDefined();
    expect(products?.visible).toBe(false);
  });

  it("marks every page visible by default when there are no overrides", () => {
    const editing = pagesForEditing(input(), []);
    expect(editing.every((p) => p.visible)).toBe(true);
  });
});
