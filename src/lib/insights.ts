/** On-device "AI Insights" -- pure, deterministic derivations over the
 *  user's own data. No storage access, no network calls, no LLM: every
 *  number here is computed from the `transactions` / `subscriptions` /
 *  `categories` / `budgets` arrays passed in, exactly like src/lib/calc.ts. */

import type { Budget, Category, Subscription, Transaction } from "../types";
import {
  activeSubscriptions,
  budgetStatus,
  buildMonthlySummary,
  currentMonthRange,
  expensesInRange,
  incomeInRange,
  inRange,
  monthlyEquivalent,
  subscriptionMonthlyTotal,
  type DateRange,
} from "./calc";
import { dateToISO, lastMonths, monthLabel, parseISO, todayISO } from "./dates";

/* ---------- unused subscriptions ---------- */

export interface UnusedSubscription {
  subscription: Subscription;
  potentialSavingsCents: number;
}

/** Active subscriptions the user has marked as rarely-used or unused,
 *  paired with what dropping them would save per month. Sorted by the
 *  biggest potential saving first. */
export function detectUnusedSubscriptions(subscriptions: Subscription[]): UnusedSubscription[] {
  return activeSubscriptions(subscriptions)
    .filter((s) => s.usage === "unused" || s.usage === "rarely")
    .map((s) => ({ subscription: s, potentialSavingsCents: monthlyEquivalent(s) }))
    .sort((a, b) => b.potentialSavingsCents - a.potentialSavingsCents);
}

/* ---------- spending anomalies ---------- */

export interface SpendingAnomaly {
  category: Category;
  currentMonthCents: number;
  averagePriorMonthsCents: number;
  percentIncrease: number;
}

/** A category's spend this month is "trivial" below this, so a jump from
 *  1 cent to 2 cents never counts as a real anomaly (20 currency units). */
const MIN_MEANINGFUL_CENTS = 2000;

/** How far above the trailing average counts as an anomaly. */
const ANOMALY_THRESHOLD_PERCENT = 30;

function fullMonthRange(year: number, monthIndex: number): DateRange {
  const from = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const to = dateToISO(new Date(year, monthIndex + 1, 0));
  return { from, to, label: monthLabel(year, monthIndex) };
}

function sumCategoryInRange(transactions: Transaction[], categoryId: string, range: DateRange): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.type === "expense" && t.categoryId === categoryId && inRange(t.date, range)) sum += t.amountCents;
  }
  return sum;
}

/** Compares each category's spend so far this (partial) calendar month
 *  against the average of the trailing 3 *full* months before it.
 *  A category is flagged only when BOTH:
 *   - it's up more than 30% versus that trailing average, AND
 *   - this month's spend is at least MIN_MEANINGFUL_CENTS (avoids
 *     "doubled" alerts on categories that went from 1 cent to 2 cents).
 *  Categories with zero spend in all 3 prior months are skipped entirely --
 *  a percent increase off a zero base is undefined/infinite, and a brand
 *  new category isn't a meaningful "anomaly" yet. Sorted by absolute cents
 *  increase, largest first. */
export function detectSpendingAnomalies(
  transactions: Transaction[],
  categories: Category[],
  now = todayISO()
): SpendingAnomaly[] {
  const nowDate = parseISO(now);
  const currentRange = currentMonthRange(now);
  // lastMonths(4, now) = [3-months-ago, 2-months-ago, 1-month-ago, this month];
  // drop the current (partial) month, keeping the 3 full months before it.
  const priorRanges = lastMonths(4, nowDate)
    .slice(0, 3)
    .map((m) => fullMonthRange(m.year, m.monthIndex));

  const results: SpendingAnomaly[] = [];
  for (const category of categories) {
    const currentMonthCents = sumCategoryInRange(transactions, category.id, currentRange);
    const priorTotal = priorRanges.reduce((sum, r) => sum + sumCategoryInRange(transactions, category.id, r), 0);
    if (priorTotal <= 0) continue; // no prior baseline -- "increase" isn't meaningful yet
    const averagePriorMonthsCents = priorTotal / priorRanges.length;
    const percentIncrease = ((currentMonthCents - averagePriorMonthsCents) / averagePriorMonthsCents) * 100;
    if (percentIncrease > ANOMALY_THRESHOLD_PERCENT && currentMonthCents >= MIN_MEANINGFUL_CENTS) {
      results.push({ category, currentMonthCents, averagePriorMonthsCents, percentIncrease });
    }
  }
  results.sort(
    (a, b) => b.currentMonthCents - b.averagePriorMonthsCents - (a.currentMonthCents - a.averagePriorMonthsCents)
  );
  return results;
}

/* ---------- monthly narrative ---------- */

/** Below this, a month-over-month change isn't worth calling out in prose. */
const NARRATIVE_MOM_THRESHOLD_PERCENT = 5;

/** Builds a short list of plain-English sentences entirely from numbers
 *  computed above and in calc.ts -- nothing here is fabricated. This
 *  function has no currency code available (its signature is currency-free
 *  on purpose, so it stays a pure derivation over domain data), so every
 *  sentence expresses amounts as a percentage rather than formatted money;
 *  the screen that renders these already shows the real currency figures
 *  alongside them via the other cards. */
export function generateMonthlyNarrative(
  transactions: Transaction[],
  subscriptions: Subscription[],
  categories: Category[],
  budgets: Budget[],
  now = todayISO()
): string[] {
  const nowDate = parseISO(now);
  const thisMonth = buildMonthlySummary(transactions, categories, nowDate.getFullYear(), nowDate.getMonth());
  const sentences: string[] = [];

  if (thisMonth.spentCents > 0 && thisMonth.topCategoryId) {
    const topCategory = categories.find((c) => c.id === thisMonth.topCategoryId);
    if (topCategory) {
      const share = Math.round((thisMonth.topCategoryCents / thisMonth.spentCents) * 100);
      sentences.push(`${topCategory.name} is your biggest expense this month, making up ${share}% of your spending so far.`);
    }
  }

  if (thisMonth.vsPreviousPercent !== null && Math.abs(thisMonth.vsPreviousPercent) >= NARRATIVE_MOM_THRESHOLD_PERCENT) {
    const direction = thisMonth.vsPreviousPercent > 0 ? "more" : "less";
    sentences.push(`You've spent about ${Math.round(Math.abs(thisMonth.vsPreviousPercent))}% ${direction} than last month so far.`);
  }

  if (budgets.length > 0) {
    const statuses = budgets.map((b) => budgetStatus(b, transactions, now));
    const overCount = statuses.filter((s) => s.level === "over" || s.level === "reached").length;
    sentences.push(
      overCount > 0
        ? `You're over budget on ${overCount} of your ${budgets.length} budget${budgets.length === 1 ? "" : "s"} this month.`
        : `You're within all ${budgets.length} of your budgets so far this month.`
    );
  }

  const unused = detectUnusedSubscriptions(subscriptions);
  if (unused.length > 0) {
    const subTotal = subscriptionMonthlyTotal(subscriptions);
    const top = unused[0];
    if (subTotal > 0) {
      const percentOfSubs = Math.round((top.potentialSavingsCents / subTotal) * 100);
      sentences.push(`${top.subscription.name} looks ${top.subscription.usage} -- dropping it could cut your subscription costs by about ${percentOfSubs}%.`);
    }
  }

  const anomalies = detectSpendingAnomalies(transactions, categories, now);
  if (anomalies.length > 0) {
    const worst = anomalies[0];
    sentences.push(`${worst.category.name} spending is up about ${Math.round(worst.percentIncrease)}% versus your recent average.`);
  }

  if (sentences.length === 0) {
    return ["Add a few transactions this month to start seeing personalized insights here."];
  }
  return sentences.slice(0, 5);
}

/* ---------- financial health score ---------- */

export type HealthTier = "needs attention" | "fair" | "good" | "excellent";

export interface HealthFactor {
  label: string;
  /** Points (0..its max weight) this factor contributes to the final score. */
  contribution: number;
}

export interface FinancialHealthScore {
  score: number;
  tier: HealthTier;
  factors: HealthFactor[];
}

/* Weighting scheme (documented here since it isn't obvious from the code):
 *   - Savings rate this month (income vs. expenses)   -> up to 40 points
 *   - Budget adherence (average % of each budget used) -> up to 35 points
 *   - Subscription load (subs as % of income/expenses) -> up to 25 points
 * These sum to 100 when every factor has real data behind it. When a
 * factor has NO basis to compute from (no income recorded this month, no
 * budgets set, or no income/expenses at all to compare subscriptions
 * against), it is excluded rather than scored 0 -- scoring it 0 would
 * unfairly punish, say, someone with no budgets configured. Instead its
 * weight is redistributed proportionally across the remaining applicable
 * factors, by scaling their earned points up to fill the full 100. If NO
 * factor has any basis at all (a brand new, empty install), the function
 * returns a neutral default score instead of guessing. */
const SAVINGS_MAX = 40;
const BUDGET_MAX = 35;
const SUBSCRIPTION_MAX = 25;
const TOTAL_MAX = SAVINGS_MAX + BUDGET_MAX + SUBSCRIPTION_MAX; // 100

/** A savings rate at/above this scores full marks; at/below 0 scores none. */
const SAVINGS_RATE_FOR_FULL_SCORE = 0.2; // 20%

/** Subscription-load-as-share-of-income/expenses thresholds: at/below the
 *  low end scores full marks, at/above the high end scores none. */
const SUB_LOAD_FULL_SCORE_RATIO = 0.1; // 10%
const SUB_LOAD_ZERO_SCORE_RATIO = 0.4; // 40%

const NEUTRAL_DEFAULT_SCORE = 50;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function computeFinancialHealthScore(
  transactions: Transaction[],
  subscriptions: Subscription[],
  budgets: Budget[],
  now = todayISO()
): FinancialHealthScore {
  const range = currentMonthRange(now);
  const income = incomeInRange(transactions, range);
  const expenses = expensesInRange(transactions, range);

  /* --- savings rate --- */
  let savingsApplicable = false;
  let savingsPoints = 0;
  if (income > 0) {
    savingsApplicable = true;
    const rate = (income - expenses) / income; // may be negative
    savingsPoints = clamp((rate / SAVINGS_RATE_FOR_FULL_SCORE) * SAVINGS_MAX, 0, SAVINGS_MAX);
  }

  /* --- budget adherence --- */
  let budgetApplicable = false;
  let budgetPoints = 0;
  if (budgets.length > 0) {
    budgetApplicable = true;
    const perBudget = budgets.map((b) => 100 - Math.min(100, Math.max(0, budgetStatus(b, transactions, now).percent)));
    const avg = perBudget.reduce((a, c) => a + c, 0) / perBudget.length;
    budgetPoints = clamp((avg / 100) * BUDGET_MAX, 0, BUDGET_MAX);
  }

  /* --- subscription load --- */
  let subApplicable = false;
  let subPoints = 0;
  const subMonthly = subscriptionMonthlyTotal(subscriptions);
  const subDenominator = income > 0 ? income : expenses; // fall back to expenses when no income is tracked
  if (subDenominator > 0) {
    subApplicable = true;
    const ratio = subMonthly / subDenominator;
    if (ratio <= SUB_LOAD_FULL_SCORE_RATIO) subPoints = SUBSCRIPTION_MAX;
    else if (ratio >= SUB_LOAD_ZERO_SCORE_RATIO) subPoints = 0;
    else {
      const span = SUB_LOAD_ZERO_SCORE_RATIO - SUB_LOAD_FULL_SCORE_RATIO;
      subPoints = SUBSCRIPTION_MAX * ((SUB_LOAD_ZERO_SCORE_RATIO - ratio) / span);
    }
  }

  const applicableMax =
    (savingsApplicable ? SAVINGS_MAX : 0) + (budgetApplicable ? BUDGET_MAX : 0) + (subApplicable ? SUBSCRIPTION_MAX : 0);

  if (applicableMax === 0) {
    // No data at all to judge by -- a fresh install. Don't guess.
    const each = NEUTRAL_DEFAULT_SCORE / 3;
    return {
      score: NEUTRAL_DEFAULT_SCORE,
      tier: tierFor(NEUTRAL_DEFAULT_SCORE),
      factors: [
        { label: "Savings rate", contribution: each },
        { label: "Budget adherence", contribution: each },
        { label: "Subscription load", contribution: each },
      ],
    };
  }

  // Scale earned points up so the applicable factors' weights fill 100,
  // i.e. redistribute the inapplicable factors' weight proportionally.
  const scale = TOTAL_MAX / applicableMax;
  const savingsContribution = savingsApplicable ? savingsPoints * scale : 0;
  const budgetContribution = budgetApplicable ? budgetPoints * scale : 0;
  const subContribution = subApplicable ? subPoints * scale : 0;

  const rawScore = savingsContribution + budgetContribution + subContribution;
  const score = clamp(Math.round(Number.isFinite(rawScore) ? rawScore : 0), 0, 100);

  return {
    score,
    tier: tierFor(score),
    factors: [
      { label: "Savings rate", contribution: Math.round(savingsContribution) },
      { label: "Budget adherence", contribution: Math.round(budgetContribution) },
      { label: "Subscription load", contribution: Math.round(subContribution) },
    ],
  };
}

/* Tier boundaries -- monotonic, documented: 0-39 needs attention, 40-64
 * fair, 65-84 good, 85-100 excellent. */
function tierFor(score: number): HealthTier {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 40) return "fair";
  return "needs attention";
}
