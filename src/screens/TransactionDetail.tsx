import { useState } from "react";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { categoryDisplayName, relativeDayLabel, useT } from "../lib/i18n";
import { iconByName } from "../lib/icons";
import { longDate, shortDate, timeOfDay } from "../lib/dates";
import { formatMoney } from "../lib/currency";
import { IconBadge, ScreenHeader } from "../components/ui";
import { AddTransactionSheet } from "../components/AddTransactionSheet";

export function TransactionDetail({ transactionId }: { transactionId: string }) {
  const t = useT();
  const { transactions, categories, settings, deleteTransaction, confirm, toast, haptic } = useApp();
  const { back } = useNavigation();
  const [editing, setEditing] = useState(false);

  const transaction = transactions.find((tx) => tx.id === transactionId);
  if (!settings) return null;
  if (!transaction) {
    return (
      <div className="screen">
        <ScreenHeader title={t.transactionDetail.title} onBack={back} largeTitle={false} />
        <p className="screen-empty-text">{t.transactionDetail.notFoundMessage}</p>
      </div>
    );
  }

  const category = categories.find((c) => c.id === transaction.categoryId);
  const categoryLabel = category ? categoryDisplayName(t, category) : undefined;
  const Icon = iconByName(category?.icon);
  const isIncome = transaction.type === "income";
  const dateLabel = relativeDayLabel(t, transaction.date) ?? shortDate(transaction.date, { includeYear: true, format: settings.dateFormat });

  const doDelete = async () => {
    const ok = await confirm({
      title: t.transactionDetail.deleteConfirmTitle,
      message: t.transactionDetail.deleteConfirmMessage,
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteTransaction(transaction.id);
    haptic("warning");
    toast(t.common.deleted);
    back();
  };

  return (
    <div className="screen">
      <ScreenHeader title={t.transactionDetail.title} onBack={back} />
      <div className="detail-hero">
        <IconBadge icon={Icon} size="lg" />
        <span className={`detail-amount ${isIncome ? "income" : ""}`}>
          {formatMoney(isIncome ? transaction.amountCents : -transaction.amountCents, settings.currency, { sign: true })}
        </span>
        <span className="detail-merchant">{transaction.merchant || categoryLabel || t.transactionDetail.fallbackName}</span>
        <span className="detail-date">{dateLabel}</span>
      </div>

      <div className="detail-card">
        <DetailRow label={t.transactionDetail.categoryLabel} value={categoryLabel ?? t.transactionDetail.noCategoryValue} />
        <DetailRow
          label={t.transactionDetail.dateLabel}
          value={`${longDate(transaction.date)}${transaction.createdAt ? ` · ${timeOfDay(transaction.createdAt)}` : ""}`}
        />
        <DetailRow
          label={t.transactionDetail.paymentMethodLabel}
          value={transaction.paymentMethod ? t.transactionDetail.paymentMethod[transaction.paymentMethod] : t.transactionDetail.noPaymentMethodValue}
        />
        {transaction.recurring && (
          <DetailRow
            label={t.transactionDetail.recurringLabel}
            value={`${transaction.frequency ? t.transactionDetail.frequency[transaction.frequency] : t.transactionDetail.recurringFallback}${
              transaction.nextOccurrence
                ? ` · ${t.transactionDetail.nextOccurrence(shortDate(transaction.nextOccurrence, { includeYear: true, format: settings.dateFormat }))}`
                : ""
            }`}
            icon={<Repeat size={15} strokeWidth={2} />}
          />
        )}
        {transaction.notes && <DetailRow label={t.transactionDetail.notesLabel} value={transaction.notes} />}
      </div>

      <div className="detail-actions">
        <button className="btn btn-secondary" onClick={() => setEditing(true)}>
          <Pencil size={16} strokeWidth={2} /> {t.common.edit}
        </button>
        <button className="btn btn-danger-outline" onClick={() => void doDelete()}>
          <Trash2 size={16} strokeWidth={2} /> {t.common.delete}
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
