import type { settings as SettingsEn } from "../en/settings";

/** Hebrew count phrase for a noun with its own singular/plural form
 *  (Hebrew plurals are irregular per word, not a mechanical suffix), e.g.
 *  countPhrase(1, "עסקה", "עסקאות", true) -> "עסקה אחת"
 *  countPhrase(3, "עסקה", "עסקאות", true) -> "3 עסקאות" */
function countPhrase(n: number, singular: string, plural: string, feminine: boolean): string {
  if (n === 1) return `${singular} ${feminine ? "אחת" : "אחד"}`;
  return `${n} ${plural}`;
}

export const settings: typeof SettingsEn = {
  title: "הגדרות",

  sectionPreferences: "העדפות",
  sectionBudgets: "תקציבים",
  sectionNetWorth: "שווי נקי",
  sectionDebts: "חובות",
  sectionYearInReview: "סיכום שנתי",
  sectionNotifications: "התראות",
  sectionData: "נתונים",
  sectionBackup: "גיבוי",
  sectionCategories: "קטגוריות",
  sectionAbout: "אודות",

  currency: "מטבע",
  chooseCurrency: "בחירת מטבע",

  startOfWeek: "תחילת השבוע",
  weekMon: "שני",
  weekSun: "ראשון",

  dateFormat: "פורמט תאריך",
  dateFormatAuto: "אוטומטי",
  dateFormatDMY: "יום/חודש",
  dateFormatMDY: "חודש/יום",
  dateFormatISO: "ISO",

  theme: "ערכת נושא",
  themeSystem: "מערכת",
  themeLight: "בהיר",
  themeDark: "כהה",

  accentColor: "צבע דגש",
  accentGreen: "ירוק",
  accentBlue: "כחול",
  accentPurple: "סגול",
  accentOrange: "כתום",
  accentPink: "ורוד",

  monthlyBudgets: "תקציבים חודשיים",
  budgetsCount: (n: number) => countPhrase(n, "תקציב", "תקציבים", false),
  savingsGoals: "מטרות חיסכון",
  goalsCount: (n: number) => countPhrase(n, "מטרה", "מטרות", true),

  netWorthRow: "שווי נקי",

  debtPayoffPlanner: "תכנון סילוק חובות",
  debtsCount: (n: number) => countPhrase(n, "חוב", "חובות", false),

  yearInReviewRow: "סיכום שנתי",
  yearInReviewSub: "סיכום שנתי בסגנון Wrapped",

  notificationsTitle: "התראות",
  notificationsNotSupported: "לא נתמך בדפדפן הזה",
  notificationsOnSub: "פעילות — תזכורות בשעה 9:00",
  notificationsBlockedSub: "חסום על ידי הדפדפן",
  notificationsDefaultSub: "תזכורות תשלום והתראות תקציב",
  enableNotifications: "הפעלת התראות",

  subscriptionReminders: "תזכורות מנויים",
  subscriptionRemindersSub: "לפני כל תשלום צפוי",
  budgetAlerts: "התראות תקציב",
  budgetAlertsSub: "כשמתקרבים לתקציב או חורגים ממנו",
  monthlySummary: "סיכום חודשי",
  monthlySummarySub: "סיכום קצר בתחילת כל חודש",
  triggersUnsupportedNote: "תזכורות מתוזמנות דורשות Chrome או Edge. בדפדפנים אחרים הן מוצגות כשפותחים את Flow.",

  exportMyData: "ייצוא הנתונים שלי",
  exportMyDataSub: "CSV — תנועות ומנויים",
  importData: "ייבוא נתונים",
  importDataSub: "קובץ CSV מ-Flow או מאפליקציה אחרת",
  deleteAllData: "מחיקת כל הנתונים",
  deleteAllDataSub: "מחיקת הכול מהמכשיר הזה",

  exportEncryptedBackup: "ייצוא גיבוי מוצפן",
  exportEncryptedBackupSub: "הכול — מוגן בסיסמה שתבחר",
  restoreFromBackup: "שחזור מגיבוי",
  restoreFromBackupSub: "מחליף את כל הנתונים הנוכחיים במכשיר הזה",
  backupNote: "קובץ הגיבוי מוצפן בסיסמה שבחרת. ל-Flow אין דרך לשחזר אותה אם תשכח אותה — שמור אותה במקום בטוח.",

  manageCategories: "ניהול קטגוריות",
  categoriesCount: (n: number) => (n === 1 ? "קטגוריה אחת" : `${n} קטגוריות`),

  privacyPolicy: "מדיניות הפרטיות",
  termsOfUse: "תנאי השימוש",
  helpAndSupport: "עזרה ותמיכה",

  appLockWithFaceId: "נעילת אפליקציה עם Face ID",
  appLockNotAvailable: "לא זמין בדפדפן",
  appLockChecking: "בודק…",
  appLockRequireFaceId: "דרוש Face ID לפתיחת Flow",
  appLockSetupFirst: "יש להגדיר קודם Face ID בהגדרות ה-iOS",

  version: (v: string) => `Flow ${v}`,
  privacyFooterNote: "הנתונים הפיננסיים שלך לעולם לא יוצאים מהמכשיר הזה. בלי חשבונות, בלי שרתים, בלי פרסומות.",

  confirmFaceIdReason: "אשר עם Face ID כדי להפעיל נעילת אפליקציה",
  faceIdNotVerified: "לא הצלחנו לאמת עם Face ID — נעילת האפליקציה לא הופעלה",
  appLockEnabledToast: "נעילת האפליקציה הופעלה",

  deleteAllTitle: "למחוק את כל הנתונים?",
  deleteAllMessage: (counts: {
    transactions: number;
    subscriptions: number;
    budgets: number;
    goals: number;
    debts: number;
  }) => {
    const tx = countPhrase(counts.transactions, "עסקה", "עסקאות", true);
    const subs = countPhrase(counts.subscriptions, "מנוי", "מנויים", false);
    const budgets = countPhrase(counts.budgets, "תקציב", "תקציבים", false);
    const goals = countPhrase(counts.goals, "מטרה", "מטרות", true);
    const debts =
      counts.debts === 1 ? "וחוב אחד" : `ו־${counts.debts} חובות`;
    return `פעולה זו תמחק לצמיתות מהמכשיר הזה ${tx}, ${subs}, ${budgets}, ${goals} ${debts}, יחד עם כל ההגדרות. כדאי לייצא גיבוי מראש אם ייתכן שתזדקק לנתונים האלה בהמשך — לא ניתן לבטל פעולה זו.`;
  },
  deleteAllMessageEmpty: "פעולה זו תמחק את כל ההגדרות מהמכשיר הזה. לא ניתן לבטל אותה.",
  deleteEverything: "מחיקת הכול",

  exportReady: "הייצוא מוכן",
  exportFailed: "לא הצלחנו לייצא את הנתונים שלך. נסה שוב.",

  importedCount: (n: number) => (n === 1 ? "יובאה עסקה אחת" : `יובאו ${n} עסקאות`),
  importNothingFormat: "שום דבר לא יובא — בדוק את פורמט הקובץ.",
  importNoneFound: "לא נמצאו תנועות בקובץ.",
  importFailed: "לא הצלחנו לייבא את הקובץ הזה. נסה שוב.",

  backupExported: "הגיבוי יוצא בהצלחה",
  backupExportFailed: "לא הצלחנו ליצור את הגיבוי. נסה שוב.",

  restoreTitle: "לשחזר מגיבוי?",
  restoreMessage:
    "פעולה זו תחליף כל תנועה, מנוי, תקציב, מטרה, פריט שווי נקי, חוב והגדרה שקיימים כרגע במכשיר הזה בנתונים מקובץ הגיבוי. לא ניתן לבטל את הפעולה.",
  restoreConfirmLabel: "שחזור",
  restoreFailed: "לא הצלחנו לשחזר את הגיבוי הזה. נסה שוב.",
  backupRestored: "הגיבוי שוחזר",

  notificationsBlockedByBrowser: "התראות חסומות על ידי הדפדפן שלך.",
  notificationsOnToast: "התראות פעילות",

  chooseBackupPasswordNote: "בחר סיסמה להצפנת הגיבוי הזה. Flow לעולם לא שומרת אותה — אם תשכח אותה, לא יהיה ניתן לשחזר את הגיבוי הזה.",
  backupPassword: "סיסמת הגיבוי",
  confirmBackupPassword: "אימות סיסמת הגיבוי",
  passwordsDontMatch: "הסיסמאות לא תואמות",
  exporting: "מייצא…",
  exportBackupButton: "ייצוא גיבוי",

  enterBackupPasswordNote: "הזן את הסיסמה ששימשה להצפנת הגיבוי הזה.",
  restoring: "משחזר…",
};
