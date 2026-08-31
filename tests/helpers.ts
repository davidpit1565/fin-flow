/** Browser-global polyfills so pure modules can run under Bun. */
export function installGlobals(language = "en-US") {
  (globalThis as { navigator?: unknown }).navigator = { language };
}

export interface CategoryLike {
  id: string;
  name: string;
  icon: string;
  isSystem?: boolean;
  tint?: string | null;
  createdAt: number;
}

export interface TxnLike {
  id: string;
  type: "expense" | "income";
  amountCents: number;
  categoryId: string;
  date: string;
  subscriptionId?: string | null;
  merchant: string;
  notes: string;
  recurring: boolean;
  frequency?: "daily" | "weekly" | "monthly" | "yearly" | null;
  nextOccurrence?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SubLike {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  nextPaymentDate: string;
  categoryId: string;
  status: "active" | "paused" | "cancelled";
  usage: "regular" | "rarely" | "unused";
  payments: { date: string; amountCents: number }[];
  createdAt: number;
  updatedAt: number;
}

export function txn(over: Partial<TxnLike>): TxnLike {
  return {
    id: crypto.randomUUID(),
    type: "expense",
    amountCents: 1000,
    categoryId: "food",
    date: "2026-08-05",
    subscriptionId: null,
    merchant: "",
    notes: "",
    recurring: false,
    frequency: null,
    nextOccurrence: null,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

export function sub(over: Partial<SubLike>): SubLike {
  return {
    id: crypto.randomUUID(),
    name: "Service",
    amountCents: 1000,
    currency: "EUR",
    frequency: "monthly",
    nextPaymentDate: "2026-09-01",
    categoryId: "subs",
    status: "active",
    usage: "regular",
    payments: [],
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

export function cat(id: string, name: string): CategoryLike {
  return { id, name, icon: "Ellipsis", createdAt: 1 };
}

export interface GoalLike {
  id: string;
  name: string;
  icon: string;
  targetCents: number;
  currentCents: number;
  targetDate: string | null;
  createdAt: number;
  updatedAt: number;
}

export function goal(over: Partial<GoalLike>): GoalLike {
  return {
    id: crypto.randomUUID(),
    name: "Goal",
    icon: "PiggyBank",
    targetCents: 100000,
    currentCents: 0,
    targetDate: null,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}
