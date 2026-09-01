import type { budgets as BudgetsEn } from "../en/budgets";
import type { BudgetPeriod } from "../../../types";

type BudgetLevel = "ok" | "close" | "high" | "reached" | "over";

/** Standalone adjective, agreeing with masculine "תקציב" -- used alone as
 *  the period-tag chip (e.g. "שבועי" next to a category budget). */
function periodAdjective(period: BudgetPeriod): string {
  switch (period) {
    case "daily":
      return "יומי";
    case "weekly":
      return "שבועי";
    case "monthly":
      return "חודשי";
  }
}

function periodUnit(period: BudgetPeriod): string {
  switch (period) {
    case "daily":
      return "יום";
    case "weekly":
      return "שבוע";
    case "monthly":
      return "חודש";
  }
}

/** The whole definite noun phrase a budget message refers to:
 *  "התקציב החודשי" (the monthly budget) for an overall budget, or
 *  "תקציב המזון" (the food budget, construct state) for a category one.
 *  Building the whole phrase here -- rather than gluing an English-order
 *  "${period} budget" suffix -- is what lets the adjective land after the
 *  noun and agree with it, the way Hebrew actually works. */
function definitePhrase(period: BudgetPeriod, categoryName?: string): string {
  if (categoryName) return `תקציב ה${categoryName}`;
  return `התקציב ${periodAdjective(period)}`;
}

/** "מ" (from/of) never contracts with a following definite article, so it
 *  simply prefixes the phrase as-is: "מהתקציב החודשי", "מתקציב המזון". */
function ofPhrase(period: BudgetPeriod, categoryName?: string): string {
  return `מ${definitePhrase(period, categoryName)}`;
}

/** "ל" (to/toward) DOES contract with a leading definite "ה" (it replaces
 *  it), so "ל" + "התקציב..." becomes "לתקציב..."; a category phrase has no
 *  leading "ה" to begin with ("תקציב המזון"), so it just prefixes. */
function toPhrase(period: BudgetPeriod, categoryName?: string): string {
  const phrase = definitePhrase(period, categoryName);
  return phrase.startsWith("ה") ? `ל${phrase.slice(1)}` : `ל${phrase}`;
}

export const budgets: typeof BudgetsEn = {
  screenTitle: "תקציבים",
  screenSubtitle: "קבע מגבלה יומית, שבועית או חודשית להוצאות הכלליות שלך או לפי קטגוריה",
  emptyTitle: "אין עדיין תקציבים",
  emptyMessage: "קבע מגבלה ו-Flow תודיע לך כשאתה מתקרב אליה.",
  addBudget: "הוספת תקציב",

  overallSectionTitle: "כללי",
  addOverallBudget: "הוספת תקציב כללי",
  overallEmptyMessage: "קבע מגבלה להוצאות הכלליות שלך. השתמש בכפתור “הוספה” למעלה.",

  categorySectionTitle: "תקציבי קטגוריות",
  categoryEmptyMessage: "הוסף תקציבים לקטגוריות כמו מזון או קניות. השתמש בכפתור “הוספה” למעלה.",

  overallBudgetSheetTitle: "תקציב כללי",
  categoryBudgetSheetTitle: "תקציב קטגוריה",
  editSheetAria: "עריכת תקציב",
  periodFieldLabel: "תקופה",
  periodAria: "תקופת תקציב",
  amountPerPeriod: (period) => `סכום ל${periodUnit(period)}`,
  budgetAmountAria: "סכום התקציב",
  amountPlaceholder: "0.00",
  categoryFieldLabel: "קטגוריה",
  errorAmount: "הזן סכום תקציב תקין.",
  saveBudgetButton: "שמירת תקציב",
  budgetSavedToast: "התקציב נשמר",

  deleteBudgetTitle: "למחוק את התקציב?",
  deleteBudgetMessage: "פעולה זו רק מסירה את התקציב — התנועות שלך נשארות.",

  editBudgetAria: (label) => `עריכת תקציב ${label}`,
  deleteBudgetAria: (label) => `מחיקת תקציב ${label}`,

  periodLabel: periodAdjective,
  periodBudgetLabel: (period) => `תקציב ${periodAdjective(period)}`,

  statusMessage: (level: BudgetLevel, amount, period, categoryName) => {
    switch (level) {
      case "over":
        return `חריגה של ${amount} ${ofPhrase(period, categoryName)}.`;
      case "reached":
        return `${definitePhrase(period, categoryName)} מוצה במלואו.`;
      case "high":
        return `נוצלו 90% ${ofPhrase(period, categoryName)}.`;
      case "close":
        return `מתקרבים ${toPhrase(period, categoryName)}.`;
      case "ok":
        return `נותרו ${amount}.`;
    }
  },
};
