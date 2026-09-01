/** The single-transaction detail screen. */
export const transactionDetail = {
  title: "Transaction",
  notFoundMessage: "This transaction no longer exists.",
  fallbackName: "Transaction",
  categoryLabel: "Category",
  noCategoryValue: "—",
  dateLabel: "Date",
  paymentMethodLabel: "Payment method",
  noPaymentMethodValue: "—",
  paymentMethod: {
    cash: "Cash",
    card: "Card",
    bank: "Bank",
    other: "Other",
  },
  recurringLabel: "Recurring",
  recurringFallback: "Recurring",
  frequency: {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  },
  nextOccurrence: (date: string) => `next ${date}`,
  notesLabel: "Notes",
  deleteConfirmTitle: "Delete transaction?",
  deleteConfirmMessage: "This cannot be undone.",
};
