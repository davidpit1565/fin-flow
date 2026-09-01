import { describe, expect, test } from "bun:test";
import { goalProgressPercent, projectedGoalCompletion } from "../src/lib/calc";
import { goal, installGlobals } from "./helpers";

installGlobals("en-US");

describe("goalProgressPercent", () => {
  test("computes a plain percentage", () => {
    expect(goalProgressPercent(goal({ currentCents: 5000, targetCents: 10000 }))).toBe(50);
  });

  test("caps at 100 when saved more than the target", () => {
    expect(goalProgressPercent(goal({ currentCents: 15000, targetCents: 10000 }))).toBe(100);
  });

  test("is 0 with no progress", () => {
    expect(goalProgressPercent(goal({ currentCents: 0, targetCents: 10000 }))).toBe(0);
  });

  test("guards against a zero or negative target instead of dividing by zero", () => {
    expect(goalProgressPercent(goal({ currentCents: 500, targetCents: 0 }))).toBe(0);
    expect(goalProgressPercent(goal({ currentCents: 500, targetCents: -100 }))).toBe(0);
  });
});

describe("projectedGoalCompletion", () => {
  test("projects forward linearly from the saving rate since creation", () => {
    const createdAt = new Date(2026, 0, 1).getTime(); // 2026-01-01
    const g = goal({ createdAt, currentCents: 1000, targetCents: 3000 });
    // 10 days elapsed, 1000 cents saved -> 100 cents/day; 2000 cents remaining -> 20 more days.
    expect(projectedGoalCompletion(g, "2026-01-11")).toBe("2026-01-31");
  });

  test("returns null when there's been no progress yet", () => {
    const createdAt = new Date(2026, 0, 1).getTime();
    const g = goal({ createdAt, currentCents: 0, targetCents: 3000 });
    expect(projectedGoalCompletion(g, "2026-01-11")).toBeNull();
  });

  test("returns null once the goal is already met", () => {
    const createdAt = new Date(2026, 0, 1).getTime();
    const g = goal({ createdAt, currentCents: 3000, targetCents: 3000 });
    expect(projectedGoalCompletion(g, "2026-01-11")).toBeNull();

    const overshot = goal({ createdAt, currentCents: 4000, targetCents: 3000 });
    expect(projectedGoalCompletion(overshot, "2026-01-11")).toBeNull();
  });

  test("returns null for a zero or negative target", () => {
    const createdAt = new Date(2026, 0, 1).getTime();
    expect(projectedGoalCompletion(goal({ createdAt, currentCents: 500, targetCents: 0 }), "2026-01-11")).toBeNull();
    expect(projectedGoalCompletion(goal({ createdAt, currentCents: 500, targetCents: -100 }), "2026-01-11")).toBeNull();
  });

  test("returns null when essentially no time has elapsed since creation", () => {
    const createdAt = new Date(2026, 0, 1).getTime();
    const g = goal({ createdAt, currentCents: 500, targetCents: 3000 });
    // Same day as creation -- no elapsed days to compute a rate from.
    expect(projectedGoalCompletion(g, "2026-01-01")).toBeNull();
  });
});
