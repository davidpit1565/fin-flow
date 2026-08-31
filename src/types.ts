/** Core data models for Flow. All money is stored as integer cents. */

export type CurrencyCode = "EUR" | "USD" | "GBP" | "CHF" | "CAD" | "AUD" | "ILS";

export type ThemePreference = "system" | "light" | "dark";
export type DateFormatPreference = "auto" | "dmy" | "mdy" | "iso";
export type WeekStart = "monday" | "sunday";

export interface NotificationSettings {
  enabled: boolean;
  subscriptionReminders: boolean;
  budgetAlerts: boolean;
  monthlySummary: boolean;
}

export interface UserSettings {
  id: "user";
  onboarded: boolean;
  currency: CurrencyCode;
  startBalanceCents: number;
  startWeekOn: WeekStart;
  dateFormat: DateFormatPreference;
  theme: ThemePreference;
  notifications: NotificationSettings;
  /** Optional: absent on settings created before this field existed, which
   *  should be treated the same as `false` -- app lock off by default. */
  appLockEnabled?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TransactionType = "expense" | "income";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type SubscriptionFrequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type PaymentMethod = "cash" | "card" | "bank" | "other";
export type SubscriptionStatus = "active" | "paused" | "cancelled";
export type SubscriptionUsage = "regular" | "rarely" | "unused";

export interface Transaction {
  id: string;
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  merchant: string;
  /** ISO date string (YYYY-MM-DD), local time. */
  date: string;
  /** Set when the transaction was recorded from a subscription payment. */
  subscriptionId?: string | null;
  notes: string;
  recurring: boolean;
  frequency?: RecurringFrequency | null;
  nextOccurrence?: string | null;
  paymentMethod?: PaymentMethod | null;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionPayment {
  date: string;
  amountCents: number;
}

export interface Subscription {
  id: string;
  name: string;
  amountCents: number;
  currency: CurrencyCode;
  frequency: SubscriptionFrequency;
  /** ISO date string of the next scheduled payment. */
  nextPaymentDate: string;
  categoryId: string;
  paymentMethod?: PaymentMethod | null;
  notes: string;
  /** 0 = same day, 1/3/7 = days before. Null = no reminder. */
  reminderDays: number | null;
  status: SubscriptionStatus;
  usage: SubscriptionUsage;
  payments: SubscriptionPayment[];
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  /** Optional accent hue (name of a token) used only as a subtle tint. */
  tint?: string | null;
  isSystem?: boolean;
  createdAt: number;
}

export type BudgetPeriod = "daily" | "weekly" | "monthly";

export interface Budget {
  id: string;
  /** categoryId = null means the overall budget for the period. */
  categoryId: string | null;
  amountCents: number;
  /** Optional: absent on budgets created before this field existed, which
   *  should be treated the same as "monthly". */
  period?: BudgetPeriod;
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  targetCents: number;
  /** Amount saved so far toward this goal. */
  currentCents: number;
  /** Optional ISO date the user wants to hit the target by. */
  targetDate: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Computed on demand from real data — never stored, never invented. */
export interface MonthlySummary {
  year: number;
  month: number;
  spentCents: number;
  incomeCents: number;
  savedCents: number;
  subscriptionCents: number;
  topCategoryId: string | null;
  topCategoryCents: number;
  vsPreviousPercent: number | null;
}

export type NetWorthItemKind = "asset" | "liability";

export interface NetWorthItem {
  id: string;
  kind: NetWorthItemKind;
  name: string;
  /** Free-form label, e.g. "Cash", "Investments", "Property", "Vehicle", "Other"
   *  for assets; "Loan", "Credit Card", "Mortgage", "Other" for liabilities. */
  category: string;
  /** Always a positive magnitude regardless of kind -- a liability's
   *  contribution to net worth is subtracted, not stored as negative. */
  valueCents: number;
  createdAt: number;
  updatedAt: number;
}

export interface CategoryTotal {
  category: Category;
  spentCents: number;
  percent: number;
}

export interface UpcomingPayment {
  subscription: Subscription;
  date: string;
  amountCents: number;
  label: string;
}
