import { describe, expect, it } from "vitest";
import { istDateString, localDateString } from "./utils";

describe("localDateString", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(localDateString(new Date(2024, 0, 5))).toBe("2024-01-05");
  });

  it("pads single-digit months and days", () => {
    expect(localDateString(new Date(2024, 8, 3))).toBe("2024-09-03");
  });

  it("does not pad or wrap a two-digit month/day", () => {
    expect(localDateString(new Date(2024, 11, 25))).toBe("2024-12-25");
  });

  it("uses the local calendar date, not UTC — a late-evening local time stays on the same local day", () => {
    // 23:59 local time must format as that same local day, unlike `toISOString().slice(0,10)`
    // which would shift to the next day for any timezone behind UTC and could shift to the
    // previous day for timezones ahead of UTC depending on the exact offset.
    const date = new Date(2024, 5, 15, 23, 59, 59);
    expect(localDateString(date)).toBe("2024-06-15");
  });

  it("defaults to the current date and returns a well-formed YYYY-MM-DD string", () => {
    expect(localDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("istDateString", () => {
  it("formats a date as YYYY-MM-DD in IST", () => {
    // Noon UTC is 17:30 IST the same calendar day — no boundary crossing here.
    expect(istDateString(new Date("2024-01-15T12:00:00.000Z"))).toBe("2024-01-15");
  });

  it("shifts the date forward across the IST midnight boundary (IST = UTC+5:30)", () => {
    // IST midnight for 2024-01-05 is UTC 2024-01-04T18:30:00Z. One second before that instant,
    // it's still 2024-01-04 in IST; at that instant (and after), it's 2024-01-05 in IST.
    const justBeforeIstMidnight = new Date("2024-01-04T18:29:59.000Z");
    const exactlyIstMidnight = new Date("2024-01-04T18:30:00.000Z");

    expect(istDateString(justBeforeIstMidnight)).toBe("2024-01-04");
    expect(istDateString(exactlyIstMidnight)).toBe("2024-01-05");
  });

  it("reflects IST even when the UTC date has already rolled over to the next day", () => {
    // 2024-07-01T20:00:00Z is 2024-07-02T01:30 IST — UTC says July 1, IST says July 2.
    expect(istDateString(new Date("2024-07-01T20:00:00.000Z"))).toBe("2024-07-02");
  });

  it("reflects IST even when IST is still on the previous UTC day", () => {
    // 2024-03-10T02:00:00Z is 2024-03-10T07:30 IST — same UTC day here, but exercised alongside
    // the reverse case above to pin down the offset direction (+5:30, not -5:30).
    expect(istDateString(new Date("2024-03-10T02:00:00.000Z"))).toBe("2024-03-10");
  });

  it("defaults to the current date and returns a well-formed YYYY-MM-DD string", () => {
    expect(istDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
