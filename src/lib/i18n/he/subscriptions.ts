import type { subscriptions as SubscriptionsEn } from "../en/subscriptions";
import type { PaymentMethod, SubscriptionFrequency, SubscriptionStatus, SubscriptionUsage } from "../../../types";

function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "cash":
      return "מזומן";
    case "card":
      return "כרטיס אשראי";
    case "bank":
      return "העברה בנקאית";
    case "other":
      return "אחר";
  }
}

/** Standalone adjective form, used for the frequency chip picker and the
 *  row subtitle -- e.g. "שבועי" ("weekly") reads fine as a tag on its own. */
function frequencyAdjective(freq: SubscriptionFrequency): string {
  switch (freq) {
    case "weekly":
      return "שבועי";
    case "monthly":
      return "חודשי";
    case "quarterly":
      return "רבעוני";
    case "yearly":
      return "שנתי";
  }
}

/** "per week/month/quarter/year" -- used after an amount, e.g. "9.99 ₪ לחודש". */
function frequencyPerUnit(freq: SubscriptionFrequency): string {
  switch (freq) {
    case "weekly":
      return "לשבוע";
    case "monthly":
      return "לחודש";
    case "quarterly":
      return "לרבעון";
    case "yearly":
      return "לשנה";
  }
}

function reminderChipLabel(value: "none" | "0" | "1" | "3" | "7"): string {
  switch (value) {
    case "none":
      return "ללא";
    case "0":
      return "באותו יום";
    case "1":
      return "יום אחד";
    case "3":
      return "3 ימים";
    case "7":
      return "7 ימים";
  }
}

function reminderDaysPhrase(days: number): string {
  switch (days) {
    case 0:
      return "באותו יום";
    case 1:
      return "יום לפני";
    case 3:
      return "3 ימים לפני";
    case 7:
      return "7 ימים לפני";
    default:
      return `${days} ימים לפני`;
  }
}

function usageChipLabel(usage: SubscriptionUsage): string {
  switch (usage) {
    case "regular":
      return "באופן קבוע";
    case "rarely":
      return "לעיתים רחוקות";
    case "unused":
      return "לא בשימוש";
  }
}

export const subscriptions: typeof SubscriptionsEn = {
  /* ---- list screen ---- */
  title: "מנויים",
  settingsAriaLabel: "הגדרות",
  recurringCost: "עלות חוזרת",
  yearlyEquivalentNote: (yearlyAmount) => `${yearlyAmount} לשנה`,
  activeStatLabel: "פעילים",
  upcomingStatLabel: "קרובים",
  costFootnote: "העלות החודשית מחושבת לפי תדירויות החיוב שלך — היא אף פעם לא מנחשת.",
  allPausedOrCancelled: "כל המנויים מושהים או מבוטלים.",
  emptyTitle: "אין עדיין מנויים",
  emptyMessage: "הוסף את התשלומים החוזרים שלך ואנחנו נשמור עליהם מסודרים.",

  /* ---- delete confirm (list + detail) ---- */
  deleteConfirmTitle: "למחוק את המנוי?",
  deleteConfirmMessage: (name) => `${name} יוסר. לא ניתן לבטל פעולה זו.`,
  deleteConfirmMessageActive: (name) => `${name} פעיל כרגע. מחיקה תסיר אותו מ-Flow. לא ניתן לבטל פעולה זו.`,
  deleteConfirmMessageInactive: "לא ניתן לבטל פעולה זו.",
  deleteAriaLabel: (name) => `מחיקת ${name}`,

  /* ---- detail screen ---- */
  detailTitle: "מנוי",
  notFound: "המנוי הזה כבר לא קיים.",
  editSubscription: "עריכת מנוי",
  statusLabel: (status: SubscriptionStatus): string => (status === "active" ? "פעיל" : status === "paused" ? "מושהה" : "בוטל"),
  perFrequency: (freq) => ` ${frequencyPerUnit(freq)}`,
  nextPaymentPrefix: "התשלום הבא",
  remindersOffSuffix: " · תזכורות כבויות",
  recordPaymentButton: "רישום תשלום",
  monthlyEquivalentLabel: "שווה ערך חודשי",
  yearlyEquivalentLabel: "שווה ערך שנתי",
  categoryFieldLabel: "קטגוריה",
  nextPaymentLabel: "תשלום הבא",
  paymentMethodFieldLabel: "אמצעי תשלום",
  reminderFieldLabel: "תזכורת",
  reminderDetailValue: (days: number | null) => (days === null ? "כבוי" : `${reminderDaysPhrase(days)} · 9:00 בבוקר`),
  usageFieldLabel: "שימוש",
  usageLabel: (usage) => (usage === "regular" ? "בשימוש קבוע" : usage === "rarely" ? "בשימוש נדיר" : "לא בשימוש"),
  notesFieldLabel: "הערות",
  paymentMethodLabel,
  emptyDash: "—",

  paymentHistoryTitle: "היסטוריית תשלומים",
  paymentHistoryEmpty: "עדיין לא נרשמו תשלומים. הקישו על “רישום תשלום” כשזה יקרה.",
  paymentRecorded: "התשלום נרשם",

  pauseButton: "השהיה",
  resumeButton: "המשך",
  pausedToast: "המנוי הושהה",
  resumedToast: "המנוי חודש",
  cancelRecordButton: "ביטול רישום המנוי",
  cancelRecordTitle: "לבטל את רישום המנוי?",
  cancelRecordMessage: (name) =>
    `${name} יסומן כמבוטל והתזכורות עליו ייפסקו. ניתן להפעיל אותו מחדש בכל שלב. Flow רק עוקבת אחרי מנויים — היא אף פעם לא מבטלת את המנוי האמיתי.`,
  cancelRecordConfirmLabel: "ביטול רישום",
  recordCancelledToast: "הרישום בוטל",
  reactivateButton: "הפעלה מחדש",
  reactivatedToast: "המנוי הופעל מחדש",
  disclaimer: "Flow עוקבת רק אחרי המנוי הזה. היא אף פעם לא מבטלת את המנוי האמיתי שלך.",

  /* ---- add/edit sheet ---- */
  addSubscription: "הוספת מנוי",
  serviceNameLabel: "שם השירות",
  serviceNamePlaceholder: "Netflix",
  amountFieldLabel: "סכום",
  amountPlaceholder: "0.00",
  billingFrequencyLabel: "תדירות חיוב",
  frequencyChipLabel: frequencyAdjective,
  categoryPickerAria: "קטגוריית מנוי",
  notificationReminderLabel: "תזכורת התראה",
  reminderChipLabel,
  reminderTimingAria: "תזמון תזכורת",
  reminderPassedWarning:
    "מועד התזכורת הזה כבר עבר עבור תאריך התשלום הבא שנבחר, ולכן היא לא תישלח. בחר תאריך תשלום מאוחר יותר או חלון תזכורת קצר יותר.",
  remindersHint: "התזכורות נשלחות בשעה 9:00 בבוקר לפי השעון המקומי.",
  usageQuestionLabel: "באיזו תדירות אתה משתמש בזה?",
  usageChipLabel,
  usageAria: "שימוש",
  usageHint: "משמש להערכת החיסכון הפוטנציאלי.",
  notesPlaceholder: "לא חובה",
  saveChanges: "שמירת שינויים",

  errorServiceName: "נא להזין שם שירות.",
  errorAmount: "הזן סכום תקין.",
  errorCategory: "נא לבחור קטגוריה.",
  changesSavedToast: "השינויים נשמרו",
  subscriptionAddedToast: "המנוי נוסף",

  /* ---- row (shared rows.tsx) ---- */
  rowMeta: (status, freq, dateLabel) =>
    `${status === "paused" ? "מושהה · " : status === "cancelled" ? "בוטל · " : ""}${frequencyAdjective(freq)} · התשלום הבא ${dateLabel}`,
  monthlyEquivalentInline: (amount) => `${amount} לחודש`,
};
