import type { common as CommonEn } from "../en/common";

export const common: typeof CommonEn = {
  save: "שמירה",
  cancel: "ביטול",
  delete: "מחיקה",
  edit: "עריכה",
  add: "הוספה",
  close: "סגירה",
  back: "חזרה",
  done: "סיום",
  loading: "טוען…",
  retry: "נסה שוב",
  deleted: "נמחק",
  somethingWentWrong: "משהו השתבש. נסה שוב.",

  today: "היום",
  tomorrow: "מחר",
  yesterday: "אתמול",
  overdue: (label) => `באיחור · ${label}`,
  percentOfSpending: (percent) => `${percent}% מההוצאות`,
};
