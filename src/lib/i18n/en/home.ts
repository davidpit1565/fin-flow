/** The Home screen: the primary dashboard -- spending summary, upcoming
 *  payments, category breakdown, budget status, and potential savings. */

type Period = "month" | "last" | "3m" | "year";
type BudgetPeriod = "daily" | "weekly" | "monthly";
type SubscriptionFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

const FREQUENCY_WORD_EN: Record<SubscriptionFrequency, string> = {
  weekly: "week",
  monthly: "month",
  quarterly: "3 months",
  yearly: "year",
};

const BUDGET_PERIOD_WORD_EN: Record<BudgetPeriod, string> = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
};

const BUDGET_PERIOD_REMAINING_EN: Record<BudgetPeriod, string> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
};

export const home = {
  title: "Your finances",
  greetingMorning: "Good morning",
  greetingAfternoon: "Good afternoon",
  greetingEvening: "Good evening",
  settingsAriaLabel: "Settings",

  emptyTitle: "Start tracking your money",
  emptyMessage: "Add your first expense to see your spending here.",
  addExpense: "Add expense",

  spentLabel: (period: Period): string => {
    switch (period) {
      case "last":
        return "Spent previous month";
      case "3m":
        return "Spent the last 3 months";
      case "year":
        return "Spent this year";
      default:
        return "Spent this month";
    }
  },
  periodOptionMonth: "This month",
  periodOptionLast: "Prev. month",
  periodOption3m: "3 months",
  periodOptionYear: "This year",
  spendingPeriodAriaLabel: "Spending period",

  comparedToPrevious: (amount: string, lower: boolean) => `${amount} ${lower ? "less" : "more"} than the previous period`,

  income: "Income",
  expenses: "Expenses",
  remaining: "Remaining",

  subscriptions: "Subscriptions",
  upcoming: "Upcoming",
  perMonth: (amount: string) => `${amount}/mo`,

  comingUp: "Coming up",
  viewAll: "View all",
  noUpcomingPayments: "No upcoming payments.",
  addSubscriptionLink: "Add a subscription",
  toSeeThemHere: "to see them here.",
  every: (freq: SubscriptionFrequency) => `Every ${FREQUENCY_WORD_EN[freq]}`,

  whereYourMoneyGoes: "Where your money goes",

  budgetSectionTitle: (period: BudgetPeriod) => {
    const word = BUDGET_PERIOD_WORD_EN[period];
    return `${word[0].toUpperCase()}${word.slice(1)} budget`;
  },
  manage: "Manage",
  budgetExceeded: (period: BudgetPeriod, amountOver: string) =>
    `You've exceeded your ${BUDGET_PERIOD_WORD_EN[period]} budget by ${amountOver}.`,
  budgetReached: (period: BudgetPeriod) => `You've reached your ${BUDGET_PERIOD_WORD_EN[period]} budget.`,
  budgetHigh: (period: BudgetPeriod, percent: number) =>
    `You've used ${percent}% of your ${BUDGET_PERIOD_WORD_EN[period]} budget.`,
  budgetClose: (period: BudgetPeriod) => `You're getting close to your ${BUDGET_PERIOD_WORD_EN[period]} budget.`,
  budgetRemaining: (period: BudgetPeriod, amountRemaining: string) =>
    `${amountRemaining} remaining ${BUDGET_PERIOD_REMAINING_EN[period]}`,
  setBudgetPrompt: "Set a budget to keep an eye on your spending.",
  setBudgetLink: "Set budget",

  potentialSavings: "Potential savings",
  currentlySpendPrefix: "You currently spend",
  currentlySpendAmount: (amount: string) => `${amount}/month`,
  currentlySpendSuffix: " on subscriptions.",
  savingsEstimatePrefix: "You could save approximately",
  savingsEstimateAmount: (amount: string) => `${amount}/month`,
  savingsEstimateSuffix: " by reviewing:",
  unused: "Unused",
  rarelyUsed: "Rarely used",
};
