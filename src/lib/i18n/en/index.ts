/** Each namespace lives in its own file (see ./common, ./appShell, etc.) so
 *  independent contributors can add a screen's strings without touching a
 *  giant shared file -- this index just imports and re-exports them all as
 *  one object. Adding a namespace: create en/<name>.ts + he/<name>.ts, then
 *  add one import + one property here and in ../he/index.ts. */
import { common } from "./common";
import { appShell } from "./appShell";
import { transactions } from "./transactions";
import { transactionDetail } from "./transactionDetail";
import { transactionForm } from "./transactionForm";
import { transactionList } from "./transactionList";
import { categories } from "./categories";
import { categoryPicker } from "./categoryPicker";

export const en = {
  common,
  appShell,
  transactions,
  transactionDetail,
  transactionForm,
  transactionList,
  categories,
  categoryPicker,
};
