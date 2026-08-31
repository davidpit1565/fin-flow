import type { reminders as RemindersEn } from "../en/reminders";

export const reminders: typeof RemindersEn = {
  dueToday: "היום",
  dueInDays: (n) => `בעוד ${n} ${n === 1 ? "יום" : "ימים"}`,
  paymentBody: (whenText, amount) => `תשלום ${whenText} — ${amount}`,

  periodBudgetTitle: (period) => {
    switch (period) {
      case "daily":
        return "תקציב יומי";
      case "weekly":
        return "תקציב שבועי";
      case "monthly":
        return "תקציב חודשי";
    }
  },
  budgetAlertClose: (categoryName) =>
    categoryName ? `אתם מתקרבים לתקציב ${categoryName} שלכם.` : "אתם מתקרבים לתקציב שלכם.",
  budgetAlertHigh: (categoryName) =>
    categoryName ? `ניצלתם 90% מתקציב ${categoryName} שלכם.` : "ניצלתם 90% מהתקציב שלכם.",
  budgetAlertReached: (categoryName) =>
    categoryName ? `הגעתם לתקציב ${categoryName} שלכם.` : "הגעתם לתקציב שלכם.",
  budgetAlertOver: (amount, categoryName) =>
    categoryName ? `חרגתם ב-${amount} מתקציב ${categoryName} שלכם.` : `חרגתם ב-${amount} מהתקציב שלכם.`,

  monthlySummaryTitle: (monthLabel) => `סיכום ${monthLabel}`,
  monthlySummaryBody: (monthLabel, amount) => `הוצאות בחודש ${monthLabel}: ${amount}.`,
  monthlySummaryScheduledTitle: "סיכום חודשי",
  monthlySummaryScheduledBody: "סיכום ההוצאות שלכם מוכן.",
};
