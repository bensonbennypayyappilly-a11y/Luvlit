import { describe, expect, it } from "vitest";
import { buildDefaultSections, NON_DELETABLE, newSection } from "./website-sections";

describe("buildDefaultSections", () => {
  it("builds the default section set for a plain business with no products/appointments/gallery", () => {
    const sections = buildDefaultSections({});
    const types = sections.map((s) => s.type);
    expect(types).toEqual(["hero", "about", "services", "gallery", "location", "quote", "contact"]);
  });

  it("uses a services section (not products) when there's no product business type and no items", () => {
    const sections = buildDefaultSections({ business_types: ["appointment"], items: { length: 0 } });
    expect(sections.some((s) => s.type === "services")).toBe(true);
    expect(sections.some((s) => s.type === "products")).toBe(false);
  });

  it("uses a products section when business_types includes 'product'", () => {
    const sections = buildDefaultSections({ business_types: ["product"] });
    expect(sections.some((s) => s.type === "products")).toBe(true);
    expect(sections.some((s) => s.type === "services")).toBe(false);
  });

  it("uses a products section when the business already has items, regardless of business_types", () => {
    const sections = buildDefaultSections({ business_types: [], items: { length: 3 } });
    expect(sections.some((s) => s.type === "products")).toBe(true);
    expect(sections.some((s) => s.type === "services")).toBe(false);
  });

  it("adds a booking section only when business_types includes 'appointment'", () => {
    const withAppointment = buildDefaultSections({ business_types: ["appointment"] });
    expect(withAppointment.some((s) => s.type === "booking")).toBe(true);

    const without = buildDefaultSections({ business_types: ["product"] });
    expect(without.some((s) => s.type === "booking")).toBe(false);
  });

  it("always includes the core hero/contact/quote sections, all visible", () => {
    const sections = buildDefaultSections({});
    for (const type of NON_DELETABLE) {
      const section = sections.find((s) => s.type === type);
      expect(section).toBeDefined();
      expect(section?.visible).toBe(true);
    }
  });

  it("gives every section a unique id", () => {
    const sections = buildDefaultSections({ business_types: ["product", "appointment"] });
    const ids = sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adds a services section with no content — services render from the real services table", () => {
    const sections = buildDefaultSections({});
    const services = sections.find((s) => s.type === "services");
    expect(services?.content).toEqual({});
  });

  it("treats a missing business_types/items as equivalent to empty (no throw, sensible defaults)", () => {
    expect(() => buildDefaultSections({ business_types: null, items: null })).not.toThrow();
    const sections = buildDefaultSections({ business_types: null, items: null });
    expect(sections.some((s) => s.type === "services")).toBe(true);
  });
});

describe("newSection", () => {
  it("gives a faq section an empty items array by default", () => {
    expect(newSection("faq").content).toEqual({ items: [] });
  });

  it("gives a plain section (e.g. gallery) empty content by default", () => {
    const section = newSection("gallery");
    expect(section.content).toEqual({});
    expect(section.visible).toBe(true);
    expect(section.type).toBe("gallery");
  });

  it("gives each call a fresh unique id", () => {
    const a = newSection("faq");
    const b = newSection("faq");
    expect(a.id).not.toBe(b.id);
  });
});
