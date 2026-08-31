import type { insights as InsightsEn } from "../en/insights";

export const insights: typeof InsightsEn = {
  title: "תובנות",
  settingsAriaLabel: "הגדרות",

  emptyTitle: "התובנות שלכם יופיעו כאן",
  emptyMessage: "הוסיפו כמה תנועות כדי להתחיל לראות את דפוסי ההוצאה שלכם.",

  financialHealth: "בריאות פיננסית",
  points: (n: number) => `${n} נק'`,

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
