/** Money helpers. Amounts are integer cents everywhere. */

/** Parse a user-typed amount ("12,345.67" or "12.345,67") into cents. Returns null if invalid. */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  // Normalise: keep only digits and the last decimal separator.
  let s = raw.replace(/[^\d.,\-]/g, "");
  if (!s) return null;
  if (s.startsWith("-")) return null;
  // A trailing separator mid-entry ("12." or "12,") is a whole amount, not an error.
  if (/[.,]$/.test(s)) s = s.slice(0, -1);
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    // Whichever comes last is the decimal separator.
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "");
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    const commaCount = (s.match(/,/g) ?? []).length;
    if (commaCount === 1 && !s.includes(".") && s.length - s.indexOf(",") <= 3) {
      // Single comma with ≤2 digits after it: decimal separator.
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  // Integer arithmetic only from here -- `Math.round(Number(s) * 100)` looks
  // equivalent but silently rounds the wrong way for plenty of real amounts
  // (e.g. "1.005" -> 100.49999999999999 -> 100 instead of 101) because the
  // decimal value can't be represented exactly as a float.
  const [intPart, fracPart = ""] = s.split(".");
  const d1 = fracPart.length > 0 ? Number(fracPart[0]) : 0;
  const d2 = fracPart.length > 1 ? Number(fracPart[1]) : 0;
  const d3 = fracPart.length > 2 ? Number(fracPart[2]) : 0;
  let cents = parseInt(intPart, 10) * 100 + d1 * 10 + d2;
  if (d3 >= 5) cents += 1;
  if (!Number.isFinite(cents) || cents <= 0) return null;
  return cents;
}

/** Format cents as a display string for a numeric input ("1234.50"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
