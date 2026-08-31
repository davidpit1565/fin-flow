import { useMemo, useState } from "react";
import { Banknote, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { useT } from "../lib/i18n";
import type { Dictionary } from "../lib/i18n";
import { debtPayoffPlan, type PayoffStrategy } from "../lib/debt";
import { formatMoney } from "../lib/currency";
import { Button, Card, EmptyState, Field, IconBadge, NumericInput, ScreenHeader, Segmented, Sheet, TextInput } from "../components/ui";
import type { CurrencyCode, Debt } from "../types";

interface DebtDraft {
  id: string | null; // null = adding a new debt
  name: string;
  remainingCents: number | null;
  aprText: string;
  minPaymentCents: number | null;
}

function emptyDraft(): DebtDraft {
  return { id: null, name: "", remainingCents: null, aprText: "", minPaymentCents: null };
}

function draftFromDebt(d: Debt): DebtDraft {
  return { id: d.id, name: d.name, remainingCents: d.remainingCents, aprText: String(d.aprPercent), minPaymentCents: d.minPaymentCents };
}

export function DebtsScreen() {
  const { debts, settings, addDebt, updateDebt, deleteDebt, recordDebtPayment, confirm, toast } = useApp();
  const { back } = useNavigation();
  const t = useT();
  const STRATEGY_OPTIONS: { value: PayoffStrategy; label: string }[] = [
    { value: "snowball", label: t.debts.strategySnowball },
    { value: "avalanche", label: t.debts.strategyAvalanche },
  ];
  const [draft, setDraft] = useState<DebtDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<Debt | null>(null);
  const [paymentCents, setPaymentCents] = useState<number | null>(null);
  const [strategy, setStrategy] = useState<PayoffStrategy>("snowball");
  const [extraCents, setExtraCents] = useState<number | null>(null);

  const plan = useMemo(
    () => (debts.length > 0 ? debtPayoffPlan(debts, extraCents ?? 0, strategy) : null),
    [debts, extraCents, strategy]
  );

  if (!settings) return null;
  const { currency } = settings;

  const save = () => {
    if (!draft) return;
    const name = draft.name.trim();
    const apr = Number(draft.aprText);
    if (!name) {
      setError(t.debts.enterName);
      return;
    }
    if (draft.remainingCents === null || draft.remainingCents <= 0) {
      setError(t.debts.enterRemainingBalance);
      return;
    }
    if (draft.aprText.trim() === "" || !Number.isFinite(apr) || apr < 0) {
      setError(t.debts.enterValidInterestRate);
      return;
    }
    if (draft.minPaymentCents === null || draft.minPaymentCents <= 0) {
      setError(t.debts.enterMinimumPayment);
      return;
    }
    if (draft.id === null) {
      addDebt(name, draft.remainingCents, apr, draft.minPaymentCents);
      toast(t.debts.debtAdded);
    } else {
      updateDebt(draft.id, { name, remainingCents: draft.remainingCents, aprPercent: apr, minPaymentCents: draft.minPaymentCents });
      toast(t.debts.debtUpdated);
    }
    setDraft(null);
    setError(null);
  };

  const removeDebt = async (d: Debt) => {
    const ok = await confirm({
      title: t.debts.deleteDebtConfirmTitle,
      message: t.debts.deleteDebtConfirmMessage(d.name),
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteDebt(d.id);
    toast(t.common.deleted);
  };

  const savePayment = () => {
    if (!paying || paymentCents === null || paymentCents <= 0) return;
    recordDebtPayment(paying.id, paymentCents);
    toast(t.debts.paymentRecorded);
    setPaying(null);
    setPaymentCents(null);
  };

  return (
    <div className="screen">
      <ScreenHeader title={t.debts.title} subtitle={t.debts.subtitle} onBack={back} />

      {debts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t.debts.emptyTitle}
          message={t.debts.emptyMessage}
          action={
            <Button
              onClick={() => {
                setDraft(emptyDraft());
                setError(null);
              }}
            >
              <Plus size={18} strokeWidth={2} /> {t.debts.addDebt}
            </Button>
          }
        />
      ) : (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">{t.debts.sectionTitle}</h2>
            <button
              className="section-action"
              onClick={() => {
                setDraft(emptyDraft());
                setError(null);
              }}
            >
              <Plus size={15} strokeWidth={2.2} /> {t.common.add}
            </button>
          </div>
          <Card className="budget-list">
            {debts.map((d) => (
              <div key={d.id} className="budget-item">
                <DebtRow
                  debt={d}
                  currency={currency}
                  t={t}
                  onEdit={() => {
                    setDraft(draftFromDebt(d));
                    setError(null);
                  }}
                  onDelete={() => void removeDebt(d)}
                  onPay={() => {
                    setPaying(d);
                    setPaymentCents(null);
                  }}
                />
              </div>
            ))}
          </Card>
        </section>
      )}

      {debts.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">{t.debts.payoffPlanTitle}</h2>
          </div>
          <Card className="card-soft">
            <Field label={t.debts.strategyFieldLabel}>
              <Segmented options={STRATEGY_OPTIONS} value={strategy} onChange={setStrategy} ariaLabel={t.debts.strategyAria} />
            </Field>
            <Field label={t.debts.extraPaymentFieldLabel} hint={t.debts.extraPaymentHint}>
              <NumericInput cents={extraCents} onCentsChange={setExtraCents} placeholder="0.00" aria-label={t.debts.extraPaymentAria} />
            </Field>
          </Card>

          {plan && plan.neverPaysOff && (
            <Card className="card-soft debt-plan-result">
              <p className="card-soft-text">{t.debts.neverPaysOff}</p>
            </Card>
          )}

          {plan && !plan.neverPaysOff && (
            <Card className="detail-card debt-plan-result">
              <div className="equiv-row">
                <div className="equiv-cell">
                  <span className="stat-label">{t.debts.debtFreeInLabel}</span>
                  <span className="equiv-value">{t.debts.monthsCount(plan.totalMonths)}</span>
                </div>
                <div className="equiv-cell">
                  <span className="stat-label">{t.debts.totalInterestLabel}</span>
                  <span className="equiv-value">{formatMoney(plan.totalInterestPaidCents, currency)}</span>
                </div>
              </div>
              {plan.perDebt.map((p) => {
                const d = debts.find((x) => x.id === p.debtId);
                if (!d) return null;
                return (
                  <div key={p.debtId} className="detail-row">
                    <span className="detail-row-label">{d.name}</span>
                    <span className="detail-row-value">{t.debts.payoffMonth(p.payoffMonth)}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      )}

      {draft && (
        <Sheet
          title={draft.id === null ? t.debts.addDebtSheetTitle : t.debts.editDebtSheetTitle}
          onClose={() => setDraft(null)}
          ariaLabel={draft.id === null ? t.debts.addDebtSheetTitle : t.debts.editDebtSheetTitle}
          footer={
            <Button size="lg" className="btn-block" onClick={save}>
              {draft.id === null ? t.debts.addDebtSheetTitle : t.debts.saveChanges}
            </Button>
          }
        >
          <div className="sheet-form">
            <Field label={t.debts.nameFieldLabel}>
              <TextInput
                value={draft.name}
                onChange={(e) => {
                  setDraft({ ...draft, name: e.target.value });
                  setError(null);
                }}
                placeholder={t.debts.namePlaceholder}
                autoFocus
                aria-label={t.debts.debtNameAria}
              />
            </Field>
            <Field label={t.debts.remainingBalanceFieldLabel}>
              <NumericInput
                cents={draft.remainingCents}
                onCentsChange={(c) => {
                  setDraft({ ...draft, remainingCents: c });
                  setError(null);
                }}
                placeholder="0.00"
                aria-label={t.debts.remainingBalanceFieldLabel}
              />
            </Field>
            <Field label={t.debts.interestRateFieldLabel}>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={draft.aprText}
                onChange={(e) => {
                  setDraft({ ...draft, aprText: e.target.value });
                  setError(null);
                }}
                placeholder="0.00"
                aria-label={t.debts.interestRateAria}
              />
            </Field>
            <Field label={t.debts.minimumPaymentFieldLabel}>
              <NumericInput
                cents={draft.minPaymentCents}
                onCentsChange={(c) => {
                  setDraft({ ...draft, minPaymentCents: c });
                  setError(null);
                }}
                placeholder="0.00"
                aria-label={t.debts.minimumPaymentFieldLabel}
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </Sheet>
      )}

      {paying && (
        <Sheet
          title={t.debts.recordPaymentSheetTitle}
          onClose={() => setPaying(null)}
          ariaLabel={t.debts.recordPaymentSheetTitle}
          footer={
            <Button size="lg" className="btn-block" onClick={savePayment}>
              {t.debts.recordPaymentSheetTitle}
            </Button>
          }
        >
          <div className="sheet-form">
            <Field label={t.debts.paymentTowardFieldLabel(paying.name)}>
              <NumericInput
                cents={paymentCents}
                onCentsChange={setPaymentCents}
                autoFocus
                placeholder="0.00"
                aria-label={t.debts.paymentAmountAria}
              />
            </Field>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function DebtRow({
  debt,
  currency,
  t,
  onEdit,
  onDelete,
  onPay,
}: {
  debt: Debt;
  currency: CurrencyCode;
  t: Dictionary;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
}) {
  return (
    <div>
      <div className="budget-item-head">
        <div className="budget-item-name">
          <IconBadge icon={CreditCard} size="sm" />
          <span className="row-title">{debt.name}</span>
          <span className="period-tag">{t.debts.aprTag(debt.aprPercent)}</span>
        </div>
        <div className="budget-item-actions">
          <button className="icon-btn icon-btn-sm" aria-label={t.debts.recordPaymentAria(debt.name)} onClick={onPay}>
            <Banknote size={15} strokeWidth={2} />
          </button>
          <button className="icon-btn icon-btn-sm" aria-label={t.debts.editAria(debt.name)} onClick={onEdit}>
            <Pencil size={15} strokeWidth={2} />
          </button>
          <button className="icon-btn icon-btn-sm" aria-label={t.debts.deleteAria(debt.name)} onClick={onDelete}>
            <Trash2 size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="budget-row">
        <span className="row-title">
          {formatMoney(debt.remainingCents, currency)} <span className="row-sub">{t.debts.remainingSuffix}</span>
        </span>
        <span className="row-sub">{t.debts.minPerMonth(formatMoney(debt.minPaymentCents, currency))}</span>
      </div>
    </div>
  );
}
