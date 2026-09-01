import { describe, expect, it } from "vitest";
import { isOpenNow, matchCategoriesForQuery } from "./search-helpers";
import type { OperatingHours } from "@/lib/public.types";

/** Builds a local Date at a given hour/minute on "today", so the resulting `getDay()` always
 * matches whatever day the test machine currently thinks it is — tests then derive `days`
 * arrays from that same value instead of hardcoding a day-of-week number. */
function todayAt(hour: number, minute: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
}

describe("isOpenNow", () => {
  it("returns null when hours is null", () => {
    expect(isOpenNow(null, todayAt(12, 0))).toBeNull();
  });

  it("returns null when start is missing", () => {
    const hours = { start: "", end: "18:00", days: [0, 1, 2, 3, 4, 5, 6] } as OperatingHours;
    expect(isOpenNow(hours, todayAt(12, 0))).toBeNull();
  });

  it("returns null when end is missing", () => {
    const hours = { start: "09:00", end: "", days: [0, 1, 2, 3, 4, 5, 6] } as OperatingHours;
    expect(isOpenNow(hours, todayAt(12, 0))).toBeNull();
  });

  it("returns null when days is empty", () => {
    const hours: OperatingHours = { start: "09:00", end: "18:00", days: [] };
    expect(isOpenNow(hours, todayAt(12, 0))).toBeNull();
  });

  describe("same-day hours (start <= end)", () => {
    it("is open in the middle of the window on a listed day", () => {
      const now = todayAt(12, 0);
      const hours: OperatingHours = { start: "09:00", end: "18:00", days: [now.getDay()] };
      expect(isOpenNow(hours, now)).toBe(true);
    });

    it("is closed before the window starts", () => {
      const now = todayAt(8, 59);
      const hours: OperatingHours = { start: "09:00", end: "18:00", days: [now.getDay()] };
      expect(isOpenNow(hours, now)).toBe(false);
    });

    it("is open at the exact start boundary (inclusive)", () => {
      const now = todayAt(9, 0);
      const hours: OperatingHours = { start: "09:00", end: "18:00", days: [now.getDay()] };
      expect(isOpenNow(hours, now)).toBe(true);
    });

    it("is closed at the exact end boundary (exclusive)", () => {
      const now = todayAt(18, 0);
      const hours: OperatingHours = { start: "09:00", end: "18:00", days: [now.getDay()] };
      expect(isOpenNow(hours, now)).toBe(false);
    });

    it("is closed one minute before the end boundary is still open", () => {
      const now = todayAt(17, 59);
      const hours: OperatingHours = { start: "09:00", end: "18:00", days: [now.getDay()] };
      expect(isOpenNow(hours, now)).toBe(true);
    });

    it("is closed on a day not listed even during the window", () => {
      const now = todayAt(12, 0);
      const otherDay = (now.getDay() + 1) % 7;
      const hours: OperatingHours = { start: "09:00", end: "18:00", days: [otherDay] };
      expect(isOpenNow(hours, now)).toBe(false);
    });
  });

  describe("overnight hours (start > end, e.g. 20:00-02:00)", () => {
    it("is open right after the start, before midnight, on a listed day", () => {
      const now = todayAt(23, 0);
      const hours: OperatingHours = { start: "20:00", end: "02:00", days: [now.getDay()] };
      expect(isOpenNow(hours, now)).toBe(true);
    });

    it("is open exactly at the start boundary", () => {
      const now = todayAt(20, 0);
      const hours: OperatingHours = { start: "20:00", end: "02:00", days: [now.getDay()] };
      expect(isOpenNow(hours, now)).toBe(true);
    });

    it("is open after midnight, before end, even though today itself isn't listed (the shift started yesterday)", () => {
      const now = todayAt(1, 0);
      const yesterday = (now.getDay() + 6) % 7;
      const hours: OperatingHours = { start: "20:00", end: "02:00", days: [yesterday] };
      expect(isOpenNow(hours, now)).toBe(true);
    });

    it("is closed after midnight once the end boundary is reached (exclusive)", () => {
      const now = todayAt(2, 0);
      const yesterday = (now.getDay() + 6) % 7;
      const hours: OperatingHours = { start: "20:00", end: "02:00", days: [yesterday] };
      expect(isOpenNow(hours, now)).toBe(false);
    });

    it("is open one minute before the overnight end boundary", () => {
      const now = todayAt(1, 59);
      const yesterday = (now.getDay() + 6) % 7;
      const hours: OperatingHours = { start: "20:00", end: "02:00", days: [yesterday] };
      expect(isOpenNow(hours, now)).toBe(true);
    });

    it("is closed during the daytime gap between end and start", () => {
      const now = todayAt(12, 0);
      const hours: OperatingHours = { start: "20:00", end: "02:00", days: [now.getDay(), (now.getDay() + 6) % 7] };
      expect(isOpenNow(hours, now)).toBe(false);
    });

    it("is closed after midnight if yesterday isn't listed and today hasn't reached start yet", () => {
      const now = todayAt(1, 0);
      const hours: OperatingHours = { start: "20:00", end: "02:00", days: [now.getDay()] };
      // `days` lists *today*, but the overnight shift that would cover 1am must have started
      // yesterday — today being listed only matters for tonight's 20:00 start, not this morning.
      expect(isOpenNow(hours, now)).toBe(false);
    });
  });
});

describe("matchCategoriesForQuery", () => {
  it("returns an empty array for an empty query", () => {
    expect(matchCategoriesForQuery("")).toEqual([]);
  });

  it("returns an empty array for a whitespace-only query", () => {
    expect(matchCategoriesForQuery("   ")).toEqual([]);
  });

  it("matches a category via a multi-word keyword phrase", () => {
    expect(matchCategoriesForQuery("wedding photographer")).toEqual(["Photography"]);
  });

  it("is case-insensitive", () => {
    expect(matchCategoriesForQuery("PHOTOGRAPHER")).toEqual(["Photography"]);
  });

  it("matches when the query is a substring of a keyword (keyword.includes(query))", () => {
    // "sal" is a substring of the "salon" keyword.
    expect(matchCategoriesForQuery("sal")).toContain("Salons & Spa");
  });

  it("matches a single-word keyword", () => {
    expect(matchCategoriesForQuery("cake")).toEqual(["Bakers & Patisserie"]);
  });

  it("can match multiple categories at once", () => {
    // "repair" only appears under Services & Repair; sanity check it doesn't over-match.
    const result = matchCategoriesForQuery("repair");
    expect(result).toEqual(["Services & Repair"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(matchCategoriesForQuery("xyzzyplugh")).toEqual([]);
  });

  it("trims surrounding whitespace before matching", () => {
    expect(matchCategoriesForQuery("  cake  ")).toEqual(["Bakers & Patisserie"]);
  });
});
