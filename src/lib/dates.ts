/** Date helpers. All dates are local-time ISO strings (YYYY-MM-DD). */

import { appLocale } from "./locale";

export const DAY_MS = 86_400_000;

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, (m ?? 1) - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d ?? 1, lastDay));
  return toISO(target);
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}

/** First day of the calendar week containing `iso`, honoring the user's
 *  start-of-week preference. Uses local calendar arithmetic (via `Date`'s
 *  own setters), so it stays correct across DST transitions. */
export function startOfWeek(iso: string, startWeekOn: "monday" | "sunday" = "monday"): string {
  const d = parseISO(iso);
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diff = startWeekOn === "monday" ? (day === 0 ? 6 : day - 1) : day;
  d.setDate(d.getDate() - diff);
  return toISO(d);
}

export function startOfMonthDate(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/** Number of days between two ISO dates (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / DAY_MS);
}

/** Same calendar month? */
export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Relative day label: Today / Tomorrow / Yesterday / else null. */
export function relativeDay(iso: string, now = todayISO()): string | null {
  const d = diffDays(now, iso);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  return null;
}

/** "18 Aug" or "18 Aug 2026" (adds year when it differs from now). */
export function shortDate(iso: string, opts?: { includeYear?: boolean }): string {
  const d = parseISO(iso);
  const now = new Date();
  const fmt = new Intl.DateTimeFormat(appLocale(), {
    day: "numeric",
    month: "short",
    ...(opts?.includeYear || d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return fmt.format(d);
}

/** "August 2026". */
export function monthLabel(year: number, monthIndex: number): string {
  const fmt = new Intl.DateTimeFormat(appLocale(), {
    month: "long",
    year: "numeric",
  });
  return fmt.format(new Date(year, monthIndex, 1));
}

export function monthLabelISO(iso: string): string {
  return monthLabel(parseISO(iso).getFullYear(), parseISO(iso).getMonth());
}

/** "Wed" style short weekday. */
export function weekdayShort(iso: string): string {
  const fmt = new Intl.DateTimeFormat(appLocale(), { weekday: "short" });
  return fmt.format(parseISO(iso));
}

/** Long-ish date for details screens, e.g. "Saturday, 18 August 2026". */
export function longDate(iso: string): string {
  const fmt = new Intl.DateTimeFormat(appLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return fmt.format(parseISO(iso));
}

/** Time of day from a timestamp, e.g. "14:32". */
export function timeOfDay(ts: number): string {
  const fmt = new Intl.DateTimeFormat(appLocale(), {
    hour: "numeric",
    minute: "2-digit",
  });
  return fmt.format(new Date(ts));
}

/** Ordered list of the last n months as {year, monthIndex, key, label}. */
export function lastMonths(n: number, now = new Date()): { year: number; monthIndex: number; key: string; label: string }[] {
  const out: { year: number; monthIndex: number; key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(d.getFullYear(), d.getMonth()),
    });
  }
  return out;
}

/** ISO date from a Date (local). */
export function dateToISO(d: Date): string {
  return toISO(d);
}
