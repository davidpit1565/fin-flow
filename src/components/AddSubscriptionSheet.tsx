import { useMemo, useState } from "react";
import type { PaymentMethod, Subscription, SubscriptionFrequency, SubscriptionUsage } from "../types";
import { useApp } from "../store/AppContext";
import { todayISO } from "../lib/dates";
import { reminderTimestamp } from "../lib/notifications";
import { useT } from "../lib/i18n";
import { Button, ChipGroup, DateInput, Field, FormError, NumericInput, Sheet, TextArea, TextInput, Toggle } from "./ui";
import { CategoryPicker } from "./CategoryPicker";

const FREQUENCY_VALUES: SubscriptionFrequency[] = ["weekly", "monthly", "quarterly", "yearly"];
const METHOD_VALUES: PaymentMethod[] = ["cash", "card", "bank", "other"];
const REMINDER_VALUES: ("none" | "0" | "1" | "3" | "7")[] = ["none", "0", "1", "3", "7"];
const USAGE_VALUES: SubscriptionUsage[] = ["regular", "rarely", "unused"];

function reminderValueToDays(v: string): number | null {
  return v === "none" ? null : Number(v);
}

export function AddSubscriptionSheet({ initial, onClose }: { initial?: Subscription | null; onClose: () => void }) {
  const { categories, settings, addSubscription, updateSubscription, toast, haptic } = useApp();
  const t = useT();
  const isEdit = !!initial;

  const FREQUENCIES = useMemo(
    () => FREQUENCY_VALUES.map((value) => ({ value, label: t.subscriptions.frequencyChipLabel(value) })),
    [t]
  );
  const METHODS = useMemo(() => METHOD_VALUES.map((value) => ({ value, label: t.subscriptions.paymentMethodLabel(value) })), [t]);
  const REMINDERS = useMemo(
    () => REMINDER_VALUES.map((value) => ({ value, label: t.subscriptions.reminderChipLabel(value) })),
    [t]
  );
  const USAGE = useMemo(() => USAGE_VALUES.map((value) => ({ value, label: t.subscriptions.usageChipLabel(value) })), [t]);

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
      setError(t.subscriptions.errorServiceName);
      return;
    }
    if (amountCents === null || amountCents <= 0) {
      setError(t.subscriptions.errorAmount);
      return;
    }
    if (!categoryId) {
      setError(t.subscriptions.errorCategory);
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
      toast(t.subscriptions.changesSavedToast);
    } else {
      addSubscription(payload);
      toast(t.subscriptions.subscriptionAddedToast);
    }
    haptic("success");
    onClose();
  };

  return (
    <Sheet
      title={isEdit ? t.subscriptions.editSubscription : t.subscriptions.addSubscription}
      onClose={onClose}
      ariaLabel={isEdit ? t.subscriptions.editSubscription : t.subscriptions.addSubscription}
      footer={
        <Button size="lg" className="btn-block" onClick={save}>
          {isEdit ? t.subscriptions.saveChanges : t.subscriptions.addSubscription}
        </Button>
      }
    >
      <div className="sheet-form">
        <Field label={t.subscriptions.serviceNameLabel} htmlFor="sub-name">
          <TextInput
            id="sub-name"
            placeholder={t.subscriptions.serviceNamePlaceholder}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            autoFocus
            autoComplete="off"
          />
        </Field>

        <Field label={t.subscriptions.amountFieldLabel}>
          <NumericInput
            cents={amountCents}
            onCentsChange={(c) => {
              setAmountCents(c);
              setError(null);
            }}
            placeholder={t.subscriptions.amountPlaceholder}
            aria-label={t.subscriptions.amountFieldLabel}
          />
        </Field>

        <Field label={t.subscriptions.billingFrequencyLabel}>
          <ChipGroup options={FREQUENCIES} value={frequency} onChange={setFrequency} ariaLabel={t.subscriptions.billingFrequencyLabel} />
        </Field>

        <Field label={t.subscriptions.nextPaymentLabel} htmlFor="sub-next">
          <DateInput value={nextPaymentDate} onChange={setNextPaymentDate} id="sub-next" />
        </Field>

        <Field label={t.subscriptions.categoryFieldLabel}>
          <CategoryPicker value={categoryId} onChange={setCategoryId} ariaLabel={t.subscriptions.categoryPickerAria} />
        </Field>

        <Field label={t.subscriptions.paymentMethodFieldLabel}>
          <ChipGroup options={METHODS} value={paymentMethod} onChange={setPaymentMethod} ariaLabel={t.subscriptions.paymentMethodFieldLabel} />
        </Field>

        <div className="field-recurring">
          <div className="recurring-head">
            <span className="field-label">{t.subscriptions.notificationReminderLabel}</span>
            <Toggle checked={reminderToggle} onChange={setReminderToggle} label={t.subscriptions.notificationReminderLabel} />
          </div>
          {reminderToggle && (
            <div className="recurring-opts">
              <ChipGroup options={REMINDERS} value={reminderValue} onChange={setReminderValue} ariaLabel={t.subscriptions.reminderTimingAria} />
              {reminderAlreadyPassed ? (
                <p className="field-hint field-hint-warn">{t.subscriptions.reminderPassedWarning}</p>
              ) : (
                <p className="field-hint">{t.subscriptions.remindersHint}</p>
              )}
            </div>
          )}
        </div>

        <Field label={t.subscriptions.usageQuestionLabel}>
          <ChipGroup options={USAGE} value={usage} onChange={setUsage} ariaLabel={t.subscriptions.usageAria} />
          <p className="field-hint">{t.subscriptions.usageHint}</p>
        </Field>

        <Field label={t.subscriptions.notesFieldLabel} htmlFor="sub-notes">
          <TextArea id="sub-notes" placeholder={t.subscriptions.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>

        <FormError message={error} />
      </div>
    </Sheet>
  );
}
