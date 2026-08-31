import { createContext, useContext, type ReactNode } from "react";
import type { Language } from "../../types";
import { en } from "./en/index";
import { he } from "./he/index";

/** Adding a language: add its code to the `Language` union in src/types.ts,
 *  create en-style/he-style dictionary directories under src/lib/i18n/, and
 *  register the result here. `Dictionary` is inferred from `en`, so every
 *  other language's dictionary is typechecked to have exactly the same
 *  shape -- a missing translation is a compile error, not a silent gap. */
export type Dictionary = typeof en;

const dictionaries: Record<Language, Dictionary> = { en, he };

const I18nContext = createContext<Dictionary>(en);

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <I18nContext.Provider value={dictionaries[language]}>{children}</I18nContext.Provider>;
}

/** `const t = useT()` then `t.home.title` -- direct property access instead
 *  of a `t("home.title")` string-key lookup, so a typo or a renamed key is a
 *  TypeScript error at the call site instead of a silently-blank label at
 *  runtime. */
export function useT(): Dictionary {
  return useContext(I18nContext);
}

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  he: "עברית",
};

export function isRTL(language: Language): boolean {
  return language === "he";
}
