import type { Category, Subscription, Transaction } from "../types";
import { subscriptionYearlyTotal } from "./calc";
import { monthLabel } from "./dates";

/** Computed on demand from real data -- never stored, never invented. */
export interface YearInReview {
  year: number;
  totalSpentCents: number;
  totalIncomeCents: number;
  netSavedCents: number;
  topCategory: { category: Category; spentCents: number } | null;
  biggestExpense: Transaction | null;
  busiestMonth: { monthIndex: number; label: string; spentCents: number } | null;
  /** Yearly total across currently-active subscriptions -- a snapshot of
   *  today's recurring load, not a historical reconstruction of what was
   *  actually charged during `year` (subscriptions don't keep that history). */
  subscriptionTotalCents: number;
  transactionCount: number;
}

/** Builds the "Year in Review" recap for a single calendar year, entirely
 *  from on-device transactions/subscriptions/categories. Robust to a year
 *  with zero transactions -- every field is a sane 0/null, never
 *  NaN/undefined/throw, since an empty year (e.g. right after onboarding, or
 *  a year before the user started using Flow) is a completely normal input. */
export function buildYearInReview(
  year: number,
  transactions: Transaction[],
  subscriptions: Subscription[],
  categories: Category[]
): YearInReview {
  const yearStr = String(year);
  const yearTxns = transactions.filter((t) => t.date.slice(0, 4) === yearStr);

  let totalSpentCents = 0;
  let totalIncomeCents = 0;
  const categoryTotals = new Map<string, number>();
  const monthTotals = new Array<number>(12).fill(0);
  let biggestExpense: Transaction | null = null;

  for (const t of yearTxns) {
    if (t.type === "expense") {
      totalSpentCents += t.amountCents;
      categoryTotals.set(t.categoryId, (categoryTotals.get(t.categoryId) ?? 0) + t.amountCents);
      const monthIndex = Number(t.date.slice(5, 7)) - 1;
      if (monthIndex >= 0 && monthIndex < 12) monthTotals[monthIndex] += t.amountCents;
      if (!biggestExpense || t.amountCents > biggestExpense.amountCents) biggestExpense = t;
    } else {
      totalIncomeCents += t.amountCents;
    }
  }

  let topCategory: YearInReview["topCategory"] = null;
  // Ties broken by first-encountered insertion order into `categoryTotals`,
  // which follows the order transactions were iterated above -- i.e.
  // whichever tied category had its first expense earliest in the list.
  for (const [categoryId, spentCents] of categoryTotals) {
    if (!topCategory || spentCents > topCategory.spentCents) {
      const category = categories.find((c) => c.id === categoryId);
      if (category) topCategory = { category, spentCents };
    }
  }

  let busiestMonth: YearInReview["busiestMonth"] = null;
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const spentCents = monthTotals[monthIndex];
    if (spentCents > 0 && (!busiestMonth || spentCents > busiestMonth.spentCents)) {
      busiestMonth = { monthIndex, label: monthLabel(year, monthIndex), spentCents };
    }
  }

  return {
    year,
    totalSpentCents,
    totalIncomeCents,
    netSavedCents: totalIncomeCents - totalSpentCents,
    topCategory,
    biggestExpense,
    busiestMonth,
    subscriptionTotalCents: subscriptionYearlyTotal(subscriptions),
    transactionCount: yearTxns.length,
  };
}
