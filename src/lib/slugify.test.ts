import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases the input", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("collapses a run of non-alphanumeric characters into a single hyphen", () => {
    expect(slugify("Hello   World")).toBe("hello-world");
    expect(slugify("Hello!!!World")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
    expect(slugify("---Hello World---")).toBe("hello-world");
  });

  it("keeps digits", () => {
    expect(slugify("Studio 54")).toBe("studio-54");
  });

  it("falls back to 'business' when nothing alphanumeric survives", () => {
    expect(slugify("")).toBe("business");
    expect(slugify("!!!")).toBe("business");
    expect(slugify("   ")).toBe("business");
    expect(slugify("---")).toBe("business");
  });

  it("strips characters outside [a-z0-9] even when they're letters (accents), matching the SQL backfill's ASCII-only behavior", () => {
    // Matches the algorithm the SQL migration uses — non-ASCII letters are not preserved.
    expect(slugify("Café")).toBe("caf");
  });

  it("produces a real-world business-name slug", () => {
    expect(slugify("Priya's Cake & Bakes Co.")).toBe("priya-s-cake-bakes-co");
  });
});
