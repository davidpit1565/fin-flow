import { describe, expect, test } from "bun:test";
import { addDays, addMonths, diffDays, relativeDay, sameMonth, toISO } from "../src/lib/dates";

describe("relativeDay", () => {
  const now = "2026-08-13";
  test("labels today, tomorrow, yesterday", () => {
    expect(relativeDay("2026-08-13", now)).toBe("Today");
    expect(relativeDay("2026-08-14", now)).toBe("Tomorrow");
    expect(relativeDay("2026-08-12", now)).toBe("Yesterday");
  });
  test("returns null for other days", () => {
    expect(relativeDay("2026-08-20", now)).toBeNull();
    expect(relativeDay("2026-07-13", now)).toBeNull();
  });
});

describe("addDays", () => {
  test("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("addMonths (month-end clamping)", () => {
  test("clamps to the last day of the target month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-31", 1)).toBe("2026-04-30");
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
  });
  test("handles leap years and multi-month spans", () => {
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-01-31", 12)).toBe("2027-01-31");
    expect(addMonths("2026-05-31", 3)).toBe("2026-08-31");
  });
});

describe("diffDays and sameMonth", () => {
  test("diffDays counts calendar days", () => {
    expect(diffDays("2026-08-01", "2026-08-13")).toBe(12);
  });
  test("sameMonth matches calendar month", () => {
    expect(sameMonth("2026-08-01", "2026-08-31")).toBe(true);
    expect(sameMonth("2026-08-31", "2026-09-01")).toBe(false);
  });
});

describe("toISO", () => {
  test("round-trips local dates", () => {
    expect(toISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
