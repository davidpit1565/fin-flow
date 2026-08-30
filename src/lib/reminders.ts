import type { Budget, Category, Subscription, Transaction, UserSettings } from "../types";
import { budgetStatus, monthKey } from "./calc";
import { startOfWeek, todayISO } from "./dates";
import { formatMoney } from "./currency";
import {
  cancelNotifications,
  nextMonthSummaryTimestamp,
  notifyNow,
  reminderTimestamp,
  scheduleNotification,
  tagForMonthlySummary,
  tagForSubscription,
  triggersSupported,
} from "./notifications";
import { storage } from "./storage";

/** (Re)schedule a subscription reminder at 9:00 AM local time. */
export async function syncSubscriptionReminder(
  sub: Subscription,
  settings: UserSettings
): Promise<void> {
  await cancelNotifications(tagForSubscription(sub.id));
  if (
    !settings.notifications.enabled ||
    !settings.notifications.subscriptionReminders ||
    sub.status !== "active" ||
    sub.reminderDays === null ||
    !triggersSupported()
  ) {
    return;
  }
  const at = reminderTimestamp(sub.nextPaymentDate, sub.reminderDays);
  if (at <= Date.now()) return;
  await scheduleNotification({
    title: sub.name,
    body: `Payment ${sub.reminderDays === 0 ? "today" : `in ${sub.reminderDays} day${sub.reminderDays === 1 ? "" : "s"}`} — ${formatMoney(sub.amountCents, sub.currency)}`,
    tag: tagForSubscription(sub.id),
    timestamp: at,
  });
}

export async function clearSubscriptionReminder(id: string): Promise<void> {
  await cancelNotifications(tagForSubscription(id));
}

export async function clearMonthlySummaryReminder(): Promise<void> {
  await cancelNotifications(tagForMonthlySummary());
}

export async function resyncAllReminders(
  subscriptions: Subscription[],
  settings: UserSettings
): Promise<void> {
  for (const sub of subscriptions) await syncSubscriptionReminder(sub, settings);
}

/* ---------- budget alerts ---------- */

interface AlertState {
  [budgetId: string]: { period: string; level: string };
}

async function readAlertState(): Promise<AlertState> {
  try {
    return (await storage.get<AlertState>("meta", "budgetAlerts")) ?? {};
  } catch {
    return {};
  }
}

const ALERT_LEVELS = ["close", "high", "reached", "over"] as const;

/** Identifies "which period is this" for alert de-duplication -- a daily
 *  budget must be able to alert again on a new day even if it already hit
 *  "over" today, unlike a monthly budget re-checked later the same month. */
function budgetPeriodKey(budget: Budget, now: string, startWeekOn: UserSettings["startWeekOn"]): string {
  switch (budget.period) {
    case "daily":
      return now;
    case "weekly":
      return startOfWeek(now, startWeekOn);
    case "monthly":
    default:
      return monthKey(now);
  }
}

export async function checkBudgetAlerts(
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  settings: UserSettings
): Promise<void> {
  if (
    !settings.notifications.enabled ||
    !settings.notifications.budgetAlerts
  ) {
    return;
  }
  const now = todayISO();
  const state = await readAlertState();
  let changed = false;
  for (const budget of budgets) {
    const status = budgetStatus(budget, transactions, now, settings.startWeekOn);
    const periodKey = budgetPeriodKey(budget, now, settings.startWeekOn);
    const levelIndex = ALERT_LEVELS.indexOf(status.level as (typeof ALERT_LEVELS)[number]);
    const stored = state[budget.id];
    const storedIndex = stored && stored.period === periodKey ? ALERT_LEVELS.indexOf(stored.level as never) : -1;
    if (levelIndex < 0 || storedIndex >= levelIndex) continue;
    const periodLabel = budget.period === "daily" ? "daily" : budget.period === "weekly" ? "weekly" : "monthly";
    const name = budget.categoryId
      ? categories.find((c) => c.id === budget.categoryId)?.name ?? "category"
      : `${periodLabel} budget`;
    const diff = Math.abs(status.remainingCents);
    let message: string;
    switch (status.level) {
      case "close":
        message = `You're close to your ${name} budget.`;
        break;
      case "high":
        message = `You've used 90% of your ${name} budget.`;
        break;
      case "reached":
        message = `You've reached your ${name} budget.`;
        break;
      default:
        message = `You're ${formatMoney(diff, settings.currency)} over your ${name} budget.`;
    }
    const title = budget.categoryId ? name : `${periodLabel[0].toUpperCase()}${periodLabel.slice(1)} budget`;
    notifyNow(title, message);
    state[budget.id] = { period: periodKey, level: status.level };
    changed = true;
  }
  if (changed) {
    try {
      await storage.put("meta", { key: "budgetAlerts", ...state });
    } catch {
      /* ignore */
    }
  }
}

/* ---------- monthly summary ---------- */

export async function checkMonthlySummary(settings: UserSettings, transactions: Transaction[]): Promise<void> {
  if (!settings.notifications.enabled || !settings.notifications.monthlySummary) return;
  const now = new Date();
  try {
    // Summary covers the previous completed month only.
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const last = await storage.get<{ key: string; key2: string }>("meta", "lastSummaryMonth");
    if (last?.key2 === prevKey) return;
    const from = `${prevKey}-01`;
    const to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    let spent = 0;
    for (const t of transactions) {
      if (t.type === "expense" && t.date >= from && t.date <= to) spent += t.amountCents;
    }
    const label = new Intl.DateTimeFormat(navigator.language || "en", { month: "long" }).format(prev);
    if (spent > 0) {
      notifyNow(`${label} summary`, `Spending in ${label}: ${formatMoney(spent, settings.currency)}.`);
    }
    await storage.put("meta", { key: "lastSummaryMonth", key2: prevKey });
    // Schedule the next summary for the 1st of next month at 9 AM.
    await scheduleNotification({
      title: "Monthly summary",
      body: "Your spending summary is ready.",
      tag: tagForMonthlySummary(),
      timestamp: nextMonthSummaryTimestamp(now),
    });
  } catch {
    /* ignore */
  }
}
