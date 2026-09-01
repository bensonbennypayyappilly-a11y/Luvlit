import { describe, expect, it } from "vitest";
import {
  hasErrors,
  validateBusinessName,
  validateCatalogueName,
  validateDuration,
  validateEmail,
  validateFutureDate,
  validatePhone,
  validatePrice,
  validateUrl,
} from "./website-validation";

describe("validateBusinessName", () => {
  it("requires a name", () => {
    expect(validateBusinessName("")).toBeTruthy();
    expect(validateBusinessName("   ")).toBeTruthy();
  });

  it("accepts a normal name", () => {
    expect(validateBusinessName("Priya's Cakes")).toBeNull();
  });

  it("rejects an absurdly long name", () => {
    expect(validateBusinessName("a".repeat(121))).toBeTruthy();
  });
});

describe("validateEmail", () => {
  it("treats blank as valid, since the field is optional", () => {
    expect(validateEmail("")).toBeNull();
    expect(validateEmail(null)).toBeNull();
  });

  it("accepts a normal address", () => {
    expect(validateEmail("hello@luvlit.in")).toBeNull();
  });

  it.each(["hello", "hello@", "@luvlit.in", "hello@luvlit", "a b@c.in"])("rejects %s", (bad) => {
    expect(validateEmail(bad)).toBeTruthy();
  });
});

describe("validatePhone", () => {
  it("treats blank as valid, since the field is optional", () => {
    expect(validatePhone("")).toBeNull();
    expect(validatePhone(null)).toBeNull();
  });

  it("accepts the many ways an Indian number is written", () => {
    expect(validatePhone("9876543210")).toBeNull();
    expect(validatePhone("+91 98765 43210")).toBeNull();
    expect(validatePhone("+91-98765-43210")).toBeNull();
    expect(validatePhone("(091) 9876543210")).toBeNull();
  });

  it("rejects letters and too-short numbers", () => {
    expect(validatePhone("call me")).toBeTruthy();
    expect(validatePhone("98765")).toBeTruthy();
  });

  it("rejects an implausibly long number", () => {
    expect(validatePhone("1234567890123456")).toBeTruthy();
  });
});

describe("validateUrl", () => {
  it("treats blank as valid", () => {
    expect(validateUrl("")).toBeNull();
  });

  it("accepts a full https link", () => {
    expect(validateUrl("https://instagram.com/luvlit")).toBeNull();
  });

  it("rejects a bare handle or domain-less string", () => {
    expect(validateUrl("@luvlit")).toBeTruthy();
    expect(validateUrl("instagram.com/luvlit")).toBeTruthy();
  });
});

describe("validateCatalogueName", () => {
  it("names the thing being added in the error", () => {
    expect(validateCatalogueName("", "product")).toContain("product");
    expect(validateCatalogueName("", "service")).toContain("service");
  });

  it("accepts a real name", () => {
    expect(validateCatalogueName("Chocolate truffle cake", "product")).toBeNull();
  });
});

describe("validatePrice", () => {
  it("allows blank — pricing is genuinely optional", () => {
    expect(validatePrice(null)).toBeNull();
    expect(validatePrice("")).toBeNull();
    expect(validatePrice(undefined)).toBeNull();
  });

  it("allows zero and normal amounts", () => {
    expect(validatePrice(0)).toBeNull();
    expect(validatePrice(1499)).toBeNull();
    expect(validatePrice("899")).toBeNull();
  });

  it("rejects negatives and non-numbers", () => {
    expect(validatePrice(-1)).toBeTruthy();
    expect(validatePrice("abc")).toBeTruthy();
  });

  it("rejects an implausible amount", () => {
    expect(validatePrice(50_000_000)).toBeTruthy();
  });
});

describe("validateDuration", () => {
  it("requires a duration", () => {
    expect(validateDuration(null)).toBeTruthy();
    expect(validateDuration(undefined)).toBeTruthy();
  });

  it("rejects zero and negative durations", () => {
    expect(validateDuration(0)).toBeTruthy();
    expect(validateDuration(-30)).toBeTruthy();
  });

  it("accepts normal appointment lengths", () => {
    expect(validateDuration(15)).toBeNull();
    expect(validateDuration(90)).toBeNull();
  });

  it("rejects something longer than a working day", () => {
    expect(validateDuration(9 * 60)).toBeTruthy();
  });
});

describe("validateFutureDate", () => {
  const today = "2026-09-01";

  it("rejects a past date", () => {
    expect(validateFutureDate("2026-08-31", today)).toBeTruthy();
  });

  it("accepts today and future dates", () => {
    expect(validateFutureDate(today, today)).toBeNull();
    expect(validateFutureDate("2026-12-25", today)).toBeNull();
  });

  it("rejects a blank or malformed date", () => {
    expect(validateFutureDate("", today)).toBeTruthy();
    expect(validateFutureDate("01/09/2026", today)).toBeTruthy();
  });
});

describe("hasErrors", () => {
  it("is false when every field is clean", () => {
    expect(hasErrors({ name: null, email: null })).toBe(false);
  });

  it("is true when any field has a message", () => {
    expect(hasErrors({ name: null, email: "bad" })).toBe(true);
  });
});
