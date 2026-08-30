import { useMemo, useState } from "react";
import type { PaymentMethod, Subscription, SubscriptionFrequency, SubscriptionUsage } from "../types";
import { useApp } from "../store/AppContext";
import { todayISO } from "../lib/dates";
import { reminderTimestamp } from "../lib/notifications";
import { Button, ChipGroup, DateInput, Field, FormError, NumericInput, Sheet, TextArea, TextInput, Toggle } from "./ui";
import { CategoryPicker } from "./CategoryPicker";

const FREQUENCIES: { value: SubscriptionFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
];

const REMINDERS: { value: string; label: string }[] = [
  { value: "none", label: "None" },
  { value: "0", label: "Same day" },
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
];

function reminderValueToDays(v: string): number | null {
  return v === "none" ? null : Number(v);
}

const USAGE: { value: SubscriptionUsage; label: string }[] = [
  { value: "regular", label: "Regularly" },
  { value: "rarely", label: "Rarely" },
  { value: "unused", label: "Unused" },
];

export function AddSubscriptionSheet({ initial, onClose }: { initial?: Subscription | null; onClose: () => void }) {
  const { categories, settings, addSubscription, updateSubscription, toast, haptic } = useApp();
  const isEdit = !!initial;

  const defaultCategory = useMemo(
    () => categories.find((c) => c.name === "Subscriptions") ?? categories.find((c) => c.name === "Other") ?? categories[0],
    [categories]
  );

  const [name, setName] = useState(initial?.name ?? "");
  const [amountCents, setAmountCents] = useState<number | null>(initial?.amountCents ?? null);
  const [frequency, setFrequency] = useState<SubscriptionFrequency>(initial?.frequency ?? "monthly");
  const [nextPaymentDate, setNextPaymentDate] = useState(initial?.nextPaymentDate ?? todayISO());
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? defaultCategory?.id ?? null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(initial?.paymentMethod ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [reminderValue, setReminderValue] = useState<string>(initial?.reminderDays === null ? "none" : String(initial?.reminderDays ?? "none"));
  const [usage, setUsage] = useState<SubscriptionUsage>(initial?.usage ?? "regular");
  const [reminderToggle, setReminderToggle] = useState(initial?.reminderDays !== null);
  const [error, setError] = useState<string | null>(null);

  if (!settings) return null;

  const selectedReminderDays = reminderValueToDays(reminderValue);
  const reminderAlreadyPassed =
    reminderToggle && selectedReminderDays !== null && reminderTimestamp(nextPaymentDate, selectedReminderDays) <= Date.now();

  const save = () => {
    if (!name.trim()) {
      setError("Please enter a service name.");
      return;
    }
    if (amountCents === null || amountCents <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!categoryId) {
      setError("Please choose a category.");
      return;
    }
    const payload = {
      name: name.trim(),
      amountCents,
      currency: settings.currency,
      frequency,
      nextPaymentDate,
      categoryId,
      paymentMethod: paymentMethod ?? null,
      notes: notes.trim(),
      reminderDays: reminderToggle ? reminderValueToDays(reminderValue) : null,
      usage,
      status: (initial?.status ?? "active") as Subscription["status"],
    };
    if (isEdit && initial) {
      updateSubscription(initial.id, payload);
      toast("Changes saved");
    } else {
      addSubscription(payload);
      toast("Subscription added");
    }
    haptic("success");
    onClose();
  };

  return (
    <Sheet title={isEdit ? "Edit subscription" : "Add subscription"} onClose={onClose} ariaLabel={isEdit ? "Edit subscription" : "Add subscription"}>
      <div className="sheet-form">
        <Field label="Service name" htmlFor="sub-name">
          <TextInput
            id="sub-name"
            placeholder="Netflix"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            autoFocus
            autoComplete="off"
          />
        </Field>

        <Field label="Amount">
          <NumericInput
            cents={amountCents}
            onCentsChange={(c) => {
              setAmountCents(c);
              setError(null);
            }}
            placeholder="0.00"
            aria-label="Amount"
          />
        </Field>

        <Field label="Billing frequency">
          <ChipGroup options={FREQUENCIES} value={frequency} onChange={setFrequency} ariaLabel="Billing frequency" />
        </Field>

        <Field label="Next payment" htmlFor="sub-next">
          <DateInput value={nextPaymentDate} onChange={setNextPaymentDate} id="sub-next" />
        </Field>

        <Field label="Category">
          <CategoryPicker value={categoryId} onChange={setCategoryId} ariaLabel="Subscription category" />
        </Field>

        <Field label="Payment method">
          <ChipGroup options={METHODS} value={paymentMethod} onChange={setPaymentMethod} ariaLabel="Payment method" />
        </Field>

        <div className="field-recurring">
          <div className="recurring-head">
            <span className="field-label">Notification reminder</span>
            <Toggle checked={reminderToggle} onChange={setReminderToggle} label="Notification reminder" />
          </div>
          {reminderToggle && (
            <div className="recurring-opts">
              <ChipGroup options={REMINDERS} value={reminderValue} onChange={setReminderValue} ariaLabel="Reminder timing" />
              {reminderAlreadyPassed ? (
                <p className="field-hint field-hint-warn">
                  This reminder time has already passed for the selected next payment date, so it won't be sent. Pick a later
                  payment date or a shorter reminder window.
                </p>
              ) : (
                <p className="field-hint">Reminders are sent at 9:00 AM local time.</p>
              )}
            </div>
          )}
        </div>

        <Field label="How often do you use it?">
          <ChipGroup options={USAGE} value={usage} onChange={setUsage} ariaLabel="Usage" />
          <p className="field-hint">Used to estimate potential savings.</p>
        </Field>

        <Field label="Notes" htmlFor="sub-notes">
          <TextArea id="sub-notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>

        <FormError message={error} />
      </div>
      <div className="sheet-footer">
        <Button size="lg" className="btn-block" onClick={save}>
          {isEdit ? "Save changes" : "Add subscription"}
        </Button>
      </div>
    </Sheet>
  );
}
