/** The Insights screen: financial health score, monthly narrative, AI-style
 *  callouts (unused subscriptions, spending anomalies), and the spending /
 *  category charts below them. */
export const insights = {
  title: "Insights",
  settingsAriaLabel: "Settings",

  emptyTitle: "Insights will appear here",
  emptyMessage: "Add a few transactions to start seeing your spending patterns.",

  financialHealth: "Financial health",
  points: (n: number) => `${n} pts`,

  thisMonth: "This month",

  unusedSubscriptions: "Unused subscriptions",
  perMonth: (amount: string) => `${amount}/mo`,

  worthALook: "Worth a look",
  vsUsual: (percent: number) => `+${percent}% vs usual`,

  chartTimeRangeAriaLabel: "Chart time range",
  range7d: "7D",
  range1m: "1M",
  range3m: "3M",
  range6m: "6M",
  range12m: "12M",

  spending: "Spending",
  spendingChartSr: (joined: string) => `Spending chart: ${joined}.`,

  byCategory: "By category",
  categoryBreakdownSr: (joined: string) => `Category breakdown: ${joined}.`,

  spentDelta: (amount: string, lower: boolean) => `You spent ${amount} ${lower ? "less" : "more"} this month`,

  subscriptionsLabel: "Subscriptions",
  currentMonthly: "Current monthly",
  currentYearly: "Current yearly",
  subscriptionsDelta: (amount: string, lower: boolean) =>
    `${amount} ${lower ? "less" : "more"} on subscriptions this month than last`,

  topCategory: "Top category",
  largestTransaction: "Largest transaction",

  footnote: "All insights are calculated from the transactions and subscriptions you record.",
};
