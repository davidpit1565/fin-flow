import { useMemo, useState } from "react";
import type { PaymentMethod, RecurringFrequency, Transaction, TransactionType } from "../types";
import { useApp } from "../store/AppContext";
import { useT } from "../lib/i18n";
import { addDays, addMonths, todayISO } from "../lib/dates";
import { suggestCategoryForMerchant } from "../lib/calc";
import { Button, ChipGroup, DateInput, Field, FormError, NumericInput, Segmented, Sheet, TextArea, TextInput, Toggle } from "./ui";
import { CategoryPicker } from "./CategoryPicker";

const FREQUENCY_KEYS: RecurringFrequency[] = ["daily", "weekly", "monthly", "yearly"];
const METHOD_KEYS: PaymentMethod[] = ["cash", "card", "bank", "other"];

function defaultNextOccurrence(date: string, frequency: RecurringFrequency): string {
  switch (frequency) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "monthly":
      return addMonths(date, 1);
    case "yearly":
      return addMonths(date, 12);
  }
}

export function AddTransactionSheet({ initial, onClose }: { initial?: Transaction | null; onClose: () => void }) {
  const t = useT();
  const { categories, transactions, addTransaction, updateTransaction, toast, haptic } = useApp();
  const isEdit = !!initial;

  const FREQUENCIES: { value: RecurringFrequency; label: string }[] = FREQUENCY_KEYS.map((value) => ({
    value,
    label: t.transactionDetail.frequency[value],
  }));
  const METHODS: { value: PaymentMethod; label: string }[] = METHOD_KEYS.map((value) => ({
    value,
    label: t.transactionDetail.paymentMethod[value],
  }));

  const defaultCategory = useMemo(() => categories.find((c) => c.name === "Other") ?? categories[0], [categories]);

  const [amountCents, setAmountCents] = useState<number | null>(initial?.amountCents ?? null);
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? defaultCategory?.id ?? null);
  const [categoryTouched, setCategoryTouched] = useState(isEdit);
  const [categorySuggested, setCategorySuggested] = useState(false);
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);
  const [frequency, setFrequency] = useState<RecurringFrequency>(initial?.frequency ?? "monthly");
  const [nextOccurrence, setNextOccurrence] = useState(initial?.nextOccurrence ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(initial?.paymentMethod ?? null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (amountCents === null || amountCents <= 0) {
      setError(t.transactionForm.errorInvalidAmount);
      return;
    }
    if (!categoryId) {
      setError(t.transactionForm.errorChooseCategory);
      return;
    }
    const payload = {
      type,
      amountCents,
      categoryId,
      merchant: merchant.trim(),
      date,
      notes: notes.trim(),
      recurring,
      frequency: recurring ? frequency : null,
      nextOccurrence: recurring ? nextOccurrence || defaultNextOccurrence(date, frequency) : null,
      paymentMethod: paymentMethod ?? null,
    };
    if (isEdit && initial) {
      updateTransaction(initial.id, payload);
      toast(t.transactionForm.toastChangesSaved);
    } else {
      addTransaction(payload);
      toast(type === "expense" ? t.transactionForm.toastExpenseAdded : t.transactionForm.toastIncomeAdded);
    }
    haptic("success");
    onClose();
  };

  return (
    <Sheet
      title={isEdit ? t.transactionForm.editTitle : t.transactionForm.addTitle}
      onClose={onClose}
      ariaLabel={isEdit ? t.transactionForm.editTitle : t.transactionForm.addTitle}
    >
      <div className="sheet-form">
        <Field label={t.transactionForm.amount}>
          <div className="amount-row">
            <NumericInput
              cents={amountCents}
              onCentsChange={(c) => {
                setAmountCents(c);
                setError(null);
              }}
              autoFocus
              placeholder={t.transactions.amountPlaceholder}
              aria-label={t.transactionForm.amount}
            />
          </div>
        </Field>

        <Field label={t.transactionForm.typeLabel}>
          <Segmented
            options={[
              { value: "expense", label: t.transactionForm.expenseOption },
              { value: "income", label: t.transactionForm.incomeOption },
            ]}
            value={type}
            onChange={setType}
            ariaLabel={t.transactionForm.typeAriaLabel}
          />
        </Field>

        <Field label={t.transactionForm.categoryLabel} hint={categorySuggested ? t.transactionForm.categorySuggestedHint : undefined}>
          <CategoryPicker
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v);
              setCategoryTouched(true);
              setCategorySuggested(false);
            }}
          />
        </Field>

        <div className="field-grid">
          <Field label={t.transactionForm.merchantLabel} htmlFor="txn-merchant">
            <TextInput
              id="txn-merchant"
              placeholder={t.transactionForm.merchantPlaceholder}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              onBlur={() => {
                if (isEdit || categoryTouched) return;
                const suggestion = suggestCategoryForMerchant(merchant, transactions);
                if (suggestion && suggestion !== categoryId) {
                  setCategoryId(suggestion);
                  setCategorySuggested(true);
                }
              }}
              autoComplete="off"
            />
          </Field>
          <Field label={t.transactionForm.dateLabel} htmlFor="txn-date">
            <DateInput value={date} onChange={setDate} id="txn-date" />
          </Field>
        </div>

        <Field label={t.transactionForm.notesLabel} htmlFor="txn-notes">
          <TextArea id="txn-notes" placeholder={t.transactionForm.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>

        <div className="field-recurring">
          <div className="recurring-head">
            <span className="field-label">{t.transactionForm.recurringLabel}</span>
            <Toggle checked={recurring} onChange={setRecurring} label={t.transactionForm.recurringToggleLabel} />
          </div>
          {recurring && (
            <div className="recurring-opts">
              <ChipGroup options={FREQUENCIES} value={frequency} onChange={setFrequency} ariaLabel={t.transactionForm.recurringFrequencyAriaLabel} />
              <div className="recurring-next">
                <span className="field-label">{t.transactionForm.nextOccurrenceLabel}</span>
                <DateInput value={nextOccurrence || date} onChange={setNextOccurrence} aria-label={t.transactionForm.nextOccurrenceLabel} />
              </div>
            </div>
          )}
        </div>

        <Field label={t.transactionForm.paymentMethodLabel}>
          <ChipGroup options={METHODS} value={paymentMethod} onChange={setPaymentMethod} ariaLabel={t.transactionForm.paymentMethodLabel} />
        </Field>

        <FormError message={error} />
      </div>
      <div className="sheet-footer">
        <Button size="lg" className="btn-block" onClick={save}>
          {isEdit ? t.transactionForm.saveChangesButton : type === "expense" ? t.transactionForm.addExpenseButton : t.transactionForm.addIncomeButton}
        </Button>
      </div>
    </Sheet>
  );
}
