/** Net Worth screen: the total card, the Assets/Liabilities sections with
 *  their fixed category chip lists, and the add/edit sheet. */
export const netWorth = {
  title: "Net Worth",
  subtitle: "Track what you own and what you owe",
  netWorthLabel: "Net worth",
  totalsSummary: (assets: string, liabilities: string) => `${assets} in assets · ${liabilities} in liabilities`,
  emptyTitle: "No net worth items yet",
  emptyMessage: "Add what you own and what you owe to track your net worth over time.",
  addAsset: "Add asset",
  addLiability: "Add liability",
  assetsSectionTitle: "Assets",
  liabilitiesSectionTitle: "Liabilities",
  assetsEmptyHint: "Add what you own, like cash, investments, or property. Use the “Add” button above.",
  liabilitiesEmptyHint: "Add what you owe, like loans or credit cards. Use the “Add” button above.",
  editAria: (name: string) => `Edit ${name}`,
  deleteAria: (name: string) => `Delete ${name}`,
  editItemSheetTitle: (kind: "asset" | "liability") => `Edit ${kind}`,
  editItemSheetAria: "Edit net worth item",
  nameFieldLabel: "Name",
  namePlaceholderAsset: "e.g. Savings account",
  namePlaceholderLiability: "e.g. Car loan",
  categoryFieldLabel: "Category",
  categoryAria: "Category",
  valueFieldLabel: "Value",
  valueAria: "Value",
  enterName: "Enter a name.",
  enterValidValue: "Enter a valid value.",
  assetUpdated: "Asset updated",
  assetAdded: "Asset added",
  liabilityUpdated: "Liability updated",
  liabilityAdded: "Liability added",
  saveChanges: "Save changes",
  deleteItemConfirmTitle: (kind: "asset" | "liability") => `Delete this ${kind}?`,
  deleteItemConfirmMessage: "This can't be undone.",
  /** Fixed category chip labels -- UI chrome/options, unlike freeform
   *  category NAMES elsewhere in the app which are user data. `id` is the
   *  canonical (English) identifier stored on the item, which stays
   *  unchanged across languages -- only the displayed label is localized. */
  categoryLabel(id: string): string {
    const labels: Record<string, string> = {
      Cash: "Cash",
      Investments: "Investments",
      Property: "Property",
      Vehicle: "Vehicle",
      Other: "Other",
      Loan: "Loan",
      "Credit Card": "Credit Card",
      Mortgage: "Mortgage",
    };
    return labels[id] ?? id;
  },
};
