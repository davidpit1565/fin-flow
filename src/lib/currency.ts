import type { CurrencyCode } from "../types";
import { appLocale } from "./locale";

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "US Dollar" },
  { code: "GBP", label: "British Pound" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "ILS", label: "Israeli Shekel" },
];

/** Best-guess currency from the device locale. */
export function localeCurrency(): CurrencyCode {
  const locale = navigator.language || "en";
  const map: Record<string, CurrencyCode> = {
    en: "USD",
    de: "EUR",
    fr: "EUR",
    it: "EUR",
    es: "EUR",
    nl: "EUR",
    pt: "EUR",
    "en-GB": "GBP",
    "fr-CH": "CHF",
    "de-CH": "CHF",
    "it-CH": "CHF",
    "en-CA": "CAD",
    "fr-CA": "CAD",
    "en-AU": "AUD",
    "en-NZ": "AUD",
    he: "ILS",
  };
  if (map[locale] !== undefined) return map[locale];
  const base = locale.split("-")[0];
  if (map[base] !== undefined) return map[base];
  try {
    const nf = new Intl.NumberFormat(locale);
    const parts = nf.formatToParts(1234.5);
    const currencyPart = parts.find((p) => p.type === "currency");
    if (currencyPart) {
      const code = currencyPart.value.toUpperCase().replace(/[^A-Z]/g, "") as CurrencyCode;
      if (CURRENCIES.some((c) => c.code === code)) return code;
    }
  } catch {
    /* ignore */
  }
  return "USD";
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF",
  CAD: "$",
  AUD: "$",
  ILS: "₪",
};

function makeFormatter(currency: CurrencyCode, signDisplay?: "exceptZero") {
  try {
    return new Intl.NumberFormat(appLocale(), {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...(signDisplay ? { signDisplay } : {}),
    });
  } catch {
    return new Intl.NumberFormat("en", { style: "currency", currency, ...(signDisplay ? { signDisplay } : {}) });
  }
}

/** Format cents as currency, e.g. €1,247.80. Pass a genuinely negative
 *  `cents` for a negative amount -- `opts.sign` uses Intl's own
 *  `signDisplay` to add a "+"/"−" as part of the same bidi-aware formatted
 *  string, rather than concatenating a bare sign character onto it (which
 *  visually detaches from the number under RTL: see rows.tsx/
 *  TransactionDetail.tsx callers). */
export function formatMoney(cents: number, currency: CurrencyCode, opts?: { sign?: boolean }): string {
  const nf = makeFormatter(currency, opts?.sign ? "exceptZero" : undefined);
  return nf.format(cents / 100);
}

/** Compact symbol for a currency, e.g. "€". */
export function symbolFor(currency: CurrencyCode): string {
  return CURRENCY_SYMBOLS[currency];
}
