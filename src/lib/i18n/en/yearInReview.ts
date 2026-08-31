/** Year in Review screen: the year picker, the empty-year message, the
 *  "wrapped"-style hero, and the insight tiles. */
export const yearInReview = {
  title: "Year in review",
  subtitle: "A recap of your finances, built from what's on your device",
  previousYearAria: "Previous year",
  nextYearAria: "Next year",
  emptyTitle: "Nothing to look back on yet",
  emptyMessage: (year: number) => `No transactions yet in ${year}. Add a few and your ${year} recap will appear here.`,
  yearInNumbers: (year: number) => `Your ${year} in numbers`,
  /** Mirrors the English source's `count === 1 ? "" : "s"` branch. */
  spentAcrossTransactions: (count: number) => `spent across ${count} transaction${count === 1 ? "" : "s"}`,
  incomeSpendingSavingsTitle: "Income, spending & savings",
  incomeLabel: "Income",
  spentLabel: "Spent",
  savedNet: (amount: string, year: number) => `You saved ${amount} net in ${year}`,
  spentMoreThanEarned: (amount: string, year: number) => `You spent ${amount} more than you earned in ${year}`,
  topCategoryLabel: "Top category",
  topCategoryValue: (amount: string, percent: number) => `${amount} · ${percent}% of your spending`,
  biggestExpenseLabel: "Biggest single expense",
  busiestMonthLabel: "Busiest month",
  busiestMonthValue: (amount: string) => `${amount} spent`,
  subscriptionsLabel: "Subscriptions",
  currentYearlyTotalLabel: "Current yearly total",
  footnote: (year: number) => `Your ${year} recap is calculated entirely from the transactions and subscriptions on this device.`,
};
