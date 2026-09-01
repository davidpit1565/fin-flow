import type { PaymentMethod, SubscriptionFrequency, SubscriptionStatus, SubscriptionUsage } from "../../../types";

function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    case "bank":
      return "Bank";
    case "other":
      return "Other";
  }
}

function frequencyChipLabel(freq: SubscriptionFrequency): string {
  switch (freq) {
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Yearly";
  }
}

function reminderChipLabel(value: "none" | "0" | "1" | "3" | "7"): string {
  switch (value) {
    case "none":
      return "None";
    case "0":
      return "Same day";
    case "1":
      return "1 day";
    case "3":
      return "3 days";
    case "7":
      return "7 days";
  }
}

function reminderDaysPhrase(days: number): string {
  switch (days) {
    case 0:
      return "Same day";
    case 1:
      return "1 day before";
    case 3:
      return "3 days before";
    case 7:
      return "7 days before";
    default:
      return `${days} days before`;
  }
}

function usageChipLabel(usage: SubscriptionUsage): string {
  switch (usage) {
    case "regular":
      return "Regularly";
    case "rarely":
      return "Rarely";
    case "unused":
      return "Unused";
  }
}

/** Subscriptions list, detail screen, and the add/edit sheet. Merged into one
 *  namespace since the sheet is really just "edit mode" of the detail
 *  screen and shares most of its vocabulary (field labels, frequency,
 *  payment method, reminders, usage). */
export const subscriptions = {
  /* ---- list screen ---- */
  title: "Subscriptions",
  settingsAriaLabel: "Settings",
  recurringCost: "Recurring cost",
  yearlyEquivalentNote: (yearlyAmount: string) => `${yearlyAmount} / year`,
  activeStatLabel: "Active",
  upcomingStatLabel: "Upcoming",
  costFootnote: "Monthly cost is calculated from your billing frequencies — it never guesses.",
  allPausedOrCancelled: "All subscriptions are paused or cancelled.",
  emptyTitle: "No subscriptions yet",
  emptyMessage: "Add your recurring payments and we'll keep them organized.",

  /* ---- delete confirm (list + detail) ---- */
  deleteConfirmTitle: "Delete subscription?",
  deleteConfirmMessage: (name: string) => `${name} will be removed. This cannot be undone.`,
  deleteConfirmMessageActive: (name: string) => `${name} is active. Deleting removes it from Flow. This cannot be undone.`,
  deleteConfirmMessageInactive: "This cannot be undone.",
  deleteAriaLabel: (name: string) => `Delete ${name}`,

  /* ---- detail screen ---- */
  detailTitle: "Subscription",
  notFound: "This subscription no longer exists.",
  editSubscription: "Edit subscription",
  statusLabel: (status: SubscriptionStatus): string => (status === "active" ? "Active" : status === "paused" ? "Paused" : "Cancelled"),
  perFrequency: (freq: SubscriptionFrequency) => ` / ${freq}`,
  nextPaymentPrefix: "Next payment",
  remindersOffSuffix: " · reminders off",
  recordPaymentButton: "Record payment",
  monthlyEquivalentLabel: "Monthly equivalent",
  yearlyEquivalentLabel: "Yearly equivalent",
  categoryFieldLabel: "Category",
  nextPaymentLabel: "Next payment",
  paymentMethodFieldLabel: "Payment method",
  reminderFieldLabel: "Reminder",
  reminderDetailValue: (days: number | null) => (days === null ? "Off" : `${reminderDaysPhrase(days)} · 9:00 AM`),
  usageFieldLabel: "Usage",
  usageLabel: (usage: SubscriptionUsage): string => (usage === "regular" ? "Used regularly" : usage === "rarely" ? "Rarely used" : "Unused"),
  notesFieldLabel: "Notes",
  paymentMethodLabel,
  emptyDash: "—",

  paymentHistoryTitle: "Payment history",
  paymentHistoryEmpty: "No payments recorded yet. Tap “Record payment” when one happens.",
  paymentRecorded: "Payment recorded",

  pauseButton: "Pause",
  resumeButton: "Resume",
  pausedToast: "Subscription paused",
  resumedToast: "Subscription resumed",
  cancelRecordButton: "Cancel subscription record",
  cancelRecordTitle: "Cancel subscription record?",
  cancelRecordMessage: (name: string) =>
    `${name} will be marked as cancelled and its reminders stopped. You can reactivate it later. Flow only tracks subscriptions — it never cancels the real one.`,
  cancelRecordConfirmLabel: "Cancel record",
  recordCancelledToast: "Record cancelled",
  reactivateButton: "Reactivate",
  reactivatedToast: "Subscription reactivated",
  disclaimer: "Flow only tracks this subscription. It never cancels your real-world subscription.",

  /* ---- add/edit sheet ---- */
  addSubscription: "Add subscription",
  serviceNameLabel: "Service name",
  serviceNamePlaceholder: "Netflix",
  amountFieldLabel: "Amount",
  amountPlaceholder: "0.00",
  billingFrequencyLabel: "Billing frequency",
  frequencyChipLabel,
  categoryPickerAria: "Subscription category",
  notificationReminderLabel: "Notification reminder",
  reminderChipLabel,
  reminderTimingAria: "Reminder timing",
  reminderPassedWarning:
    "This reminder time has already passed for the selected next payment date, so it won't be sent. Pick a later payment date or a shorter reminder window.",
  remindersHint: "Reminders are sent at 9:00 AM local time.",
  usageQuestionLabel: "How often do you use it?",
  usageChipLabel,
  usageAria: "Usage",
  usageHint: "Used to estimate potential savings.",
  notesPlaceholder: "Optional",
  saveChanges: "Save changes",

  errorServiceName: "Please enter a service name.",
  errorAmount: "Enter a valid amount.",
  errorCategory: "Please choose a category.",
  changesSavedToast: "Changes saved",
  subscriptionAddedToast: "Subscription added",

  /* ---- row (shared rows.tsx) ---- */
  rowMeta: (status: SubscriptionStatus, freq: SubscriptionFrequency, dateLabel: string) =>
    `${status === "paused" ? "Paused · " : status === "cancelled" ? "Cancelled · " : ""}${freq} · next ${dateLabel}`,
  monthlyEquivalentInline: (amount: string) => `${amount}/mo`,
};
