/** The device's own locale (`navigator.language`) drives number/date/currency
 *  formatting by default. Once the user explicitly picks a UI language in
 *  Settings, that choice should win instead -- e.g. someone with an
 *  English-locale phone who switches Flow's language to Hebrew expects
 *  DD/MM/YYYY dates and "1,234 ₪"-style amounts, not a UI that reads in
 *  Hebrew while all its numbers stay formatted the English way. When no
 *  language has been explicitly chosen, this stays `null` and every caller
 *  falls back to `navigator.language`, preserving today's behavior exactly. */
let localeOverride: string | null = null;

export function setLocaleOverride(locale: string | null): void {
  localeOverride = locale;
}

export function appLocale(): string {
  return localeOverride ?? navigator.language ?? "en";
}
