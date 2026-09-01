import { describe, expect, it } from "vitest";
import { isReservedSlug, RESERVED_SLUGS } from "./reserved-slugs";

describe("isReservedSlug", () => {
  it("flags explicitly reserved infra names", () => {
    expect(isReservedSlug("www")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("admin")).toBe(true);
  });

  it("flags names that shadow top-level app routes", () => {
    expect(isReservedSlug("browse")).toBe(true);
    expect(isReservedSlug("business")).toBe(true);
    expect(isReservedSlug("pricing")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isReservedSlug("WWW")).toBe(true);
    expect(isReservedSlug("Admin")).toBe(true);
    expect(isReservedSlug("BROWSE")).toBe(true);
  });

  it("does not flag an ordinary business slug", () => {
    expect(isReservedSlug("priyas-cake-bakes")).toBe(false);
    expect(isReservedSlug("my-shop")).toBe(false);
  });

  it("does not flag an empty string", () => {
    expect(isReservedSlug("")).toBe(false);
  });

  it("every entry in the list is itself reported as reserved", () => {
    for (const slug of RESERVED_SLUGS) {
      expect(isReservedSlug(slug)).toBe(true);
    }
  });

  it("does not do partial/substring matching", () => {
    // "www2" is not literally "www", so it should not be reserved.
    expect(isReservedSlug("www2")).toBe(false);
    expect(isReservedSlug("myapi")).toBe(false);
  });
});
