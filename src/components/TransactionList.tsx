import { useMemo } from "react";
import type { Category, CurrencyCode, Transaction } from "../types";
import { useApp } from "../store/AppContext";
import { relativeDay, shortDate } from "../lib/dates";
import { TransactionRow } from "./rows";

export function TransactionList({
  transactions,
  categories,
  currency,
  onOpen,
  onEmpty,
}: {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  onOpen: (id: string) => void;
  onEmpty?: () => void;
}) {
  const { deleteTransaction, updateTransaction, confirm, toast, haptic } = useApp();

  const groups = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
    const out: { date: string; items: Transaction[] }[] = [];
    for (const t of sorted) {
      const last = out[out.length - 1];
      if (last && last.date === t.date) last.items.push(t);
      else out.push({ date: t.date, items: [t] });
    }
    return out;
  }, [transactions]);

  if (groups.length === 0) {
    return <>{onEmpty?.() ?? null}</>;
  }

  const doDelete = async (t: Transaction) => {
    const ok = await confirm({
      title: "Delete transaction?",
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteTransaction(t.id);
    haptic("warning");
    toast("Deleted");
  };

  const toggleRecurring = (t: Transaction) => {
    const next = !t.recurring;
    updateTransaction(t.id, {
      recurring: next,
      frequency: next ? t.frequency ?? "monthly" : null,
      nextOccurrence: next ? t.nextOccurrence ?? t.date : null,
    });
    toast(next ? "Marked as recurring" : "Recurring removed");
  };

  return (
    <div className="txn-groups">
      {groups.map((g) => (
        <div key={g.date} className="txn-group">
          <div className="txn-group-header">
            <span className="txn-group-date">{relativeDay(g.date) ?? shortDate(g.date)}</span>
          </div>
          {g.items.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              category={categories.find((c) => c.id === t.categoryId)}
              currency={currency}
              onTap={() => onOpen(t.id)}
              swipe={{
                leftAction: {
                  label: "Recurring",
                  ariaLabel: t.recurring ? "Remove recurring" : "Mark as recurring",
                  onPress: () => toggleRecurring(t),
                },
                rightAction: {
                  label: "Delete",
                  ariaLabel: "Delete transaction",
                  onPress: () => void doDelete(t),
                },
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
