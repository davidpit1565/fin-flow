import type { en as En } from "../en/index";
import { common } from "./common";
import { appShell } from "./appShell";
import { transactions } from "./transactions";
import { transactionDetail } from "./transactionDetail";
import { transactionForm } from "./transactionForm";
import { transactionList } from "./transactionList";
import { categories } from "./categories";
import { categoryPicker } from "./categoryPicker";

/** Typed against `En` so TypeScript fails the build the moment a Hebrew
 *  namespace is missing a key the English one has (or has an extra one) --
 *  a translation can never silently fall behind the English source. */
export const he: typeof En = {
  common,
  appShell,
  transactions,
  transactionDetail,
  transactionForm,
  transactionList,
  categories,
  categoryPicker,
};
