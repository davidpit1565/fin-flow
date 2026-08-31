/** Each namespace lives in its own file (see ./common, ./appShell, etc.) so
 *  independent contributors can add a screen's strings without touching a
 *  giant shared file -- this index just imports and re-exports them all as
 *  one object. Adding a namespace: create en/<name>.ts + he/<name>.ts, then
 *  add one import + one property here and in ../he/index.ts. */
import { common } from "./common";
import { appShell } from "./appShell";
import { home } from "./home";
import { insights } from "./insights";
import { onboarding } from "./onboarding";

export const en = {
  common,
  appShell,
  home,
  insights,
  onboarding,
};
