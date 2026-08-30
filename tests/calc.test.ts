import { describe, expect, test } from "bun:test";
import {
  activeSubscriptions,
  advanceSubscriptionDate,
  budgetStatus,
  buildMonthlySummary,
  categoryTotals,
  monthlyEquivalent,
  nextOccurrenceAfter,
  recurringDue,
  spendingSeries,
  spendingWithComparison,
  suggestCategoryForMerchant,
  subscriptionMonthlyTotal,
  subscriptionYearlyTotal,
  upcomingPayments,
  upcomingTotalCents,
  yearlyEquivalent,
} from "../src/lib/calc";
import { cat, installGlobals, sub, txn } from "./helpers";

installGlobals("en-US");

describe("subscription equivalents", () => {
  test("weekly ×52/12 monthly, ×52 yearly", () => {
    const s = sub({ amountCents: 1000, frequency: "weekly" });
    expect(monthlyEquivalent(s)).toBe(4333); // 52000/12
    expect(yearlyEquivalent(s)).toBe(52000);
  });
  test("monthly is identity; yearly ×12", () => {
    const s = sub({ amountCents: 1200, frequency: "monthly" });
    expect(monthlyEquivalent(s)).toBe(1200);
    expect(yearlyEquivalent(s)).toBe(14400);
  });
  test("quarterly ÷3 monthly, ×4 yearly", () => {
    const s = sub({ amountCents: 3000, frequency: "quarterly" });
    expect(monthlyEquivalent(s)).toBe(1000);
    expect(yearlyEquivalent(s)).toBe(12000);
  });
  test("yearly ÷12 monthly", () => {
    const s = sub({ amountCents: 12000, frequency: "yearly" });
    expect(monthlyEquivalent(s)).toBe(1000);
    expect(yearlyEquivalent(s)).toBe(12000);
  });
});

describe("active subscriptions and totals", () => {
  test("excludes paused/cancelled from totals", () => {
    const subs = [
      sub({ id: "a", amountCents: 1000, frequency: "monthly" }),
      sub({ id: "b", amountCents: 12000, frequency: "yearly", status: "paused" }),
      sub({ id: "c", amountCents: 3000, frequency: "quarterly", status: "cancelled" }),
    ];
    expect(activeSubscriptions(subs).map((s) => s.id)).toEqual(["a"]);
    expect(subscriptionMonthlyTotal(subs)).toBe(1000);
    expect(subscriptionYearlyTotal(subs)).toBe(12000);
  });
});

describe("upcoming payments", () => {
  const now = "2026-08-13";
  test("includes overdue and next-90-days, sorted, excludes far-future and non-active", () => {
    const subs = [
      sub({ id: "overdue", nextPaymentDate: "2026-08-01" }),
      sub({ id: "soon", nextPaymentDate: "2026-09-01" }),
      sub({ id: "far", nextPaymentDate: "2027-01-01" }),
      sub({ id: "paused", nextPaymentDate: "2026-09-01", status: "paused" }),
    ];
    const upcoming = upcomingPayments(subs, now);
    expect(upcoming.map((u) => u.subscription.id)).toEqual(["overdue", "soon"]);
    expect(upcoming[0].label.startsWith("Overdue")).toBe(true);
  });

  test("sums the next payment amounts", () => {
    const subs = [
      sub({ amountCents: 1799, nextPaymentDate: "2026-08-20" }),
      sub({ amountCents: 1199, nextPaymentDate: "2026-08-18" }),
    ];
    expect(upcomingTotalCents(subs, now)).toBe(2998);
  });
});

describe("budget warnings", () => {
  const month = "2026-08-13"; // explicit month so tests don't depend on today
  const budget = { id: "b", categoryId: null, amountCents: 10000, createdAt: 1, updatedAt: 1 };

  test("levels across thresholds", () => {
    const spent = (cents: number) => [txn({ amountCents: cents, date: "2026-08-05" })];
    expect(budgetStatus(budget, [], month).level).toBe("ok");
    expect(budgetStatus(budget, spent(8000), month).level).toBe("close"); // 80%
    expect(budgetStatus(budget, spent(9000), month).level).toBe("high"); // 90%
    expect(budgetStatus(budget, spent(10000), month).level).toBe("reached"); // 100%
    expect(budgetStatus(budget, spent(10450), month).level).toBe("over");
  });

  test("reports remaining and percent", () => {
    const status = budgetStatus(budget, [txn({ amountCents: 2000, date: "2026-08-05" })], month);
    expect(status.percent).toBe(20);
    expect(status.remainingCents).toBe(8000);
    const over = budgetStatus(budget, [txn({ amountCents: 10450, date: "2026-08-05" })], month);
    expect(over.remainingCents).toBe(-450);
  });

  test("category budgets only count that category", () => {
    const catBudget = { id: "c", categoryId: "food", amountCents: 10000, createdAt: 1, updatedAt: 1 };
    const txns = [
      txn({ amountCents: 8500, categoryId: "food", date: "2026-08-05" }),
      txn({ amountCents: 99999, categoryId: "travel", date: "2026-08-05" }),
    ];
    const status = budgetStatus(catBudget, txns, month);
    expect(status.level).toBe("close");
    expect(status.spentCents).toBe(8500);
  });
});

describe("spending with comparison", () => {
  test("compares against the previous equal-length period", () => {
    const range = { from: "2026-08-01", to: "2026-08-13", label: "Aug" };
    const txns = [
      txn({ amountCents: 5000, date: "2026-08-05" }),
      txn({ amountCents: 3000, date: "2026-08-10" }),
      txn({ amountCents: 2000, date: "2026-07-25" }),
      txn({ amountCents: 7000, date: "2026-06-01" }), // outside previous window
    ];
    const result = spendingWithComparison(txns, range);
    expect(result.spent).toBe(8000);
    expect(result.previous).toBe(2000);
    expect(result.change).toBe(6000);
    expect(result.percent).toBe(300);
  });

  test("ignores income", () => {
    const range = { from: "2026-08-01", to: "2026-08-13", label: "Aug" };
    const txns = [txn({ type: "income", amountCents: 5000, date: "2026-08-05" })];
    expect(spendingWithComparison(txns, range).spent).toBe(0);
  });
});

describe("buildMonthlySummary", () => {
  test("computes spend, income, savings, top category, subscription spend, comparison", () => {
    const cats = [cat("food", "Food"), cat("housing", "Housing"), cat("subs", "Subscriptions")];
    const txns = [
      txn({ id: "1", amountCents: 2000, categoryId: "food", date: "2026-08-03" }),
      txn({ id: "2", amountCents: 3000, categoryId: "housing", date: "2026-08-04" }),
      txn({ id: "3", amountCents: 1000, categoryId: "subs", date: "2026-08-05", subscriptionId: "s1" }),
      txn({ id: "4", type: "income", amountCents: 8000, categoryId: "food", date: "2026-08-06" }),
      txn({ id: "5", amountCents: 4000, categoryId: "food", date: "2026-07-10" }),
    ];
    const summary = buildMonthlySummary(txns, cats, 2026, 7); // August
    expect(summary.spentCents).toBe(6000);
    expect(summary.incomeCents).toBe(8000);
    expect(summary.savedCents).toBe(2000);
    expect(summary.subscriptionCents).toBe(1000);
    expect(summary.topCategoryId).toBe("housing");
    expect(summary.topCategoryCents).toBe(3000);
    expect(summary.vsPreviousPercent).toBe(50); // (6000-4000)/4000
  });
});

describe("buildMonthlySummary month-boundary regression", () => {
  test("a transaction on the 1st of the month counts only in that month, not the previous one", () => {
    const cats = [cat("food", "Food")];
    const txns = [txn({ amountCents: 1000, categoryId: "food", date: "2026-08-01" })];
    const august = buildMonthlySummary(txns, cats, 2026, 7);
    const july = buildMonthlySummary(txns, cats, 2026, 6);
    expect(august.spentCents).toBe(1000);
    expect(july.spentCents).toBe(0);
  });

  test("a transaction on the last day of the previous month counts only in that month", () => {
    const cats = [cat("food", "Food")];
    const txns = [txn({ amountCents: 500, categoryId: "food", date: "2026-07-31" })];
    const august = buildMonthlySummary(txns, cats, 2026, 7);
    const july = buildMonthlySummary(txns, cats, 2026, 6);
    expect(august.spentCents).toBe(0);
    expect(july.spentCents).toBe(500);
  });

  test("a normal middle-of-month transaction is counted once", () => {
    const cats = [cat("food", "Food")];
    const txns = [txn({ amountCents: 750, categoryId: "food", date: "2026-08-15" })];
    const august = buildMonthlySummary(txns, cats, 2026, 7);
    expect(august.spentCents).toBe(750);
  });

  test("January/December boundary: Jan 1 counts in January, not December", () => {
    const cats = [cat("food", "Food")];
    const txns = [txn({ amountCents: 200, categoryId: "food", date: "2027-01-01" })];
    const january = buildMonthlySummary(txns, cats, 2027, 0);
    const december = buildMonthlySummary(txns, cats, 2026, 11);
    expect(january.spentCents).toBe(200);
    expect(december.spentCents).toBe(0);
  });

  test("leap-year February 29 stays inside February, not March", () => {
    const cats = [cat("food", "Food")];
    const txns = [
      txn({ amountCents: 100, categoryId: "food", date: "2028-02-29" }),
      txn({ amountCents: 300, categoryId: "food", date: "2028-03-01" }),
    ];
    const february = buildMonthlySummary(txns, cats, 2028, 1);
    const march = buildMonthlySummary(txns, cats, 2028, 2);
    expect(february.spentCents).toBe(100);
    expect(march.spentCents).toBe(300);
  });
});

describe("spendingSeries", () => {
  test("7-day range returns 7 daily buckets", () => {
    const range = { from: "2026-08-07", to: "2026-08-13", label: "7d" };
    const txns = [
      txn({ amountCents: 5000, date: "2026-08-08" }),
      txn({ amountCents: 3000, date: "2026-08-13" }),
    ];
    const series = spendingSeries(txns, range);
    expect(series.length).toBe(7);
    expect(series.reduce((s, p) => s + p.cents, 0)).toBe(8000);
    expect(series[1].cents).toBe(5000);
  });

  test("90-day range returns monthly buckets", () => {
    const range = { from: "2026-05-16", to: "2026-08-13", label: "3m" };
    const txns = [txn({ amountCents: 2500, date: "2026-07-10" })];
    const series = spendingSeries(txns, range);
    expect(series.length).toBe(3);
    expect(series.find((p) => p.key === "2026-07")?.cents).toBe(2500);
  });
});

describe("categoryTotals", () => {
  test("sorts categories by spend and computes percentages", () => {
    const cats = [cat("food", "Food"), cat("housing", "Housing"), cat("travel", "Travel")];
    const txns = [
      txn({ amountCents: 3000, categoryId: "housing", date: "2026-08-04" }),
      txn({ amountCents: 1000, categoryId: "food", date: "2026-08-03" }),
      txn({ amountCents: 1000, categoryId: "food", date: "2026-08-05" }),
    ];
    const range = { from: "2026-08-01", to: "2026-08-13", label: "Aug" };
    const totals = categoryTotals(txns, cats, range);
    expect(totals[0].category.name).toBe("Housing");
    expect(totals[0].spentCents).toBe(3000);
    expect(totals[0].percent).toBe(60);
    expect(totals[1].spentCents).toBe(2000);
    expect(totals[1].percent).toBe(40);
  });
});

describe("recurring transactions", () => {
  test("recurringDue only when nextOccurrence has passed", () => {
    expect(recurringDue(txn({ recurring: true, nextOccurrence: "2026-08-12" }), "2026-08-13")).toBe(true);
    expect(recurringDue(txn({ recurring: true, nextOccurrence: "2026-08-14" }), "2026-08-13")).toBe(false);
    expect(recurringDue(txn({ recurring: false, nextOccurrence: "2026-08-01" }), "2026-08-13")).toBe(false);
  });

  test("nextOccurrenceAfter advances by frequency", () => {
    expect(nextOccurrenceAfter(txn({ frequency: "daily", nextOccurrence: "2026-08-13" }), "2026-08-13")).toBe("2026-08-14");
    expect(nextOccurrenceAfter(txn({ frequency: "weekly", nextOccurrence: "2026-08-13" }), "2026-08-13")).toBe("2026-08-20");
    expect(nextOccurrenceAfter(txn({ frequency: "monthly", nextOccurrence: "2026-08-13" }), "2026-08-13")).toBe("2026-09-13");
  });

  test("nextOccurrenceAfter catches up to today when nextOccurrence is in the past", () => {
    expect(nextOccurrenceAfter(txn({ frequency: "daily", nextOccurrence: "2026-08-01" }), "2026-08-13")).toBe("2026-08-14");
  });
});

describe("suggestCategoryForMerchant", () => {
  test("suggests the category most often used for a matching merchant", () => {
    const transactions = [
      txn({ merchant: "Netflix", categoryId: "subs" }),
      txn({ merchant: "Netflix", categoryId: "subs" }),
      txn({ merchant: "Netflix", categoryId: "food" }), // one stray miscategorization
    ];
    expect(suggestCategoryForMerchant("Netflix", transactions)).toBe("subs");
  });

  test("matches case- and whitespace-insensitively", () => {
    const transactions = [txn({ merchant: "  Netflix  ", categoryId: "subs" })];
    expect(suggestCategoryForMerchant("netflix", transactions)).toBe("subs");
  });

  test("returns null for a new merchant or empty input", () => {
    const transactions = [txn({ merchant: "Netflix", categoryId: "subs" })];
    expect(suggestCategoryForMerchant("Spotify", transactions)).toBeNull();
    expect(suggestCategoryForMerchant("", transactions)).toBeNull();
    expect(suggestCategoryForMerchant("   ", transactions)).toBeNull();
  });
});

describe("advanceSubscriptionDate", () => {
  test("advances by frequency with month-end clamping", () => {
    expect(advanceSubscriptionDate(sub({ frequency: "weekly", nextPaymentDate: "2026-08-13" }))).toBe("2026-08-20");
    expect(advanceSubscriptionDate(sub({ frequency: "monthly", nextPaymentDate: "2026-01-31" }))).toBe("2026-02-28");
    expect(advanceSubscriptionDate(sub({ frequency: "quarterly", nextPaymentDate: "2026-08-13" }))).toBe("2026-11-13");
    expect(advanceSubscriptionDate(sub({ frequency: "yearly", nextPaymentDate: "2026-08-13" }))).toBe("2027-08-13");
  });
});
