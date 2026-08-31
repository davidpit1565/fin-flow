import type { transactionDetail as TransactionDetailEn } from "../en/transactionDetail";

export const transactionDetail: typeof TransactionDetailEn = {
  title: "תנועה",
  notFoundMessage: "התנועה הזו כבר לא קיימת.",
  fallbackName: "תנועה",
  categoryLabel: "קטגוריה",
  noCategoryValue: "—",
  dateLabel: "תאריך",
  paymentMethodLabel: "אמצעי תשלום",
  noPaymentMethodValue: "—",
  paymentMethod: {
    cash: "מזומן",
    card: "כרטיס אשראי",
    bank: "העברה בנקאית",
    other: "אחר",
  },
  recurringLabel: "חוזרת",
  recurringFallback: "חוזרת",
  frequency: {
    daily: "יומי",
    weekly: "שבועי",
    monthly: "חודשי",
    yearly: "שנתי",
  },
  nextOccurrence: (date: string) => `הבא ב-${date}`,
  notesLabel: "הערות",
  deleteConfirmTitle: "למחוק את התנועה?",
  deleteConfirmMessage: "לא ניתן לבטל פעולה זו.",
};
