/** The device's own locale (`navigator.language`) drives number/date/currency
 *  formatting throughout the app. */
export function appLocale(): string {
  return navigator.language ?? "en";
}
