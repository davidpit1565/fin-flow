import type { BudgetPeriod } from "../../../types";

type BudgetLevel = "ok" | "close" | "high" | "reached" | "over";

function periodLabel(period: BudgetPeriod): string {
  switch (period) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
  }
}

function periodUnit(period: BudgetPeriod): string {
  switch (period) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "monthly":
      return "month";
  }
}

/** The noun phrase a budget message refers to -- "your food budget" for a
 *  category budget, "your monthly budget" for the overall one. Lower-cased
 *  to read naturally mid-sentence, matching how the English copy always did
 *  this by hand before. */
function budgetPhrase(period: BudgetPeriod, categoryName?: string): string {
  return (categoryName ?? periodLabel(period)).toLowerCase();
}

export const budgets = {
  screenTitle: "Budgets",
  screenSubtitle: "Set a daily, weekly, or monthly limit for your overall spending or per category",
  emptyTitle: "No budgets yet",
  emptyMessage: "Set a limit and Flow will tell you when you're getting close.",
  addBudget: "Add budget",

  overallSectionTitle: "Overall",
  addOverallBudget: "Add overall budget",
  overallEmptyMessage: "Set a limit for your overall spending. Use the “Add” button above.",

  categorySectionTitle: "Category budgets",
  categoryEmptyMessage: "Add budgets for categories like Food or Shopping. Use the “Add” button above.",

  overallBudgetSheetTitle: "Overall budget",
  categoryBudgetSheetTitle: "Category budget",
  editSheetAria: "Edit budget",
  periodFieldLabel: "Period",
  periodAria: "Budget period",
  amountPerPeriod: (period: BudgetPeriod) => `Amount per ${periodUnit(period)}`,
  budgetAmountAria: "Budget amount",
  amountPlaceholder: "0.00",
  categoryFieldLabel: "Category",
  errorAmount: "Enter a valid budget amount.",
  saveBudgetButton: "Save budget",
  budgetSavedToast: "Budget saved",

  deleteBudgetTitle: "Delete budget?",
  deleteBudgetMessage: "This only removes the budget — your transactions stay.",

  editBudgetAria: (label: string) => `Edit ${label} budget`,
  deleteBudgetAria: (label: string) => `Delete ${label} budget`,

  periodLabel,
  /** Whole-phrase period + "budget", e.g. "Monthly budget" -- built as one
   *  unit (not glued from periodLabel + " budget") since Hebrew needs the
   *  adjective after the noun and gender-agreed, not just a suffix. */
  periodBudgetLabel: (period: BudgetPeriod) => `${periodLabel(period)} budget`,

  statusMessage: (level: BudgetLevel, amount: string, period: BudgetPeriod, categoryName?: string) => {
    const phrase = budgetPhrase(period, categoryName);
    switch (level) {
      case "over":
        return `You're ${amount} over your ${phrase} budget.`;
      case "reached":
        return `You've reached your ${phrase} budget.`;
      case "high":
        return `You've used 90% of your ${phrase} budget.`;
      case "close":
        return `You're close to your ${phrase} budget.`;
      case "ok":
        return `${amount} remaining`;
    }
  },
};
