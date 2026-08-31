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

  /** `computeFinancialHealthScore` (src/lib/insights.ts) returns these as
   *  plain English identifiers used internally too (e.g. as a CSS class key)
   *  -- translate only for display, never change what the function itself
   *  returns. */
  healthTier: (tier: "needs attention" | "fair" | "good" | "excellent"): string => tier,
  /** `HealthFactor.label` (src/lib/insights.ts) is typed as a plain `string`,
   *  not a literal union, so this accepts any string but only actually
   *  translates the three labels that function ever produces -- anything
   *  else passes through unchanged rather than throwing. */
  factorLabel: (label: string): string => label,

  /** `generateMonthlyNarrative` (src/lib/insights.ts) is a pure function with
   *  no React context, so it can't call `useT()` itself -- the screen passes
   *  this exact set of sentence-builders in instead, keeping the derivation
   *  logic (which sentence applies, in what order) pure and testable while
   *  the actual wording lives here like everything else. */
  narrativeTopCategory: (categoryName: string, sharePercent: number) =>
    `${categoryName} is your biggest expense this month, making up ${sharePercent}% of your spending so far.`,
  narrativeSpendingChange: (percent: number, direction: "more" | "less") =>
    `You've spent about ${percent}% ${direction} than last month so far.`,
  narrativeBudgetOver: (overCount: number, totalCount: number) =>
    `You're over budget on ${overCount} of your ${totalCount} budget${totalCount === 1 ? "" : "s"} this month.`,
  narrativeBudgetWithinAll: (totalCount: number) => `You're within all ${totalCount} of your budgets so far this month.`,
  narrativeUnusedSubscription: (name: string, usage: "regular" | "rarely" | "unused", percentOfSubs: number) =>
    `${name} looks ${usage === "unused" ? "unused" : "rarely used"} -- dropping it could cut your subscription costs by about ${percentOfSubs}%.`,
  narrativeSpendingAnomaly: (categoryName: string, percentIncrease: number) =>
    `${categoryName} spending is up about ${percentIncrease}% versus your recent average.`,
  narrativeEmptyDefault: "Add a few transactions this month to start seeing personalized insights here.",

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
