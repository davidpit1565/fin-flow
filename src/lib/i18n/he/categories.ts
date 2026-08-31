import type { categories as CategoriesEn } from "../en/categories";

export const categories: typeof CategoriesEn = {
  systemName: (name) => {
    switch (name) {
      case "Housing":
        return "דיור";
      case "Food":
        return "אוכל";
      case "Groceries":
        return "מכולת";
      case "Transport":
        return "תחבורה";
      case "Shopping":
        return "קניות";
      case "Entertainment":
        return "בידור";
      case "Health":
        return "בריאות";
      case "Travel":
        return "נסיעות";
      case "Education":
        return "השכלה";
      case "Bills":
        return "חשבונות";
      case "Subscriptions":
        return "מנויים";
      case "Personal":
        return "אישי";
      case "Other":
        return "אחר";
      default:
        return name;
    }
  },
  itemCount: (count: number) => `${count} ${count === 1 ? "תנועה" : "תנועות"}`,
  screenTitle: "קטגוריות",
  screenSubtitle: "שנה שם, החלף אייקון, או הוסף קטגוריה משלך",
  rowSummary: (count: number, isSystem: boolean) => `${count} ${count === 1 ? "פריט" : "פריטים"}${isSystem ? " · ברירת מחדל" : ""}`,
  editAriaLabel: (name: string) => `עריכת ${name}`,
  deleteAriaLabel: (name: string) => `מחיקת ${name}`,
  addCategoryButton: "הוספת קטגוריה",
  editCategorySheetTitle: "עריכת קטגוריה",
  editCategoryAriaLabel: "עריכת קטגוריה",
  nameLabel: "שם",
  namePlaceholder: "שם הקטגוריה",
  iconLabel: "אייקון",
  iconGridAriaLabel: "אייקון קטגוריה",
  saveChangesButton: "שמירת שינויים",
  toastEnterName: "יש להזין שם לקטגוריה.",
  toastDuplicateName: "כבר קיימת קטגוריה בשם הזה.",
  toastCategoryUpdated: "הקטגוריה עודכנה",
  toastCategoryAdded: "הקטגוריה נוספה",
  toastNeedOneCategory: "צריך שתישאר לפחות קטגוריה אחת.",
  reassignConfirmTitle: (name: string) => `להעביר את ${name}?`,
  reassignConfirmMessage: (count: number) =>
    count === 1
      ? "תנועה או מנוי אחד משתמש בקטגוריה הזו. בחר קטגוריה להעביר אליו לפני המחיקה."
      : `${count} תנועות או מנויים משתמשים בקטגוריה הזו. בחר קטגוריה להעביר אליהם לפני המחיקה.`,
  reassignConfirmLabel: "העברה ומחיקה",
  deleteConfirmTitle: (name: string) => `למחוק את ${name}?`,
  deleteConfirmMessage: "לא ניתן לבטל פעולה זו.",
  moveSheetTitle: (name: string) => `העברת הפריטים של ${name}`,
  moveSheetAriaLabel: "בחירת קטגוריית יעד",
  moveToLabel: "העברה אל",
  moveButtonText: (name: string) => `העברת הפריטים ומחיקת ${name}`,
};
