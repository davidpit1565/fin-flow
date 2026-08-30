import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Budget,
  Category,
  CurrencyCode,
  PaymentMethod,
  RecurringFrequency,
  Subscription,
  SubscriptionFrequency,
  SubscriptionUsage,
  Transaction,
  TransactionType,
  UserSettings,
} from "../types";
import { DEFAULT_CATEGORIES } from "../lib/icons";
import { localeCurrency } from "../lib/currency";
import { storage } from "../lib/storage";
import { advanceSubscriptionDate, monthlyEquivalent } from "../lib/calc";
import {
  checkBudgetAlerts,
  checkMonthlySummary,
  clearMonthlySummaryReminder,
  clearSubscriptionReminder,
  syncSubscriptionReminder,
} from "../lib/reminders";
import { requestPermission } from "../lib/notifications";
import type { ImportRow } from "../lib/csv";
import { Haptics, NotificationType } from "@capacitor/haptics";
import { isNative } from "../lib/platform";

/* ---------- seed / defaults ---------- */

export function defaultSettings(): UserSettings {
  const now = Date.now();
  return {
    id: "user",
    onboarded: false,
    currency: localeCurrency(),
    startBalanceCents: 0,
    startWeekOn: "monday",
    dateFormat: "auto",
    theme: "system",
    notifications: {
      enabled: false,
      subscriptionReminders: true,
      budgetAlerts: true,
      monthlySummary: true,
    },
    appLockEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Stable, collision-free id for a built-in category, derived from its name. */
function defaultCategoryId(name: string): string {
  return `cat:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function seedCategories(): Category[] {
  const now = Date.now();
  return DEFAULT_CATEGORIES.map((c) => ({ ...c, id: defaultCategoryId(c.name), tint: null, createdAt: now }));
}

/* ---------- context ---------- */

export interface NewTransaction {
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  merchant: string;
  date: string;
  notes: string;
  recurring: boolean;
  frequency?: RecurringFrequency | null;
  nextOccurrence?: string | null;
  paymentMethod?: PaymentMethod | null;
  subscriptionId?: string | null;
}

export interface NewSubscription {
  name: string;
  amountCents: number;
  currency: CurrencyCode;
  frequency: SubscriptionFrequency;
  nextPaymentDate: string;
  categoryId: string;
  paymentMethod?: PaymentMethod | null;
  notes: string;
  reminderDays: number | null;
  usage: SubscriptionUsage;
  status: Subscription["status"];
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
}

interface AppState {
  ready: boolean;
  loadError: boolean;
  retryLoad: () => void;
  settings: UserSettings | null;
  categories: Category[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  budgets: Budget[];
  addTransaction: (input: NewTransaction) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addSubscription: (input: NewSubscription) => string;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  recordSubscriptionPayment: (id: string, date?: string) => void;
  addCategory: (name: string, icon: string) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string, reassignToId: string | null) => void;
  addBudget: (categoryId: string | null, amountCents: number) => void;
  updateBudget: (id: string, amountCents: number) => void;
  deleteBudget: (id: string) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  completeOnboarding: (patch: Partial<UserSettings>) => void;
  importTransactions: (rows: ImportRow[]) => number;
  deleteAllData: () => Promise<void>;
  toast: (message: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  haptic: (kind?: "success" | "warning") => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [toastState, setToastState] = useState<{ message: string; id: number } | null>(null);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const toastTimer = useRef<number | null>(null);

  /* ---------- load ---------- */
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    (async () => {
      let s = await storage.get<UserSettings>("settings", "user");
      if (!s) {
        s = defaultSettings();
        await storage.put("settings", s);
      }
      let cats = await storage.getAll<Category>("categories");
      // Backfill any missing defaults by name. Deterministic ids make this
      // idempotent, so a partially-seeded store (e.g. from a concurrent mount
      // under StrictMode) converges to the full set instead of staying incomplete.
      const missing = seedCategories().filter((c) => !cats.some((e) => e.name === c.name));
      if (missing.length > 0) {
        for (const c of missing) await storage.put("categories", c);
        cats = [...cats, ...missing];
      }
      const [txns, subs, bdgs] = await Promise.all([
        storage.getAll<Transaction>("transactions"),
        storage.getAll<Subscription>("subscriptions"),
        storage.getAll<Budget>("budgets"),
      ]);
      if (cancelled) return;
      setSettings(s);
      setCategories(cats);
      setTransactions(txns);
      setSubscriptions(subs);
      setBudgets(bdgs);
      setReady(true);
    })().catch(() => {
      // Local storage (IndexedDB) is unavailable or broken -- e.g. Safari
      // Private Browsing blocks it outright. Without this, the app hangs on
      // the splash screen forever with no explanation and no way out.
      if (!cancelled) setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const retryLoad = useCallback(() => setLoadAttempt((n) => n + 1), []);

  /* ---------- post-load side effects ---------- */
  const readyRef = useRef(false);
  useEffect(() => {
    if (ready && !readyRef.current) {
      readyRef.current = true;
    }
  }, [ready]);

  const runSideEffects = useCallback(
    (s: UserSettings, subs: Subscription[], txns: Transaction[], cats: Category[], bdgs: Budget[]) => {
      if (!s.onboarded) return;
      if (s.notifications.enabled) {
        void requestPermission().then((granted) => {
          if (!granted) return;
          if (s.notifications.subscriptionReminders) {
            for (const sub of subs) void syncSubscriptionReminder(sub, s);
          }
          void checkBudgetAlerts(bdgs, txns, cats, s);
          void checkMonthlySummary(s, txns);
        });
      }
    },
    []
  );

  useEffect(() => {
    if (ready && settings) {
      runSideEffects(settings, subscriptions, transactions, categories, budgets);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ---------- toast ---------- */
  const toast = useCallback((message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToastState({ message, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToastState(null), 2400);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const haptic = useCallback((kind: "success" | "warning" = "success") => {
    if (isNative()) {
      void (kind === "success"
        ? Haptics.notification({ type: NotificationType.Success })
        : Haptics.notification({ type: NotificationType.Warning })
      ).catch(() => undefined);
      return;
    }
    try {
      if (kind === "success") navigator.vibrate?.(8);
      else navigator.vibrate?.([15, 40, 15]);
    } catch {
      /* ignore */
    }
  }, []);

  /* ---------- transaction actions ---------- */
  const addTransaction = useCallback(
    (input: NewTransaction): string => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const txn: Transaction = { ...input, id, createdAt: now, updatedAt: now };
      setTransactions((prev) => [...prev, txn]);
      void storage.put("transactions", txn).catch(() => toast("Something went wrong. Please try again."));
      return id;
    },
    [toast]
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      setTransactions((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t));
        const updated = next.find((t) => t.id === id);
        if (updated) void storage.put("transactions", updated).catch(() => toast("Something went wrong. Please try again."));
        return next;
      });
    },
    [toast]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const next = prev.filter((t) => t.id !== id);
        void storage.remove("transactions", id).catch(() => toast("Something went wrong. Please try again."));
        return next;
      });
    },
    [toast]
  );

  /* ---------- subscription actions ---------- */
  const addSubscription = useCallback(
    (input: NewSubscription): string => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const sub: Subscription = { ...input, id, payments: [], createdAt: now, updatedAt: now };
      setSubscriptions((prev) => [...prev, sub]);
      void storage.put("subscriptions", sub).catch(() => toast("Something went wrong. Please try again."));
      if (settings) void syncSubscriptionReminder(sub, settings);
      return id;
    },
    [settings, toast]
  );

  const updateSubscription = useCallback(
    (id: string, patch: Partial<Subscription>) => {
      setSubscriptions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s));
        const updated = next.find((s) => s.id === id);
        if (updated) {
          void storage.put("subscriptions", updated).catch(() => toast("Something went wrong. Please try again."));
          if (settings) void syncSubscriptionReminder(updated, settings);
        }
        return next;
      });
    },
    [settings, toast]
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      setSubscriptions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        void storage.remove("subscriptions", id).catch(() => toast("Something went wrong. Please try again."));
        void clearSubscriptionReminder(id);
        return next;
      });
    },
    [toast]
  );

  /** Mark the next payment as paid: record history, advance the date, create a transaction. */
  const recordSubscriptionPayment = useCallback(
    (id: string, date?: string) => {
      setSubscriptions((prev) => {
        const sub = prev.find((s) => s.id === id);
        if (!sub) return prev;
        const paymentDate = date ?? sub.nextPaymentDate;
        const nextDate = advanceSubscriptionDate(sub);
        const updated: Subscription = {
          ...sub,
          nextPaymentDate: nextDate,
          payments: [...sub.payments, { date: paymentDate, amountCents: sub.amountCents }],
          updatedAt: Date.now(),
        };
        void storage.put("subscriptions", updated).catch(() => toast("Something went wrong. Please try again."));
        if (settings) void syncSubscriptionReminder(updated, settings);
        // Create a real transaction so subscription spending is visible.
        const txn: Transaction = {
          id: crypto.randomUUID(),
          type: "expense",
          amountCents: sub.amountCents,
          categoryId: sub.categoryId,
          merchant: sub.name,
          date: paymentDate,
          subscriptionId: sub.id,
          notes: "Subscription payment",
          recurring: true,
          frequency: sub.frequency === "quarterly" ? "monthly" : sub.frequency,
          nextOccurrence: nextDate,
          paymentMethod: sub.paymentMethod ?? null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setTransactions((prevTxns) => [...prevTxns, txn]);
        void storage.put("transactions", txn).catch(() => toast("Something went wrong. Please try again."));
        return prev.map((s) => (s.id === id ? updated : s));
      });
    },
    [settings, toast]
  );

  /* ---------- category actions ---------- */
  const addCategory = useCallback(
    (name: string, icon: string): Category => {
      const cat: Category = { id: crypto.randomUUID(), name, icon, tint: null, isSystem: false, createdAt: Date.now() };
      setCategories((prev) => [...prev, cat]);
      void storage.put("categories", cat).catch(() => toast("Something went wrong. Please try again."));
      return cat;
    },
    [toast]
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<Category>) => {
      setCategories((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
        const updated = next.find((c) => c.id === id);
        if (updated) void storage.put("categories", updated).catch(() => toast("Something went wrong. Please try again."));
        return next;
      });
    },
    [toast]
  );

  const deleteCategory = useCallback(
    (id: string, reassignToId: string | null) => {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      void storage.remove("categories", id).catch(() => toast("Something went wrong. Please try again."));
      if (reassignToId) {
        setTransactions((prev) => {
          const next = prev.map((t) => (t.categoryId === id ? { ...t, categoryId: reassignToId, updatedAt: Date.now() } : t));
          for (const t of next) if (t.categoryId === reassignToId) void storage.put("transactions", t).catch(() => undefined);
          return next;
        });
        setSubscriptions((prev) => {
          const next = prev.map((s) => (s.categoryId === id ? { ...s, categoryId: reassignToId, updatedAt: Date.now() } : s));
          for (const s of next) if (s.categoryId === reassignToId) void storage.put("subscriptions", s).catch(() => undefined);
          return next;
        });
      }
      // A budget on this category has nowhere to go -- keeping it around would
      // orphan it (it would reference a category that no longer exists).
      setBudgets((prev) => {
        const orphaned = prev.filter((b) => b.categoryId === id);
        for (const b of orphaned) void storage.remove("budgets", b.id).catch(() => undefined);
        return prev.filter((b) => b.categoryId !== id);
      });
    },
    [toast]
  );

  /* ---------- budget actions ---------- */
  const addBudget = useCallback(
    (categoryId: string | null, amountCents: number) => {
      setBudgets((prev) => {
        const existing = prev.find((b) => b.categoryId === categoryId);
        if (existing) {
          const updated = { ...existing, amountCents, updatedAt: Date.now() };
          void storage.put("budgets", updated).catch(() => toast("Something went wrong. Please try again."));
          return prev.map((b) => (b.id === existing.id ? updated : b));
        }
        const budget: Budget = {
          id: crypto.randomUUID(),
          categoryId,
          amountCents,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        void storage.put("budgets", budget).catch(() => toast("Something went wrong. Please try again."));
        return [...prev, budget];
      });
    },
    [toast]
  );

  const updateBudget = useCallback(
    (id: string, amountCents: number) => {
      setBudgets((prev) => {
        const next = prev.map((b) => (b.id === id ? { ...b, amountCents, updatedAt: Date.now() } : b));
        const updated = next.find((b) => b.id === id);
        if (updated) void storage.put("budgets", updated).catch(() => toast("Something went wrong. Please try again."));
        return next;
      });
    },
    [toast]
  );

  const deleteBudget = useCallback(
    (id: string) => {
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      void storage.remove("budgets", id).catch(() => toast("Something went wrong. Please try again."));
    },
    [toast]
  );

  /* ---------- settings ---------- */
  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch, updatedAt: Date.now() };
        void storage.put("settings", next).catch(() => toast("Something went wrong. Please try again."));
        return next;
      });
    },
    [toast]
  );

  const completeOnboarding = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch, onboarded: true, updatedAt: Date.now() };
        void storage.put("settings", next).catch(() => toast("Something went wrong. Please try again."));
        return next;
      });
      if (patch.notifications?.enabled) void requestPermission();
    },
    [toast]
  );

  /* ---------- import / delete all ---------- */
  const importTransactions = useCallback(
    (rows: ImportRow[]): number => {
      const now = Date.now();
      const txns = rows.map((r) => ({ ...r, id: crypto.randomUUID(), createdAt: now, updatedAt: now }));
      setTransactions((prev) => [...prev, ...txns]);
      for (const t of txns) void storage.put("transactions", t).catch(() => toast("Something went wrong. Please try again."));
      return txns.length;
    },
    [toast]
  );

  const deleteAllData = useCallback(async () => {
    await Promise.all(subscriptions.map((s) => clearSubscriptionReminder(s.id)));
    await clearMonthlySummaryReminder();
    await Promise.all(
      ["transactions", "subscriptions", "budgets", "categories", "meta"].map((store) => storage.clear(store))
    );
    const cats = seedCategories();
    setCategories(cats);
    for (const c of cats) await storage.put("categories", c);
    const s = defaultSettings();
    await storage.put("settings", s);
    setSettings(s);
    setTransactions([]);
    setSubscriptions([]);
    setBudgets([]);
    setReady(true);
  }, [subscriptions]);

  /* ---------- value ---------- */
  const value = useMemo<AppState>(
    () => ({
      ready,
      loadError,
      retryLoad,
      settings,
      categories,
      transactions,
      subscriptions,
      budgets,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      recordSubscriptionPayment,
      addCategory,
      updateCategory,
      deleteCategory,
      addBudget,
      updateBudget,
      deleteBudget,
      updateSettings,
      completeOnboarding,
      importTransactions,
      deleteAllData,
      toast,
      confirm,
      haptic,
    }),
    [
      ready,
      loadError,
      retryLoad,
      settings,
      categories,
      transactions,
      subscriptions,
      budgets,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      recordSubscriptionPayment,
      addCategory,
      updateCategory,
      deleteCategory,
      addBudget,
      updateBudget,
      deleteBudget,
      updateSettings,
      completeOnboarding,
      importTransactions,
      deleteAllData,
      toast,
      confirm,
      haptic,
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      {toastState && <ToastView key={toastState.id} message={toastState.message} />}
      {confirmState && (
        <ConfirmView
          opts={confirmState}
          onDone={(v) => {
            confirmState.resolve(v);
            setConfirmState(null);
          }}
        />
      )}
    </AppContext.Provider>
  );
}

/* ---------- toast + confirm views ---------- */

function ToastView({ message }: { message: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-dot" aria-hidden="true" />
      {message}
    </div>
  );
}

function ConfirmView({ opts, onDone }: { opts: ConfirmOptions & { resolve: (v: boolean) => void }; onDone: (v: boolean) => void }) {
  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDone(false);
      }}
    >
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{opts.title}</h2>
        <p>{opts.message}</p>
        <div className="dialog-actions">
          <button className="btn btn-secondary" autoFocus={opts.danger} onClick={() => onDone(false)}>
            Cancel
          </button>
          <button
            className={opts.danger ? "btn btn-danger" : "btn btn-primary"}
            autoFocus={!opts.danger}
            onClick={() => onDone(true)}
          >
            {opts.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

/** Convenience: monthly equivalent of a subscription (re-export). */
export { monthlyEquivalent };
