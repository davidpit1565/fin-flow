import type {
  Budget,
  Category,
  CategoryTotal,
  DateFormatPreference,
  Goal,
  MonthlySummary,
  NetWorthItem,
  Subscription,
  Transaction,
  UpcomingPayment,
  WeekStart,
} from "../types";
import { addDays, addMonths, diffDays, lastMonths, monthLabel, parseISO, shortDate, startOfMonth, startOfWeek, todayISO, toISO } from "./dates";
import { relativeDayLabel, type Dictionary } from "./i18n";

/* ---------- periods ---------- */

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export interface DateRange {
  from: string; // inclusive ISO
  to: string; // inclusive ISO
  label: string;
}

export function currentMonthRange(now = todayISO()): DateRange {
  const d = parseISO(now);
  return {
    from: `${now.slice(0, 7)}-01`,
    to: now,
    label: monthLabel(d.getFullYear(), d.getMonth()),
  };
}

export function lastMonthRange(now = todayISO()): DateRange {
  const d = parseISO(now);
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const end = new Date(d.getFullYear(), d.getMonth(), 0); // last day of previous month
  return {
    from: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`,
    to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`,
    label: monthLabel(prev.getFullYear(), prev.getMonth()),
  };
}

export function lastNDaysRange(n: number, now = todayISO()): DateRange {
  return { from: addDays(now, -(n - 1)), to: now, label: `Last ${n} days` };
}

export function yearRange(now = todayISO()): DateRange {
  const y = now.slice(0, 4);
  return { from: `${y}-01-01`, to: now, label: String(y) };
}

export function previousRange(range: DateRange): DateRange {
  const span = diffDays(range.from, range.to) + 1;
  const to = addDays(range.from, -1);
  const from = addDays(to, -(span - 1));
  return { from, to, label: "previous period" };
}

export function inRange(iso: string, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to;
}

/* ---------- spending ---------- */

export function expensesInRange(transactions: Transaction[], range: DateRange): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.type === "expense" && inRange(t.date, range)) sum += t.amountCents;
  }
  return sum;
}

export function incomeInRange(transactions: Transaction[], range: DateRange): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.type === "income" && inRange(t.date, range)) sum += t.amountCents;
  }
  return sum;
}

/** Spent in the range and the comparison with the equally-sized previous period. */
export function spendingWithComparison(transactions: Transaction[], range: DateRange) {
  const spent = expensesInRange(transactions, range);
  const prev = expensesInRange(transactions, previousRange(range));
  const change = spent - prev;
  const percent = prev > 0 ? (change / prev) * 100 : null;
  return { spent, previous: prev, change, percent };
}

/* ---------- subscriptions ---------- */

export function monthlyEquivalent(sub: Subscription): number {
  switch (sub.frequency) {
    case "weekly":
      return Math.round((sub.amountCents * 52) / 12);
    case "monthly":
      return sub.amountCents;
    case "quarterly":
      return Math.round(sub.amountCents / 3);
    case "yearly":
      return Math.round(sub.amountCents / 12);
  }
}

export function yearlyEquivalent(sub: Subscription): number {
  switch (sub.frequency) {
    case "weekly":
      return sub.amountCents * 52;
    case "monthly":
      return sub.amountCents * 12;
    case "quarterly":
      return sub.amountCents * 4;
    case "yearly":
      return sub.amountCents;
  }
}

export function frequencyLabel(freq: Subscription["frequency"]): string {
  switch (freq) {
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
    case "quarterly":
      return "quarterly";
    case "yearly":
      return "yearly";
  }
}

export function frequencyInterval(freq: Subscription["frequency"]): string {
  switch (freq) {
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    case "quarterly":
      return "3 months";
    case "yearly":
      return "year";
  }
}

export function activeSubscriptions(subscriptions: Subscription[]): Subscription[] {
  return subscriptions.filter((s) => s.status === "active");
}

export function subscriptionMonthlyTotal(subscriptions: Subscription[]): number {
  return activeSubscriptions(subscriptions).reduce((sum, s) => sum + monthlyEquivalent(s), 0);
}

export function subscriptionYearlyTotal(subscriptions: Subscription[]): number {
  return activeSubscriptions(subscriptions).reduce((sum, s) => sum + yearlyEquivalent(s), 0);
}

/** Active subs due within the next 90 days (or overdue), sorted by date --
 *  the raw data behind `upcomingPayments`, with no display label attached
 *  yet, so totals can be computed without a translation dictionary. */
function upcomingDue(subscriptions: Subscription[], now: string): { subscription: Subscription; date: string; amountCents: number; overdue: boolean }[] {
  const horizon = addDays(now, 90);
  return activeSubscriptions(subscriptions)
    .filter((s) => s.nextPaymentDate <= horizon)
    .map((s) => ({
      subscription: s,
      date: s.nextPaymentDate,
      amountCents: s.amountCents,
      overdue: s.nextPaymentDate < now,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Upcoming payments with a translated, human-readable date label. */
export function upcomingPayments(
  subscriptions: Subscription[],
  t: Pick<Dictionary, "common">,
  dateFormat: DateFormatPreference = "auto",
  now = todayISO()
): UpcomingPayment[] {
  return upcomingDue(subscriptions, now).map((u) => {
    const label = relativeDayLabel(t, u.date, now) ?? shortDate(u.date, { includeYear: true, format: dateFormat });
    return { subscription: u.subscription, date: u.date, amountCents: u.amountCents, label: u.overdue ? t.common.overdue(label) : label };
  });
}

export function upcomingTotalCents(subscriptions: Subscription[], now = todayISO()): number {
  return upcomingDue(subscriptions, now).reduce((sum, u) => sum + u.amountCents, 0);
}

/* ---------- categories ---------- */

export function categoryTotals(
  transactions: Transaction[],
  categories: Category[],
  range: DateRange,
  limit?: number
): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === "expense" && inRange(t.date, range)) {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amountCents);
    }
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  const list: CategoryTotal[] = [];
  for (const [categoryId, spentCents] of map) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) continue;
    list.push({ category, spentCents, percent: total > 0 ? (spentCents / total) * 100 : 0 });
  }
  list.sort((a, b) => b.spentCents - a.spentCents);
  return limit ? list.slice(0, limit) : list;
}

/* ---------- budgets ---------- */

export interface BudgetStatus {
  budget: Budget;
  spentCents: number;
  remainingCents: number;
  percent: number;
  level: "ok" | "close" | "high" | "reached" | "over";
}

/** Start of the current period-to-date range for a budget's period
 *  ("monthly" when unset, for budgets created before periods existed). */
export function budgetPeriodStart(period: Budget["period"], now: string, startWeekOn: WeekStart): string {
  switch (period) {
    case "daily":
      return now;
    case "weekly":
      return startOfWeek(now, startWeekOn);
    case "monthly":
    default:
      return startOfMonth(now);
  }
}

export function budgetStatus(
  budget: Budget,
  transactions: Transaction[],
  now = todayISO(),
  startWeekOn: WeekStart = "monday"
): BudgetStatus {
  const from = budgetPeriodStart(budget.period, now, startWeekOn);
  const range: DateRange = { from, to: now, label: now };
  const spentCents = budget.categoryId
    ? expensesInRange(
        transactions.filter((t) => t.categoryId === budget.categoryId),
        range
      )
    : expensesInRange(transactions, range);
  const percent = budget.amountCents > 0 ? (spentCents / budget.amountCents) * 100 : 0;
  let level: BudgetStatus["level"] = "ok";
  if (spentCents > budget.amountCents) level = "over";
  else if (percent >= 100) level = "reached";
  else if (percent >= 90) level = "high";
  else if (percent >= 80) level = "close";
  return { budget, spentCents, remainingCents: budget.amountCents - spentCents, percent, level };
}

/* ---------- net worth ---------- */

export interface NetWorthTotals {
  assetsCents: number;
  liabilitiesCents: number;
  netCents: number;
}

export function computeNetWorth(items: NetWorthItem[]): NetWorthTotals {
  let assetsCents = 0;
  let liabilitiesCents = 0;
  for (const item of items) {
    if (item.kind === "asset") assetsCents += item.valueCents;
    else liabilitiesCents += item.valueCents;
  }
  return { assetsCents, liabilitiesCents, netCents: assetsCents - liabilitiesCents };
}

/* ---------- insights ---------- */

export interface SeriesPoint {
  key: string;
  label: string;
  cents: number;
}

/** Daily buckets for short ranges, monthly buckets for long ones. */
export function spendingSeries(transactions: Transaction[], range: DateRange): SeriesPoint[] {
  const days = diffDays(range.from, range.to) + 1;
  const points: SeriesPoint[] = [];
  if (days <= 62) {
    for (let i = 0; i < days; i++) {
      const iso = addDays(range.from, i);
      const sum = transactions.reduce((acc, t) => {
        return t.type === "expense" && t.date === iso ? acc + t.amountCents : acc;
      }, 0);
      const d = parseISO(iso);
      const fmt = new Intl.DateTimeFormat(navigator.language || "en", { day: "numeric", month: "short" });
      points.push({ key: iso, label: fmt.format(d), cents: sum });
    }
  } else {
    const months = lastMonths(Math.ceil(days / 30.4), parseISO(range.to));
    for (const m of months) {
      const prefix = `${m.year}-${String(m.monthIndex + 1).padStart(2, "0")}`;
      let sum = 0;
      for (const t of transactions) {
        if (t.type === "expense" && t.date.startsWith(prefix)) sum += t.amountCents;
      }
      points.push({ key: m.key, label: m.label, cents: sum });
    }
  }
  return points;
}

export function buildMonthlySummary(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  monthIndex: number
): MonthlySummary {
  const from = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  // Last day of this month, inclusive — NOT the 1st of next month, which
  // would also fall inside the following month's own range (addMonths(from, 1)
  // used to double-count any transaction dated on the 1st across both months).
  const range: DateRange = { from, to: prevRangeFrom(new Date(year, monthIndex, 1)), label: monthLabel(year, monthIndex) };
  const prevMonth = new Date(year, monthIndex - 1, 1);
  const prevRange: DateRange = {
    from: `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`,
    to: prevRangeFrom(prevMonth),
    label: monthLabel(prevMonth.getFullYear(), prevMonth.getMonth()),
  };

  const spentCents = expensesInRange(transactions, range);
  const incomeCents = incomeInRange(transactions, range);
  const prevSpent = expensesInRange(transactions, prevRange);
  const subscriptionCents = subscriptionSpendInRange(transactions, range);

  const totals = categoryTotals(transactions, categories, range, 1);
  const top = totals[0] ?? null;

  return {
    year,
    month: monthIndex,
    spentCents,
    incomeCents,
    savedCents: incomeCents - spentCents,
    subscriptionCents,
    topCategoryId: top?.category.id ?? null,
    topCategoryCents: top?.spentCents ?? 0,
    vsPreviousPercent: prevSpent > 0 ? ((spentCents - prevSpent) / prevSpent) * 100 : null,
  };
}

function prevRangeFrom(d: Date): string {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

/** Subscription spending = expenses linked to a subscription record. */
export function subscriptionSpendInRange(transactions: Transaction[], range: DateRange): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.type === "expense" && t.subscriptionId && inRange(t.date, range)) sum += t.amountCents;
  }
  return sum;
}

export function largestTransaction(transactions: Transaction[], range: DateRange): Transaction | null {
  let best: Transaction | null = null;
  for (const t of transactions) {
    if (!inRange(t.date, range)) continue;
    if (!best || t.amountCents > best.amountCents) best = t;
  }
  return best;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Is a transaction due for its next recurring occurrence (no auto-generation)? */
export function recurringDue(transaction: Transaction, now = todayISO()): boolean {
  return (
    transaction.recurring &&
    !!transaction.nextOccurrence &&
    transaction.nextOccurrence <= now
  );
}

export function nextOccurrenceAfter(transaction: Transaction, now = todayISO()): string | null {
  if (!transaction.frequency || !transaction.nextOccurrence) return null;
  const base = transaction.nextOccurrence < now ? now : transaction.nextOccurrence;
  switch (transaction.frequency) {
    case "daily":
      return addDays(base, 1);
    case "weekly":
      return addDays(base, 7);
    case "monthly":
      return addMonths(base, 1);
    case "yearly":
      return addMonths(base, 12);
  }
}

export function advanceSubscriptionDate(sub: Subscription): string {
  switch (sub.frequency) {
    case "weekly":
      return addDays(sub.nextPaymentDate, 7);
    case "monthly":
      return addMonths(sub.nextPaymentDate, 1);
    case "quarterly":
      return addMonths(sub.nextPaymentDate, 3);
    case "yearly":
      return addMonths(sub.nextPaymentDate, 12);
  }
}

/* ---------- savings goals ---------- */

export function goalProgressPercent(goal: Goal): number {
  if (goal.targetCents <= 0) return 0;
  return Math.min(100, (goal.currentCents / goal.targetCents) * 100);
}

/** Linear projection of when a goal will hit its target, based on the
 *  average saving rate since it was created (currentCents / days elapsed).
 *  Returns null -- rather than NaN/Infinity/a nonsensical date -- when
 *  there's nothing sensible to project from: the goal is already met, no
 *  progress has been made yet, or essentially no time has elapsed since it
 *  was created. */
export function projectedGoalCompletion(goal: Goal, now = todayISO()): string | null {
  if (goal.targetCents <= 0) return null;
  if (goal.currentCents <= 0) return null;
  if (goal.currentCents >= goal.targetCents) return null;
  const createdISO = toISO(new Date(goal.createdAt));
  const daysElapsed = diffDays(createdISO, now);
  if (daysElapsed <= 0) return null;
  const rate = goal.currentCents / daysElapsed; // cents saved per day
  if (!(rate > 0) || !Number.isFinite(rate)) return null;
  const remainingCents = goal.targetCents - goal.currentCents;
  const daysNeeded = Math.ceil(remainingCents / rate);
  if (!Number.isFinite(daysNeeded) || daysNeeded < 0) return null;
  return addDays(now, daysNeeded);
}

/** Suggests a category for a new transaction from the user's own history --
 *  entirely on-device, no network call and no data ever leaving the
 *  device, matching how the rest of the app works. Looks at past
 *  transactions with the exact same (case/whitespace-insensitive) merchant
 *  name and returns whichever category was used most often for it, so one
 *  stray miscategorization doesn't override an established pattern. Returns
 *  null when the merchant is new or there's nothing to learn from yet. */
export function suggestCategoryForMerchant(merchant: string, transactions: Transaction[]): string | null {
  const key = merchant.trim().toLowerCase();
  if (!key) return null;
  const counts = new Map<string, number>();
  for (const t of transactions) {
    if (t.merchant.trim().toLowerCase() !== key) continue;
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [categoryId, count] of counts) {
    if (count > bestCount) {
      best = categoryId;
      bestCount = count;
    }
  }
  return best;
}
