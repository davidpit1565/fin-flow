/** Native OS notification titles/bodies scheduled from `src/lib/reminders.ts`
 *  -- a pure module with no React context, so the screen/store that
 *  triggers a reminder passes this dictionary slice in instead. */
export const reminders = {
  dueToday: "today",
  dueInDays: (n: number) => `in ${n} day${n === 1 ? "" : "s"}`,
  paymentBody: (whenText: string, amount: string) => `Payment ${whenText} — ${amount}`,

  /** Title for a budget with no single category (an overall daily/weekly/
   *  monthly budget) -- a categorized budget's title is just its category
   *  name instead, so this never needs to combine with one. */
  periodBudgetTitle: (period: "daily" | "weekly" | "monthly"): string => {
    switch (period) {
      case "daily":
        return "Daily budget";
      case "weekly":
        return "Weekly budget";
      case "monthly":
        return "Monthly budget";
    }
  },
  /** `categoryName` is null for an overall (non-categorized) budget, which
   *  reads as "your budget" rather than duplicating "budget" from the
   *  period title (e.g. never "your daily budget budget"). */
  budgetAlertClose: (categoryName: string | null) =>
    categoryName ? `You're close to your ${categoryName} budget.` : "You're close to your budget.",
  budgetAlertHigh: (categoryName: string | null) =>
    categoryName ? `You've used 90% of your ${categoryName} budget.` : "You've used 90% of your budget.",
  budgetAlertReached: (categoryName: string | null) =>
    categoryName ? `You've reached your ${categoryName} budget.` : "You've reached your budget.",
  budgetAlertOver: (amount: string, categoryName: string | null) =>
    categoryName ? `You're ${amount} over your ${categoryName} budget.` : `You're ${amount} over your budget.`,

  monthlySummaryTitle: (monthLabel: string) => `${monthLabel} summary`,
  monthlySummaryBody: (monthLabel: string, amount: string) => `Spending in ${monthLabel}: ${amount}.`,
  monthlySummaryScheduledTitle: "Monthly summary",
  monthlySummaryScheduledBody: "Your spending summary is ready.",
};
