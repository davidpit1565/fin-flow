import { createContext, useContext, type ReactNode } from "react";
import { relativeDayKey } from "../dates";
import { en } from "./en/index";

/** The app is English-only. Strings still live in `src/lib/i18n/en/<name>.ts`
 *  and are read via `useT()` rather than hardcoded in components -- this
 *  keeps every user-facing string centralized in one place instead of
 *  scattered through JSX, which is worth doing even for a single language. */
export type Dictionary = typeof en;

const I18nContext = createContext<Dictionary>(en);

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nContext.Provider value={en}>{children}</I18nContext.Provider>;
}

/** `const t = useT()` then `t.home.title` -- direct property access instead
 *  of a `t("home.title")` string-key lookup, so a typo or a renamed key is a
 *  TypeScript error at the call site instead of a silently-blank label at
 *  runtime. */
export function useT(): Dictionary {
  return useContext(I18nContext);
}

/** Translates `relativeDayKey`'s result via `t.common` -- shared by React
 *  screens and pure `lib/` functions alike, since it only needs the
 *  `common` slice of the dictionary rather than React context. */
export function relativeDayLabel(t: Pick<Dictionary, "common">, iso: string, now?: string): string | null {
  const key = now === undefined ? relativeDayKey(iso) : relativeDayKey(iso, now);
  return key === null ? null : t.common[key];
}

/** Display name for a category: translates the 13 seeded defaults
 *  (`isSystem: true`) via `t.categories.systemName`, leaves a user's own
 *  category exactly as they named it. The underlying `Category.name` is
 *  never rewritten -- this only affects what's rendered. */
export function categoryDisplayName(t: Pick<Dictionary, "categories">, category: { name: string; isSystem?: boolean }): string {
  return category.isSystem ? t.categories.systemName(category.name) : category.name;
}
