import type { appShell as AppShellEn } from "../en/appShell";

export const appShell: typeof AppShellEn = {
  mainNavigation: "ניווט ראשי",
  addTransaction: "הוספת תנועה",
  tabHome: "בית",
  tabTransactions: "תנועות",
  tabSubscriptions: "מנויים",
  tabInsights: "תובנות",
  tabSettings: "הגדרות",
  loadErrorTitle: "ל-Flow לא הצליחה לטעון את הנתונים שלך",
  loadErrorHint:
    "זה יכול לקרות בגלישה פרטית, או אם האחסון בדפדפן חסום. נסה שוב, או עבור למצב גלישה רגיל.",
  tryAgain: "נסה שוב",
  lockedTitle: "Flow נעולה",
  lockedFaceIdFailed: "זיהוי הפנים לא אימת שזה אתה.",
  unlockChecking: "בודק…",
  unlockButton: "פתיחה עם Face ID",
  unlockPromptReason: "פתיחת Flow",
};
