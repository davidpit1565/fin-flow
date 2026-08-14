import { useMemo, useState } from "react";
import type { PaymentMethod, RecurringFrequency, Transaction, TransactionType } from "../types";
import { useApp } from "../store/AppContext";
import { addDays, addMonths, todayISO } from "../lib/dates";
import { Button, ChipGroup, DateInput, Field, FormError, NumericInput, Segmented, Sheet, TextArea, TextInput, Toggle } from "./ui";
import { CategoryPicker } from "./CategoryPicker";

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
];

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
  const { categories, addTransaction, updateTransaction, toast, haptic } = useApp();
  const isEdit = !!initial;

  const defaultCategory = useMemo(() => categories.find((c) => c.name === "Other") ?? categories[0], [categories]);

  const [amountCents, setAmountCents] = useState<number | null>(initial?.amountCents ?? null);
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? defaultCategory?.id ?? null);
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
      setError("Enter a valid amount.");
      return;
    }
    if (!categoryId) {
      setError("Please choose a category.");
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
      toast("Changes saved");
    } else {
      addTransaction(payload);
      toast(type === "expense" ? "Expense added" : "Income added");
    }
    haptic("success");
    onClose();
  };

  return (
    <Sheet title={isEdit ? "Edit transaction" : "Add transaction"} onClose={onClose} ariaLabel={isEdit ? "Edit transaction" : "Add transaction"}>
      <div className="sheet-form">
        <Field label="Amount">
          <div className="amount-row">
            <NumericInput
              cents={amountCents}
              onCentsChange={(c) => {
                setAmountCents(c);
                setError(null);
              }}
              autoFocus
              placeholder="0.00"
              aria-label="Amount"
            />
          </div>
        </Field>

        <Field label="Type">
          <Segmented
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
            value={type}
            onChange={setType}
            ariaLabel="Transaction type"
          />
        </Field>

        <Field label="Category">
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </Field>

        <div className="field-grid">
          <Field label="Merchant" htmlFor="txn-merchant">
            <TextInput
              id="txn-merchant"
              placeholder="Optional"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Date" htmlFor="txn-date">
            <DateInput value={date} onChange={setDate} id="txn-date" />
          </Field>
        </div>

        <Field label="Notes" htmlFor="txn-notes">
          <TextArea id="txn-notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>

        <div className="field-recurring">
          <div className="recurring-head">
            <span className="field-label">Recurring</span>
            <Toggle checked={recurring} onChange={setRecurring} label="Recurring transaction" />
          </div>
          {recurring && (
            <div className="recurring-opts">
              <ChipGroup options={FREQUENCIES} value={frequency} onChange={setFrequency} ariaLabel="Recurring frequency" />
              <div className="recurring-next">
                <span className="field-label">Next occurrence</span>
                <DateInput value={nextOccurrence || date} onChange={setNextOccurrence} aria-label="Next occurrence" />
              </div>
            </div>
          )}
        </div>

        <Field label="Payment method">
          <ChipGroup options={METHODS} value={paymentMethod} onChange={setPaymentMethod} ariaLabel="Payment method" />
        </Field>

        <FormError message={error} />
      </div>
      <div className="sheet-footer">
        <Button size="lg" className="btn-block" onClick={save}>
          {isEdit ? "Save changes" : type === "expense" ? "Add expense" : "Add income"}
        </Button>
      </div>
    </Sheet>
  );
}
