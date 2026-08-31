/** Category management: the single-category transaction list (CategoryScreen)
 *  and the manage-categories screen (CategoriesScreen). A user-created
 *  category's name is their own data and is never translated -- but the 13
 *  categories we seed for every new user (`DEFAULT_CATEGORIES` in
 *  src/lib/icons.ts, `isSystem: true`) are our own copy, not theirs, so
 *  `systemName` translates those for display while leaving the stored
 *  `Category.name` untouched (so CSV import/export category matching and a
 *  future language switch both keep working against the original English
 *  value). Call it only for `isSystem` categories -- see
 *  `categoryDisplayName` in src/lib/i18n/index.tsx. */
export const categories = {
  systemName: (name: string): string => name,
  itemCount: (count: number) => `${count} ${count === 1 ? "transaction" : "transactions"}`,
  screenTitle: "Categories",
  screenSubtitle: "Rename, re-icon, or add your own",
  rowSummary: (count: number, isSystem: boolean) => `${count} ${count === 1 ? "item" : "items"}${isSystem ? " · default" : ""}`,
  editAriaLabel: (name: string) => `Edit ${name}`,
  deleteAriaLabel: (name: string) => `Delete ${name}`,
  addCategoryButton: "Add category",
  editCategorySheetTitle: "Edit category",
  editCategoryAriaLabel: "Edit category",
  nameLabel: "Name",
  namePlaceholder: "Category name",
  iconLabel: "Icon",
  iconGridAriaLabel: "Category icon",
  saveChangesButton: "Save changes",
  toastEnterName: "Please enter a category name.",
  toastDuplicateName: "A category with this name already exists.",
  toastCategoryUpdated: "Category updated",
  toastCategoryAdded: "Category added",
  toastNeedOneCategory: "You need at least one category.",
  reassignConfirmTitle: (name: string) => `Reassign ${name}?`,
  reassignConfirmMessage: (count: number) =>
    `${count} ${count === 1 ? "transaction or subscription uses" : "transactions or subscriptions use"} this category. Choose a category to move them to before deleting.`,
  reassignConfirmLabel: "Reassign & delete",
  deleteConfirmTitle: (name: string) => `Delete ${name}?`,
  deleteConfirmMessage: "This cannot be undone.",
  moveSheetTitle: (name: string) => `Move ${name} items`,
  moveSheetAriaLabel: "Choose destination category",
  moveToLabel: "Move to",
  moveButtonText: (name: string) => `Move items & delete ${name}`,
};
