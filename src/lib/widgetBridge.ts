import { registerPlugin } from "@capacitor/core";
import type { Budget, CurrencyCode, DateFormatPreference, Subscription, Transaction, WeekStart } from "../types";
import { activeSubscriptions, budgetStatus, currentMonthRange, expensesInRange, upcomingPayments, type BudgetStatus } from "./calc";
import { formatMoney } from "./currency";
import { todayISO } from "./dates";
import type { Dictionary } from "./i18n";
import { isNative } from "./platform";

/** What the FlowWidgets extension (Home Screen + Lock Screen widgets) reads
 *  out of the shared App Group. Every value is pre-formatted here in JS --
 *  currency symbol/locale/RTL handling all already live in this file's
 *  imports, so the widget's Swift code never needs to duplicate any of it. */
export interface WidgetSnapshot {
  currencyCode: CurrencyCode;
  spentThisMonthLabel: string;
  /** 0...100+ (over budget renders past a full ring). Null when no overall budget is set. */
  budgetPercent: number | null;
  budgetLevel: BudgetStatus["level"] | null;
  budgetRemainingLabel: string | null;
  /** Next few bills, soonest first, already localized. */
  bills: { name: string; amountLabel: string; dueLabel: string; overdue: boolean }[];
  updatedAt: number;
}

export interface BillDueActivityPayload {
  /** The subscription's own id -- keys the Live Activity so a repeat call
   *  updates it in place instead of starting a duplicate. */
  id: string;
  name: string;
  amountLabel: string;
  dueDateLabel: string;
}

interface WidgetBridgeNativePlugin {
  updateSnapshot(options: { json: string }): Promise<void>;
  startBillDueActivity(options: { json: string }): Promise<void>;
  endBillDueActivity(options: { id: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgeNativePlugin>("WidgetBridge");

export function buildWidgetSnapshot(
  transactions: Transaction[],
  subscriptions: Subscription[],
  budgets: Budget[],
  currency: CurrencyCode,
  startWeekOn: WeekStart,
  dateFormat: DateFormatPreference,
  t: Pick<Dictionary, "common">,
  now = todayISO()
): WidgetSnapshot {
  const spentThisMonthCents = expensesInRange(transactions, currentMonthRange(now));

  const overallBudget = budgets.find((b) => b.categoryId === null) ?? null;
  let budgetPercent: number | null = null;
  let budgetLevel: BudgetStatus["level"] | null = null;
  let budgetRemainingLabel: string | null = null;
  if (overallBudget) {
    const status = budgetStatus(overallBudget, transactions, now, startWeekOn);
    budgetPercent = Math.round(status.percent);
    budgetLevel = status.level;
    budgetRemainingLabel = formatMoney(Math.max(status.remainingCents, 0), currency);
  }

  const bills = upcomingPayments(subscriptions, t, dateFormat, now)
    .slice(0, 3)
    .map((u) => ({
      name: u.subscription.name,
      amountLabel: formatMoney(u.amountCents, currency),
      dueLabel: u.label,
      overdue: u.date < now,
    }));

  return {
    currencyCode: currency,
    spentThisMonthLabel: formatMoney(spentThisMonthCents, currency),
    budgetPercent,
    budgetLevel,
    budgetRemainingLabel,
    bills,
    updatedAt: Date.now(),
  };
}

/** Sends the snapshot to the widget extension via the shared App Group and
 *  asks WidgetKit to reload. No-op on web/Android -- there is no widget
 *  surface to update there. */
export function pushWidgetSnapshot(snapshot: WidgetSnapshot): void {
  if (!isNative()) return;
  void WidgetBridge.updateSnapshot({ json: JSON.stringify(snapshot) }).catch(() => {
    // Best-effort: a missing App Group entitlement or a pre-widget build
    // shouldn't surface an error to the user over something this cosmetic.
  });
}

/** Subscriptions whose payment is due exactly today (not overdue, not yet
 *  due) -- the trigger condition for the "Bill Due Today" Live Activity. */
export function billsDueToday(subscriptions: Subscription[], now = todayISO()): Subscription[] {
  return activeSubscriptions(subscriptions).filter((s) => s.nextPaymentDate === now);
}

export function startBillDueActivity(payload: BillDueActivityPayload): void {
  if (!isNative()) return;
  void WidgetBridge.startBillDueActivity({ json: JSON.stringify(payload) }).catch(() => {});
}

export function endBillDueActivity(subscriptionId: string): void {
  if (!isNative()) return;
  void WidgetBridge.endBillDueActivity({ id: subscriptionId }).catch(() => {});
}
