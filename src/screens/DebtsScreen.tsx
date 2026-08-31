import { useMemo, useState } from "react";
import { Banknote, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { debtPayoffPlan, type PayoffStrategy } from "../lib/debt";
import { formatMoney } from "../lib/currency";
import { Button, Card, EmptyState, Field, IconBadge, NumericInput, ScreenHeader, Segmented, Sheet, TextInput } from "../components/ui";
import type { CurrencyCode, Debt } from "../types";

const STRATEGY_OPTIONS: { value: PayoffStrategy; label: string }[] = [
  { value: "snowball", label: "Snowball" },
  { value: "avalanche", label: "Avalanche" },
];

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
      setError("Enter a name.");
      return;
    }
    if (draft.remainingCents === null || draft.remainingCents <= 0) {
      setError("Enter the remaining balance.");
      return;
    }
    if (draft.aprText.trim() === "" || !Number.isFinite(apr) || apr < 0) {
      setError("Enter a valid interest rate.");
      return;
    }
    if (draft.minPaymentCents === null || draft.minPaymentCents <= 0) {
      setError("Enter the minimum payment.");
      return;
    }
    if (draft.id === null) {
      addDebt(name, draft.remainingCents, apr, draft.minPaymentCents);
      toast("Debt added");
    } else {
      updateDebt(draft.id, { name, remainingCents: draft.remainingCents, aprPercent: apr, minPaymentCents: draft.minPaymentCents });
      toast("Debt updated");
    }
    setDraft(null);
    setError(null);
  };

  const removeDebt = async (d: Debt) => {
    const ok = await confirm({
      title: "Delete debt?",
      message: `This removes "${d.name}" from your payoff plan. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteDebt(d.id);
    toast("Deleted");
  };

  const savePayment = () => {
    if (!paying || paymentCents === null || paymentCents <= 0) return;
    recordDebtPayment(paying.id, paymentCents);
    toast("Payment recorded");
    setPaying(null);
    setPaymentCents(null);
  };

  return (
    <div className="screen">
      <ScreenHeader title="Debts" subtitle="Track what you owe and plan how to pay it off" onBack={back} />

      {debts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No debts yet"
          message="Add a credit card, loan, or anything else you owe to start planning your payoff."
          action={
            <Button
              onClick={() => {
                setDraft(emptyDraft());
                setError(null);
              }}
            >
              <Plus size={18} strokeWidth={2} /> Add debt
            </Button>
          }
        />
      ) : (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Your debts</h2>
            <button
              className="section-action"
              onClick={() => {
                setDraft(emptyDraft());
                setError(null);
              }}
            >
              <Plus size={15} strokeWidth={2.2} /> Add
            </button>
          </div>
          <Card className="budget-list">
            {debts.map((d) => (
              <div key={d.id} className="budget-item">
                <DebtRow
                  debt={d}
                  currency={currency}
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
            <h2 className="section-title">Payoff plan</h2>
          </div>
          <Card className="card-soft">
            <Field label="Strategy">
              <Segmented options={STRATEGY_OPTIONS} value={strategy} onChange={setStrategy} ariaLabel="Payoff strategy" />
            </Field>
            <Field label="Extra monthly payment" hint="Split across minimum payments for every debt, plus this much more toward one debt at a time.">
              <NumericInput cents={extraCents} onCentsChange={setExtraCents} placeholder="0.00" aria-label="Extra monthly payment" />
            </Field>
          </Card>

          {plan && plan.neverPaysOff && (
            <Card className="card-soft debt-plan-result">
              <p className="card-soft-text">
                At this payment level these debts won't ever be paid off — try adding an extra monthly payment.
              </p>
            </Card>
          )}

          {plan && !plan.neverPaysOff && (
            <Card className="detail-card debt-plan-result">
              <div className="equiv-row">
                <div className="equiv-cell">
                  <span className="stat-label">Debt-free in</span>
                  <span className="equiv-value">
                    {plan.totalMonths} {plan.totalMonths === 1 ? "month" : "months"}
                  </span>
                </div>
                <div className="equiv-cell">
                  <span className="stat-label">Total interest</span>
                  <span className="equiv-value">{formatMoney(plan.totalInterestPaidCents, currency)}</span>
                </div>
              </div>
              {plan.perDebt.map((p) => {
                const d = debts.find((x) => x.id === p.debtId);
                if (!d) return null;
                return (
                  <div key={p.debtId} className="detail-row">
                    <span className="detail-row-label">{d.name}</span>
                    <span className="detail-row-value">Month {p.payoffMonth}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      )}

      {draft && (
        <Sheet title={draft.id === null ? "Add debt" : "Edit debt"} onClose={() => setDraft(null)} ariaLabel={draft.id === null ? "Add debt" : "Edit debt"}>
          <div className="sheet-form">
            <Field label="Name">
              <TextInput
                value={draft.name}
                onChange={(e) => {
                  setDraft({ ...draft, name: e.target.value });
                  setError(null);
                }}
                placeholder="e.g. Visa card"
                autoFocus
                aria-label="Debt name"
              />
            </Field>
            <Field label="Remaining balance">
              <NumericInput
                cents={draft.remainingCents}
                onCentsChange={(c) => {
                  setDraft({ ...draft, remainingCents: c });
                  setError(null);
                }}
                placeholder="0.00"
                aria-label="Remaining balance"
              />
            </Field>
            <Field label="Interest rate (APR %)">
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
                aria-label="Interest rate"
              />
            </Field>
            <Field label="Minimum payment">
              <NumericInput
                cents={draft.minPaymentCents}
                onCentsChange={(c) => {
                  setDraft({ ...draft, minPaymentCents: c });
                  setError(null);
                }}
                placeholder="0.00"
                aria-label="Minimum payment"
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" onClick={save}>
              {draft.id === null ? "Add debt" : "Save changes"}
            </Button>
          </div>
        </Sheet>
      )}

      {paying && (
        <Sheet title="Record payment" onClose={() => setPaying(null)} ariaLabel="Record payment">
          <div className="sheet-form">
            <Field label={`Payment toward ${paying.name}`}>
              <NumericInput cents={paymentCents} onCentsChange={setPaymentCents} autoFocus placeholder="0.00" aria-label="Payment amount" />
            </Field>
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" onClick={savePayment}>
              Record payment
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function DebtRow({
  debt,
  currency,
  onEdit,
  onDelete,
  onPay,
}: {
  debt: Debt;
  currency: CurrencyCode;
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
          <span className="period-tag">{debt.aprPercent}% APR</span>
        </div>
        <div className="budget-item-actions">
          <button className="icon-btn icon-btn-sm" aria-label={`Record payment for ${debt.name}`} onClick={onPay}>
            <Banknote size={15} strokeWidth={2} />
          </button>
          <button className="icon-btn icon-btn-sm" aria-label={`Edit ${debt.name}`} onClick={onEdit}>
            <Pencil size={15} strokeWidth={2} />
          </button>
          <button className="icon-btn icon-btn-sm" aria-label={`Delete ${debt.name}`} onClick={onDelete}>
            <Trash2 size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="budget-row">
        <span className="row-title">
          {formatMoney(debt.remainingCents, currency)} <span className="row-sub">remaining</span>
        </span>
        <span className="row-sub">Min {formatMoney(debt.minPaymentCents, currency)}/mo</span>
      </div>
    </div>
  );
}
