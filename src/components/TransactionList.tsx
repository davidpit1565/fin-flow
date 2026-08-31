import { useEffect, useMemo, useState } from "react";
import type { Category, CurrencyCode, Transaction } from "../types";
import { useApp } from "../store/AppContext";
import { relativeDayLabel, useT } from "../lib/i18n";
import { shortDate } from "../lib/dates";
import { TransactionRow } from "./rows";

// Mounting every row at once measured at ~2.7s to render and visibly
// janked the moment the Transactions tab opened once a real user had
// accumulated a few years of history (tested with 1500 transactions,
// far from an unrealistic worst case for a personal finance app). This
// caps how many rows are actually in the DOM and grows the cap as the
// user nears the bottom of the shared `.app-scroll` container, instead
// of adopting a full virtualization library -- which would need its own
// scroll container and would fight the app's cross-route scroll
// restoration and per-row swipe gestures.
const BATCH_SIZE = 60;

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
  const t = useT();
  const { settings, deleteTransaction, updateTransaction, confirm, toast, haptic } = useApp();
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)),
    [transactions]
  );

  useEffect(() => {
    if (visibleCount >= sorted.length) return;
    const scroller = document.querySelector<HTMLElement>(".app-scroll");
    if (!scroller) return;
    const onScroll = () => {
      const nearBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 600;
      if (nearBottom) setVisibleCount((n) => Math.min(n + BATCH_SIZE, sorted.length));
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [visibleCount, sorted.length]);

  const groups = useMemo(() => {
    const visible = sorted.slice(0, visibleCount);
    const out: { date: string; items: Transaction[] }[] = [];
    for (const t of visible) {
      const last = out[out.length - 1];
      if (last && last.date === t.date) last.items.push(t);
      else out.push({ date: t.date, items: [t] });
    }
    return out;
  }, [sorted, visibleCount]);

  if (groups.length === 0) {
    return <>{onEmpty?.() ?? null}</>;
  }

  const doDelete = async (tx: Transaction) => {
    const ok = await confirm({
      title: t.transactionList.deleteConfirmTitle,
      message: t.transactionList.deleteConfirmMessage,
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteTransaction(tx.id);
    haptic("warning");
    toast(t.common.deleted);
  };

  const toggleRecurring = (tx: Transaction) => {
    const next = !tx.recurring;
    updateTransaction(tx.id, {
      recurring: next,
      frequency: next ? tx.frequency ?? "monthly" : null,
      nextOccurrence: next ? tx.nextOccurrence ?? tx.date : null,
    });
    toast(next ? t.transactionList.toastMarkedRecurring : t.transactionList.toastRecurringRemoved);
  };

  return (
    <div className="txn-groups">
      {groups.map((g) => (
        <div key={g.date} className="txn-group">
          <div className="txn-group-header">
            <span className="txn-group-date">{relativeDayLabel(t, g.date) ?? shortDate(g.date, { format: settings?.dateFormat })}</span>
          </div>
          {g.items.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              category={categories.find((c) => c.id === tx.categoryId)}
              currency={currency}
              onTap={() => onOpen(tx.id)}
              swipe={{
                leftAction: {
                  label: t.transactionList.recurringSwipeLabel,
                  ariaLabel: tx.recurring ? t.transactionList.removeRecurring : t.transactionList.markRecurring,
                  onPress: () => toggleRecurring(tx),
                },
                rightAction: {
                  label: t.common.delete,
                  ariaLabel: t.transactionList.deleteAriaLabel,
                  onPress: () => void doDelete(tx),
                },
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
