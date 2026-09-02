import { describe, expect, it } from "vitest";
import { getUsernameLocalError, normalizeUsername } from "./username";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Alora  ")).toBe("alora");
    expect(normalizeUsername("ALORA")).toBe("alora");
  });
});

describe("getUsernameLocalError", () => {
  it("accepts a normal username", () => {
    expect(getUsernameLocalError("alora")).toBeNull();
    expect(getUsernameLocalError("alora-gifts-2")).toBeNull();
  });

  it("is case-insensitive — Alora, alora and ALORA are all valid the same way", () => {
    expect(getUsernameLocalError("Alora")).toBeNull();
    expect(getUsernameLocalError("ALORA")).toBeNull();
  });

  it("requires a value", () => {
    expect(getUsernameLocalError("")).toBeTruthy();
    expect(getUsernameLocalError("   ")).toBeTruthy();
  });

  it("rejects spaces", () => {
    expect(getUsernameLocalError("al ora")).toBeTruthy();
  });

  it("enforces the 3-30 length range", () => {
    expect(getUsernameLocalError("ab")).toBeTruthy();
    expect(getUsernameLocalError("abc")).toBeNull();
    expect(getUsernameLocalError("a".repeat(30))).toBeNull();
    expect(getUsernameLocalError("a".repeat(31))).toBeTruthy();
  });

  it("rejects a leading or trailing hyphen", () => {
    expect(getUsernameLocalError("-alora")).toBeTruthy();
    expect(getUsernameLocalError("alora-")).toBeTruthy();
  });

  it("rejects consecutive hyphens", () => {
    expect(getUsernameLocalError("alora--gifts")).toBeTruthy();
  });

  it("rejects characters outside letters, numbers and hyphens", () => {
    expect(getUsernameLocalError("alora_gifts")).toBeTruthy();
    expect(getUsernameLocalError("alora.gifts")).toBeTruthy();
    expect(getUsernameLocalError("alora!")).toBeTruthy();
  });

  it("rejects reserved system names", () => {
    expect(getUsernameLocalError("admin")).toBeTruthy();
    expect(getUsernameLocalError("www")).toBeTruthy();
    expect(getUsernameLocalError("login")).toBeTruthy();
    expect(getUsernameLocalError("settings")).toBeTruthy();
  });
});
