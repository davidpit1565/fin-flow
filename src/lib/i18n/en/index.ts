/** Each namespace lives in its own file (see ./common, ./appShell, etc.) so
 *  independent contributors can add a screen's strings without touching a
 *  giant shared file -- this index just imports and re-exports them all as
 *  one object. Adding a namespace: create en/<name>.ts + he/<name>.ts, then
 *  add one import + one property here and in ../he/index.ts. */
import { common } from "./common";
import { appShell } from "./appShell";
import { settings } from "./settings";
import { legal } from "./legal";

export const en = {
  common,
  appShell,
  settings,
  legal,
};
