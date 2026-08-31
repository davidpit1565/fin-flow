import type { yearInReview as YearInReviewEn } from "../en/yearInReview";

function transactionsPhrase(count: number): string {
  if (count === 1) return "עסקה אחת";
  if (count === 2) return "שתי עסקאות";
  return `${count} עסקאות`;
}

export const yearInReview: typeof YearInReviewEn = {
  title: "סיכום שנתי",
  subtitle: "סיכום של הכספים שלכם, מבוסס על מה שנמצא במכשיר שלכם",
  previousYearAria: "השנה הקודמת",
  nextYearAria: "השנה הבאה",
  emptyTitle: "עדיין אין מה לסכם",
  emptyMessage: (year) => `עדיין אין תנועות ב-${year}. הוסיפו כמה ותראו כאן את הסיכום של ${year}.`,
  yearInNumbers: (year) => `${year} שלכם במספרים`,
  spentAcrossTransactions: (count) => `מתוך ${transactionsPhrase(count)}`,
  incomeSpendingSavingsTitle: "הכנסות, הוצאות וחיסכון",
  incomeLabel: "הכנסות",
  spentLabel: "הוצאות",
  savedNet: (amount, year) => `חסכתם נטו ${amount} ב-${year}`,
  spentMoreThanEarned: (amount, year) => `הוצאתם ${amount} יותר משהרווחתם ב-${year}`,
  topCategoryLabel: "הקטגוריה המובילה",
  topCategoryValue: (amount, percent) => `${amount} · ${percent}% מסך ההוצאות שלכם`,
  biggestExpenseLabel: "ההוצאה הבודדת הגדולה ביותר",
  busiestMonthLabel: "החודש הפעיל ביותר",
  busiestMonthValue: (amount) => `הוצאה של ${amount}`,
  subscriptionsLabel: "מנויים",
  currentYearlyTotalLabel: "סך הכול שנתי נוכחי",
  footnote: (year) => `הסיכום של ${year} מחושב כולו מהתנועות והמנויים שנמצאים במכשיר הזה.`,
};
