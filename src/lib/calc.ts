import type {
  Budget,
  Category,
  CategoryTotal,
  MonthlySummary,
  Subscription,
  Transaction,
  UpcomingPayment,
} from "../types";
import { addDays, addMonths, diffDays, lastMonths, monthLabel, parseISO, relativeDay, shortDate, todayISO } from "./dates";

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

/** Upcoming payments: active subs due within the next 90 days (or overdue), sorted by date. */
export function upcomingPayments(subscriptions: Subscription[], now = todayISO()): UpcomingPayment[] {
  const horizon = addDays(now, 90);
  return activeSubscriptions(subscriptions)
    .filter((s) => s.nextPaymentDate <= horizon)
    .map((s) => {
      const overdue = s.nextPaymentDate < now;
      const label = relativeDay(s.nextPaymentDate, now) ?? shortDate(s.nextPaymentDate, { includeYear: true });
      return {
        subscription: s,
        date: s.nextPaymentDate,
        amountCents: s.amountCents,
        label: overdue ? `Overdue · ${label}` : label,
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function upcomingTotalCents(subscriptions: Subscription[], now = todayISO()): number {
  return upcomingPayments(subscriptions, now).reduce((sum, u) => sum + u.amountCents, 0);
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

export function budgetStatus(budget: Budget, transactions: Transaction[], month = todayISO()): BudgetStatus {
  const range: DateRange = { from: `${month.slice(0, 7)}-01`, to: month, label: month };
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
