import type { insights as InsightsEn } from "../en/insights";

export const insights: typeof InsightsEn = {
  title: "תובנות",
  settingsAriaLabel: "הגדרות",

  emptyTitle: "התובנות שלכם יופיעו כאן",
  emptyMessage: "הוסיפו כמה תנועות כדי להתחיל לראות את דפוסי ההוצאה שלכם.",

  financialHealth: "בריאות פיננסית",
  points: (n: number) => `${n} נק'`,

  healthTier: (tier) => {
    switch (tier) {
      case "needs attention":
        return "דורש תשומת לב";
      case "fair":
        return "סביר";
      case "good":
        return "טוב";
      case "excellent":
        return "מצוין";
    }
  },
  factorLabel: (label) => {
    switch (label) {
      case "Savings rate":
        return "שיעור חיסכון";
      case "Budget adherence":
        return "עמידה בתקציב";
      case "Subscription load":
        return "עומס מנויים";
      default:
        return label;
    }
  },

  narrativeTopCategory: (categoryName, sharePercent) =>
    `ההוצאה הגדולה ביותר שלכם החודש היא ${categoryName}, שמהווה כ-${sharePercent}% מההוצאות שלכם עד כה.`,
  narrativeSpendingChange: (percent, direction) =>
    `הוצאתם בערך ${percent}% ${direction === "more" ? "יותר" : "פחות"} מאשר החודש שעבר, עד כה.`,
  narrativeBudgetOver: (overCount, totalCount) =>
    totalCount === 1
      ? "חרגתם מהתקציב שלכם החודש."
      : `חרגתם מ-${overCount} מתוך ${totalCount} התקציבים שלכם החודש.`,
  narrativeBudgetWithinAll: (totalCount) =>
    totalCount === 1 ? "אתם בתוך התקציב שלכם עד כה החודש." : `אתם בתוך כל ${totalCount} התקציבים שלכם עד כה החודש.`,
  narrativeUnusedSubscription: (name, usage, percentOfSubs) =>
    `${name} נראה ${usage === "unused" ? "לא בשימוש" : "בשימוש נדיר"} -- ביטולו יכול לחתוך כ-${percentOfSubs}% מעלות המנויים שלכם.`,
  narrativeSpendingAnomaly: (categoryName, percentIncrease) =>
    `ההוצאה בקטגוריית ${categoryName} עלתה בכ-${percentIncrease}% לעומת הממוצע האחרון שלכם.`,
  narrativeEmptyDefault: "הוסיפו כמה תנועות החודש כדי להתחיל לראות כאן תובנות מותאמות אישית.",

  thisMonth: "החודש",

  unusedSubscriptions: "מנויים לא בשימוש",
  perMonth: (amount: string) => `${amount} לחודש`,

  worthALook: "שווה בדיקה",
  vsUsual: (percent: number) => `+${percent}% מהרגיל`,

  chartTimeRangeAriaLabel: "טווח זמן לתרשים",
  range7d: "7D",
  range1m: "1M",
  range3m: "3M",
  range6m: "6M",
  range12m: "12M",
  lastNDays: (n) => `${n} הימים האחרונים`,

  spending: "הוצאות",
  spendingChartSr: (joined: string) => `תרשים ההוצאות: ${joined}.`,

  byCategory: "לפי קטגוריה",
  categoryBreakdownSr: (joined: string) => `פירוט לפי קטגוריה: ${joined}.`,

  spentDelta: (amount: string, lower: boolean) => `${amount} ${lower ? "פחות" : "יותר"} החודש`,

  subscriptionsLabel: "מנויים",
  currentMonthly: "עלות חודשית",
  currentYearly: "עלות שנתית",
  subscriptionsDelta: (amount: string, lower: boolean) =>
    `${amount} ${lower ? "פחות" : "יותר"} על מנויים החודש לעומת החודש שעבר`,

  topCategory: "הקטגוריה המובילה",
  largestTransaction: "התנועה הגדולה ביותר",

  footnote: "כל התובנות מחושבות מהתנועות והמנויים שאתם מתעדים.",
};
