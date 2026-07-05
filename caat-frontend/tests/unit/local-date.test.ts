import { parseLocalDate, todayKey } from "@/lib/local-date";
import { describe, it, expect } from "vitest";

describe("parseLocalDate", () => {
  it("parses a date-only string at local midnight, not UTC", () => {
    const d = parseLocalDate("2026-03-23");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // March
    expect(d.getDate()).toBe(23); // never 22 due to UTC shift
  });
});

describe("todayKey", () => {
  it("formats a Date as local YYYY-MM-DD", () => {
    // A local time late in the day must not roll to the next UTC day.
    const d = new Date(2026, 0, 5, 23, 30); // 5 Jan 2026, 23:30 local
    expect(todayKey(d)).toBe("2026-01-05");
  });

  it("zero-pads month and day", () => {
    const d = new Date(2026, 8, 3, 9, 0); // 3 Sep 2026
    expect(todayKey(d)).toBe("2026-09-03");
  });
});
