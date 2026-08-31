import type { home as HomeEn } from "../en/home";

type Period = "month" | "last" | "3m" | "year";
type BudgetPeriod = "daily" | "weekly" | "monthly";
type SubscriptionFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

/** Hebrew adjective forms already carrying the definite article ("ה-"), so
 *  they slot straight into "מהתקציב ${adj}" / "לתקציב ${adj}". */
const BUDGET_PERIOD_ADJ_HE: Record<BudgetPeriod, string> = {
  daily: "היומי",
  weekly: "השבועי",
  monthly: "החודשי",
};

const BUDGET_PERIOD_TITLE_HE: Record<BudgetPeriod, string> = {
  daily: "תקציב יומי",
  weekly: "תקציב שבועי",
  monthly: "תקציב חודשי",
};

const BUDGET_PERIOD_REMAINING_HE: Record<BudgetPeriod, string> = {
  daily: "היום",
  weekly: "השבוע",
  monthly: "החודש",
};

const FREQUENCY_WORD_HE: Record<SubscriptionFrequency, string> = {
  weekly: "שבוע",
  monthly: "חודש",
  quarterly: "3 חודשים",
  yearly: "שנה",
};

export const home: typeof HomeEn = {
  title: "הכספים שלך",
  greetingMorning: "בוקר טוב",
  greetingAfternoon: "צהריים טובים",
  greetingEvening: "ערב טוב",
  settingsAriaLabel: "הגדרות",

  emptyTitle: "התחילו לעקוב אחרי הכסף שלכם",
  emptyMessage: "הוסיפו את ההוצאה הראשונה שלכם כדי לראות כאן את ההוצאות שלכם.",
  addExpense: "הוספת הוצאה",

  spentLabel: (period: Period): string => {
    switch (period) {
      case "last":
        return "ההוצאות בחודש הקודם";
      case "3m":
        return "ההוצאות ב-3 החודשים האחרונים";
      case "year":
        return "ההוצאות השנה";
      default:
        return "ההוצאות החודש";
    }
  },
  periodOptionMonth: "החודש",
  periodOptionLast: "חודש קודם",
  periodOption3m: "3 חודשים",
  periodOptionYear: "השנה",
  spendingPeriodAriaLabel: "תקופת ההוצאה",

  comparedToPrevious: (amount: string, lower: boolean) => `${amount} ${lower ? "פחות" : "יותר"} מהתקופה הקודמת`,

  income: "הכנסות",
  expenses: "הוצאות",
  remaining: "יתרה",

  subscriptions: "מנויים",
  upcoming: "בקרוב",
  perMonth: (amount: string) => `${amount} לחודש`,

  comingUp: "התשלומים הקרובים",
  viewAll: "הצג הכול",
  noUpcomingPayments: "אין תשלומים קרובים.",
  addSubscriptionLink: "הוספת מנוי",
  toSeeThemHere: "כדי לראות אותם כאן.",
  every: (freq: SubscriptionFrequency) => `כל ${FREQUENCY_WORD_HE[freq]}`,

  whereYourMoneyGoes: "לאן הכסף שלכם הולך",

  budgetSectionTitle: (period: BudgetPeriod) => BUDGET_PERIOD_TITLE_HE[period],
  manage: "ניהול",
  budgetExceeded: (period: BudgetPeriod, amountOver: string) => `חריגה מהתקציב ${BUDGET_PERIOD_ADJ_HE[period]} בסך ${amountOver}.`,
  budgetReached: (period: BudgetPeriod) => `הגעה לתקציב ${BUDGET_PERIOD_ADJ_HE[period]}.`,
  budgetHigh: (period: BudgetPeriod, percent: number) => `נוצלו ${percent}% מהתקציב ${BUDGET_PERIOD_ADJ_HE[period]}.`,
  budgetClose: (period: BudgetPeriod) => `התקרבות לתקציב ${BUDGET_PERIOD_ADJ_HE[period]}.`,
  budgetRemaining: (period: BudgetPeriod, amountRemaining: string) =>
    `נותרו ${amountRemaining} ${BUDGET_PERIOD_REMAINING_HE[period]}`,
  setBudgetPrompt: "כדאי להגדיר תקציב כדי לעקוב אחרי ההוצאות שלכם.",
  setBudgetLink: "הגדרת תקציב",

  potentialSavings: "חיסכון פוטנציאלי",
  currentlySpendPrefix: "ההוצאה החודשית שלכם על מנויים היא",
  currentlySpendAmount: (amount: string) => `${amount}`,
  currentlySpendSuffix: ".",
  savingsEstimatePrefix: "אפשר לחסוך בערך",
  savingsEstimateAmount: (amount: string) => `${amount} לחודש`,
  savingsEstimateSuffix: " על ידי בדיקת:",
  unused: "לא בשימוש",
  rarelyUsed: "בשימוש נדיר",
};
