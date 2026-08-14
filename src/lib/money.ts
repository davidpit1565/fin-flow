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
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    // Allow things like "12.345" to be treated as 12.345 → rounds to 12.35? Keep strict: 2dp.
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
  }
  const value = Number(s);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

/** Format cents as a display string for a numeric input ("1234.50"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
