/** The add/edit transaction bottom sheet (AddTransactionSheet). Payment
 *  method and recurring-frequency word lists are shared with
 *  ./transactionDetail, which shows the same values back on the detail
 *  screen -- one source of truth for those enums. */
export const transactionForm = {
  editTitle: "Edit transaction",
  addTitle: "Add transaction",
  amount: "Amount",
  typeLabel: "Type",
  typeAriaLabel: "Transaction type",
  expenseOption: "Expense",
  incomeOption: "Income",
  categoryLabel: "Category",
  categorySuggestedHint: "Suggested from your past entries with this merchant",
  merchantLabel: "Merchant",
  merchantPlaceholder: "Optional",
  dateLabel: "Date",
  notesLabel: "Notes",
  notesPlaceholder: "Optional",
  recurringLabel: "Recurring",
  recurringToggleLabel: "Recurring transaction",
  recurringFrequencyAriaLabel: "Recurring frequency",
  nextOccurrenceLabel: "Next occurrence",
  paymentMethodLabel: "Payment method",
  errorInvalidAmount: "Enter a valid amount.",
  errorChooseCategory: "Please choose a category.",
  toastChangesSaved: "Changes saved",
  toastExpenseAdded: "Expense added",
  toastIncomeAdded: "Income added",
  saveChangesButton: "Save changes",
  addExpenseButton: "Add expense",
  addIncomeButton: "Add income",
};
