import { useState } from "react";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { iconByName } from "../lib/icons";
import { longDate, relativeDay, shortDate, timeOfDay } from "../lib/dates";
import { formatMoney } from "../lib/currency";
import { IconBadge, ScreenHeader } from "../components/ui";
import { AddTransactionSheet } from "../components/AddTransactionSheet";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bank: "Bank",
  other: "Other",
};

export function TransactionDetail({ transactionId }: { transactionId: string }) {
  const { transactions, categories, settings, deleteTransaction, confirm, toast, haptic } = useApp();
  const { back } = useNavigation();
  const [editing, setEditing] = useState(false);

  const transaction = transactions.find((t) => t.id === transactionId);
  if (!settings) return null;
  if (!transaction) {
    return (
      <div className="screen">
        <ScreenHeader title="Transaction" onBack={back} />
        <p className="screen-empty-text">This transaction no longer exists.</p>
      </div>
    );
  }

  const category = categories.find((c) => c.id === transaction.categoryId);
  const Icon = iconByName(category?.icon);
  const isIncome = transaction.type === "income";
  const dateLabel = relativeDay(transaction.date) ?? shortDate(transaction.date, { includeYear: true });

  const doDelete = async () => {
    const ok = await confirm({
      title: "Delete transaction?",
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteTransaction(transaction.id);
    haptic("warning");
    toast("Deleted");
    back();
  };

  return (
    <div className="screen">
      <ScreenHeader title="Transaction" onBack={back} />
      <div className="detail-hero">
        <IconBadge icon={Icon} size="lg" />
        <span className={`detail-amount ${isIncome ? "income" : ""}`}>
          {isIncome ? "+" : "−"}
          {formatMoney(transaction.amountCents, settings.currency)}
        </span>
        <span className="detail-merchant">{transaction.merchant || category?.name || "Transaction"}</span>
        <span className="detail-date">{dateLabel}</span>
      </div>

      <div className="detail-card">
        <DetailRow label="Category" value={category?.name ?? "—"} />
        <DetailRow label="Date" value={`${longDate(transaction.date)}${transaction.createdAt ? ` · ${timeOfDay(transaction.createdAt)}` : ""}`} />
        <DetailRow label="Payment method" value={transaction.paymentMethod ? METHOD_LABELS[transaction.paymentMethod] : "—"} />
        {transaction.recurring && (
          <DetailRow
            label="Recurring"
            value={`${transaction.frequency ? transaction.frequency[0].toUpperCase() + transaction.frequency.slice(1) : "Recurring"}${transaction.nextOccurrence ? ` · next ${shortDate(transaction.nextOccurrence, { includeYear: true })}` : ""}`}
            icon={<Repeat size={15} strokeWidth={2} />}
          />
        )}
        {transaction.notes && <DetailRow label="Notes" value={transaction.notes} />}
      </div>

      <div className="detail-actions">
        <button className="btn btn-secondary" onClick={() => setEditing(true)}>
          <Pencil size={16} strokeWidth={2} /> Edit
        </button>
        <button className="btn btn-danger-outline" onClick={() => void doDelete()}>
          <Trash2 size={16} strokeWidth={2} /> Delete
        </button>
      </div>

      {editing && <AddTransactionSheet initial={transaction} onClose={() => setEditing(false)} />}
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">
        {icon} {label}
      </span>
      <span className="detail-row-value">{value}</span>
    </div>
  );
}
