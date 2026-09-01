import { describe, expect, test } from "bun:test";
import {
  computeFinancialHealthScore,
  detectSpendingAnomalies,
  detectUnusedSubscriptions,
  generateMonthlyNarrative,
} from "../src/lib/insights";
import { insights } from "../src/lib/i18n/en/insights";
import { cat, installGlobals, sub, txn } from "./helpers";

installGlobals("en-US");

const narrativeDictionary = { ...insights, categoryDisplayName: (c: { name: string }) => c.name };

describe("detectUnusedSubscriptions", () => {
  test("flags active rarely/unused subs, excludes regular/paused/cancelled, sorts by savings desc", () => {
    const subs = [
      sub({ id: "regular", usage: "regular", amountCents: 5000, frequency: "monthly" }),
      sub({ id: "unused-small", usage: "unused", amountCents: 500, frequency: "monthly" }),
      sub({ id: "rarely-big", usage: "rarely", amountCents: 12000, frequency: "yearly" }), // 1000/mo
      sub({ id: "unused-paused", usage: "unused", status: "paused", amountCents: 9999, frequency: "monthly" }),
      sub({ id: "unused-cancelled", usage: "unused", status: "cancelled", amountCents: 9999, frequency: "monthly" }),
    ];
    const result = detectUnusedSubscriptions(subs);
    expect(result.map((r) => r.subscription.id)).toEqual(["rarely-big", "unused-small"]);
    expect(result[0].potentialSavingsCents).toBe(1000);
    expect(result[1].potentialSavingsCents).toBe(500);
  });

  test("empty when there are no subscriptions or none are unused/rarely", () => {
    expect(detectUnusedSubscriptions([])).toEqual([]);
    expect(detectUnusedSubscriptions([sub({ usage: "regular" })])).toEqual([]);
  });
});

describe("detectSpendingAnomalies", () => {
  const cats = [cat("food", "Food"), cat("travel", "Travel"), cat("new", "New category")];
  const now = "2026-08-15";

  test("flags a category that spiked more than 30% over its trailing 3-month average", () => {
    const txns = [
      // trailing 3 full months (May, June, July): steady ~3000/mo in Food
      txn({ amountCents: 3000, categoryId: "food", date: "2026-05-10" }),
      txn({ amountCents: 3000, categoryId: "food", date: "2026-06-10" }),
      txn({ amountCents: 3000, categoryId: "food", date: "2026-07-10" }),
      // this month: spiked to 6000 (+100%)
      txn({ amountCents: 6000, categoryId: "food", date: "2026-08-05" }),
    ];
    const anomalies = detectSpendingAnomalies(txns, cats, now);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].category.id).toBe("food");
    expect(anomalies[0].currentMonthCents).toBe(6000);
    expect(anomalies[0].averagePriorMonthsCents).toBe(3000);
    expect(anomalies[0].percentIncrease).toBe(100);
  });

  test("does not flag an increase at or below the 30% threshold", () => {
    const txns = [
      txn({ amountCents: 10000, categoryId: "food", date: "2026-05-10" }),
      txn({ amountCents: 10000, categoryId: "food", date: "2026-06-10" }),
      txn({ amountCents: 10000, categoryId: "food", date: "2026-07-10" }),
      txn({ amountCents: 13000, categoryId: "food", date: "2026-08-05" }), // exactly +30%
    ];
    expect(detectSpendingAnomalies(txns, cats, now)).toEqual([]);
  });

  test("never flags a category with zero prior-months spend (no baseline, no division by zero)", () => {
    const txns = [txn({ amountCents: 500000, categoryId: "new", date: "2026-08-05" })];
    const anomalies = detectSpendingAnomalies(txns, cats, now);
    expect(anomalies).toEqual([]);
  });

  test("ignores a technically-doubled but trivial amount (1 cent -> 2 cents)", () => {
    const txns = [
      txn({ amountCents: 1, categoryId: "travel", date: "2026-05-10" }),
      txn({ amountCents: 1, categoryId: "travel", date: "2026-06-10" }),
      txn({ amountCents: 1, categoryId: "travel", date: "2026-07-10" }),
      txn({ amountCents: 2, categoryId: "travel", date: "2026-08-05" }),
    ];
    expect(detectSpendingAnomalies(txns, cats, now)).toEqual([]);
  });

  test("sorts multiple anomalies by absolute cents increase, largest first", () => {
    const txns = [
      // Food: +3000 absolute increase (3000 -> 6000)
      txn({ amountCents: 3000, categoryId: "food", date: "2026-05-10" }),
      txn({ amountCents: 3000, categoryId: "food", date: "2026-06-10" }),
      txn({ amountCents: 3000, categoryId: "food", date: "2026-07-10" }),
      txn({ amountCents: 6000, categoryId: "food", date: "2026-08-05" }),
      // Travel: +9000 absolute increase (2000 -> 11000), bigger jump
      txn({ amountCents: 2000, categoryId: "travel", date: "2026-05-10" }),
      txn({ amountCents: 2000, categoryId: "travel", date: "2026-06-10" }),
      txn({ amountCents: 2000, categoryId: "travel", date: "2026-07-10" }),
      txn({ amountCents: 11000, categoryId: "travel", date: "2026-08-05" }),
    ];
    const anomalies = detectSpendingAnomalies(txns, cats, now);
    expect(anomalies.map((a) => a.category.id)).toEqual(["travel", "food"]);
  });

  test("empty with no transactions at all", () => {
    expect(detectSpendingAnomalies([], cats, now)).toEqual([]);
  });
});

describe("generateMonthlyNarrative", () => {
  const cats = [cat("food", "Food"), cat("housing", "Housing")];
  const now = "2026-08-15";

  test("returns an encouraging default message when there's nothing to say yet", () => {
    const sentences = generateMonthlyNarrative([], [], cats, [], narrativeDictionary, now);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences.length).toBeLessThanOrEqual(5);
    expect(sentences[0].length).toBeGreaterThan(0);
  });

  test("mentions the top category and its share of spending", () => {
    const txns = [
      txn({ amountCents: 3000, categoryId: "housing", date: "2026-08-05" }),
      txn({ amountCents: 1000, categoryId: "food", date: "2026-08-06" }),
    ];
    const sentences = generateMonthlyNarrative(txns, [], cats, [], narrativeDictionary, now);
    expect(sentences.some((s) => s.includes("Housing") && s.includes("75%"))).toBe(true);
  });

  test("mentions an unused subscription's savings as a percent of subscription spend", () => {
    const subs = [
      sub({ id: "a", usage: "unused", name: "OldGym", amountCents: 1000, frequency: "monthly" }),
      sub({ id: "b", usage: "regular", amountCents: 3000, frequency: "monthly" }),
    ];
    const txns = [txn({ amountCents: 1000, categoryId: "food", date: "2026-08-05" })];
    const sentences = generateMonthlyNarrative(txns, subs, cats, [], narrativeDictionary, now);
    expect(sentences.some((s) => s.includes("OldGym"))).toBe(true);
  });

  test("mentions the worst spending anomaly when one exists", () => {
    const txns = [
      txn({ amountCents: 3000, categoryId: "food", date: "2026-05-10" }),
      txn({ amountCents: 3000, categoryId: "food", date: "2026-06-10" }),
      txn({ amountCents: 3000, categoryId: "food", date: "2026-07-10" }),
      txn({ amountCents: 8000, categoryId: "food", date: "2026-08-05" }),
    ];
    const sentences = generateMonthlyNarrative(txns, [], cats, [], narrativeDictionary, now);
    expect(sentences.some((s) => s.includes("Food") && s.includes("up about"))).toBe(true);
  });

  test("mentions budget adherence when budgets exist", () => {
    const txns = [txn({ amountCents: 1000, categoryId: "food", date: "2026-08-05" })];
    const budgets = [{ id: "b1", categoryId: null, amountCents: 100000, createdAt: 1, updatedAt: 1 }];
    const sentences = generateMonthlyNarrative(txns, [], cats, budgets, narrativeDictionary, now);
    expect(sentences.some((s) => s.includes("within all"))).toBe(true);
  });

  test("never returns an empty array and stays within 2-5 sentences when there is real data", () => {
    const subs = [sub({ id: "a", usage: "rarely", amountCents: 2000, frequency: "monthly" })];
    const budgets = [{ id: "b1", categoryId: null, amountCents: 500, createdAt: 1, updatedAt: 1 }];
    const txns = [
      txn({ amountCents: 3000, categoryId: "food", date: "2026-07-10" }),
      txn({ amountCents: 8000, categoryId: "food", date: "2026-08-05" }),
    ];
    const sentences = generateMonthlyNarrative(txns, subs, cats, budgets, narrativeDictionary, now);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(5);
  });
});

describe("computeFinancialHealthScore", () => {
  const now = "2026-08-15";

  function isValid(result: { score: number; tier: string }) {
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["needs attention", "fair", "good", "excellent"]).toContain(result.tier);
  }

  test("never throws, never NaN, always in [0, 100] -- completely empty state", () => {
    const result = computeFinancialHealthScore([], [], [], now);
    isValid(result);
  });

  test("robust with transactions but no income, no budgets, no subscriptions", () => {
    const txns = [txn({ amountCents: 5000, categoryId: "food", date: "2026-08-05" })];
    isValid(computeFinancialHealthScore(txns, [], [], now));
  });

  test("robust with income but no expenses, no budgets, no subscriptions", () => {
    const txns = [txn({ type: "income", amountCents: 500000, categoryId: "food", date: "2026-08-05" })];
    isValid(computeFinancialHealthScore(txns, [], [], now));
  });

  test("robust with budgets only (no transactions, no subscriptions)", () => {
    const budgets = [{ id: "b1", categoryId: null, amountCents: 10000, createdAt: 1, updatedAt: 1 }];
    isValid(computeFinancialHealthScore([], [], budgets, now));
  });

  test("robust with subscriptions only (no transactions, no budgets)", () => {
    const subs = [sub({ amountCents: 1000, frequency: "monthly" })];
    isValid(computeFinancialHealthScore([], subs, [], now));
  });

  test("a healthy month (good savings rate, under budget, light subscriptions) scores high", () => {
    const txns = [
      txn({ type: "income", amountCents: 500000, categoryId: "food", date: "2026-08-01" }),
      txn({ amountCents: 100000, categoryId: "food", date: "2026-08-05" }), // 80% savings rate
    ];
    const budgets = [{ id: "b1", categoryId: null, amountCents: 300000, createdAt: 1, updatedAt: 1 }]; // well under
    const subs = [sub({ amountCents: 2000, frequency: "monthly" })]; // 0.4% of income
    const result = computeFinancialHealthScore(txns, subs, budgets, now);
    isValid(result);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.tier).toBe("excellent");
  });

  test("an unhealthy month (overspending, over budget, heavy subscriptions) scores low", () => {
    const txns = [
      txn({ type: "income", amountCents: 100000, categoryId: "food", date: "2026-08-01" }),
      txn({ amountCents: 150000, categoryId: "food", date: "2026-08-05" }), // negative savings rate
    ];
    const budgets = [{ id: "b1", categoryId: null, amountCents: 10000, createdAt: 1, updatedAt: 1 }]; // way over
    const subs = [sub({ amountCents: 80000, frequency: "monthly" })]; // 80% of income
    const result = computeFinancialHealthScore(txns, subs, budgets, now);
    isValid(result);
    expect(result.score).toBeLessThan(40);
    expect(result.tier).toBe("needs attention");
  });

  test("factors always sum to (approximately) the score", () => {
    const txns = [
      txn({ type: "income", amountCents: 200000, categoryId: "food", date: "2026-08-01" }),
      txn({ amountCents: 150000, categoryId: "food", date: "2026-08-05" }),
    ];
    const budgets = [{ id: "b1", categoryId: null, amountCents: 200000, createdAt: 1, updatedAt: 1 }];
    const subs = [sub({ amountCents: 10000, frequency: "monthly" })];
    const result = computeFinancialHealthScore(txns, subs, budgets, now);
    const total = result.factors.reduce((sum, f) => sum + f.contribution, 0);
    expect(Math.abs(total - result.score)).toBeLessThanOrEqual(2); // rounding slack
  });
});
