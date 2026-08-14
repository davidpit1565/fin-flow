import { useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { budgetStatus } from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { Button, Card, EmptyState, Field, IconBadge, NumericInput, ProgressBar, ScreenHeader, Sheet } from "../components/ui";
import { iconByName } from "../lib/icons";
import type { CurrencyCode } from "../types";

export function BudgetsScreen() {
  const { budgets, categories, settings, addBudget, updateBudget, deleteBudget, confirm, toast } = useApp();
  const { back } = useNavigation();
  const [editing, setEditing] = useState<{ categoryId: string | null; current: number } | null>(null);
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!settings) return null;
  const { currency } = settings;

  const overall = budgets.find((b) => b.categoryId === null);
  const categoryBudgets = budgets.filter((b) => b.categoryId !== null);
  const budgetedCategoryIds = useMemo(() => new Set(categoryBudgets.map((b) => b.categoryId)), [categoryBudgets]);
  const availableCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id));

  const save = () => {
    if (amountCents === null || amountCents <= 0) {
      setError("Enter a valid budget amount.");
      return;
    }
    if (editing) {
      if (editing.categoryId === null) {
        if (overall) updateBudget(overall.id, amountCents);
        else addBudget(null, amountCents);
      } else {
        const existing = budgets.find((b) => b.categoryId === editing.categoryId);
        if (existing) updateBudget(existing.id, amountCents);
        else addBudget(editing.categoryId, amountCents);
      }
      toast("Budget saved");
    }
    setEditing(null);
    setAmountCents(null);
    setError(null);
  };

  const removeBudget = async (b: { id: string; categoryId: string | null }) => {
    const ok = await confirm({
      title: "Delete budget?",
      message: "This only removes the budget — your transactions stay.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteBudget(b.id);
    toast("Deleted");
  };

  return (
    <div className="screen">
      <ScreenHeader title="Budgets" subtitle="Set a monthly limit for your overall spending or per category" onBack={back} />

      {budgets.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="No budgets yet"
          message="Set a monthly limit and Flow will tell you when you're getting close."
          action={
            <Button
              onClick={() => {
                setEditing({ categoryId: null, current: 0 });
                setAmountCents(null);
              }}
            >
              <Plus size={18} strokeWidth={2} /> Set monthly budget
            </Button>
          }
        />
      )}

      {overall && (
        <section className="section">
          <h2 className="section-title">Overall</h2>
          <Card className="budget-card">
            <BudgetStatusView
              budgetId={overall.id}
              name="Monthly budget"
              currency={currency}
              onEdit={() => {
                setEditing({ categoryId: null, current: overall.amountCents });
                setAmountCents(overall.amountCents);
              }}
              onDelete={() => void removeBudget(overall)}
            />
          </Card>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Category budgets</h2>
          {availableCategories.length > 0 && (
            <button
              className="section-action"
              onClick={() => {
                setEditing({ categoryId: availableCategories[0].id, current: 0 });
                setAmountCents(null);
              }}
            >
              <Plus size={15} strokeWidth={2.2} /> Add
            </button>
          )}
        </div>
        {categoryBudgets.length === 0 ? (
          <Card className="card-soft">
            <p className="card-soft-text">
              Add budgets for categories like Food or Shopping. Use the “Add” button above.
            </p>
          </Card>
        ) : (
          <Card className="budget-list">
            {categoryBudgets.map((b) => {
              const cat = categories.find((c) => c.id === b.categoryId);
              if (!cat) return null;
              return (
                <div key={b.id} className="budget-item">
                  <BudgetStatusView
                    budgetId={b.id}
                    name={cat.name}
                    icon={cat.icon}
                    currency={currency}
                    onEdit={() => {
                      setEditing({ categoryId: b.categoryId, current: b.amountCents });
                      setAmountCents(b.amountCents);
                    }}
                    onDelete={() => void removeBudget(b)}
                  />
                </div>
              );
            })}
          </Card>
        )}
      </section>

      {editing && (
        <Sheet title={editing.categoryId === null ? "Monthly budget" : "Category budget"} onClose={() => setEditing(null)} ariaLabel="Edit budget">
          <div className="sheet-form">
            <Field label="Amount per month">
              <NumericInput
                cents={amountCents}
                onCentsChange={(c) => {
                  setAmountCents(c);
                  setError(null);
                }}
                autoFocus
                placeholder="0.00"
                aria-label="Budget amount"
              />
            </Field>
            {editing.categoryId !== null && (
              <Field label="Category">
                <div className="chip-group wrap">
                  {availableCategories.concat(categories.find((c) => c.id === editing.categoryId) ?? []).map((c) => (
                    <button
                      key={c.id}
                      className={`chip ${editing.categoryId === c.id ? "chip-active" : ""}`}
                      onClick={() => setEditing({ categoryId: c.id, current: editing.current })}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" onClick={save}>
              Save budget
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function BudgetStatusView({
  budgetId,
  name,
  icon,
  currency,
  onEdit,
  onDelete,
}: {
  budgetId: string;
  name: string;
  icon?: string;
  currency: CurrencyCode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { budgets, transactions } = useApp();
  const budget = budgets.find((b) => b.id === budgetId);
  if (!budget) return null;
  const status = budgetStatus(budget, transactions);
  const tone = status.level === "over" ? "over" : status.level === "reached" ? "over" : status.level === "high" || status.level === "close" ? "warn" : "ok";
  const Icon = iconByName(icon);
  return (
    <div>
      <div className="budget-item-head">
        <div className="budget-item-name">
          {icon && <IconBadge icon={Icon} size="sm" />}
          <span className="row-title">{name}</span>
        </div>
        <div className="budget-item-actions">
          <button className="icon-btn icon-btn-sm" aria-label={`Edit ${name} budget`} onClick={onEdit}>
            <Plus size={15} strokeWidth={2} />
          </button>
          <button className="icon-btn icon-btn-sm" aria-label={`Delete ${name} budget`} onClick={onDelete}>
            <Trash2 size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="budget-row">
        <span className="row-title">
          {formatMoney(status.spentCents, currency)} <span className="row-sub">/ {formatMoney(budget.amountCents, currency)}</span>
        </span>
        <span className="row-sub">{Math.round(status.percent)}%</span>
      </div>
      <ProgressBar percent={status.percent} tone={tone} />
      <p className={`budget-msg ${tone}`}>
        {status.level === "over"
          ? `You're ${formatMoney(-status.remainingCents, currency)} over your ${name.toLowerCase()} budget.`
          : status.level === "reached"
            ? `You've reached your ${name.toLowerCase()} budget.`
            : status.level === "high"
              ? `You've used 90% of your ${name.toLowerCase()} budget.`
              : status.level === "close"
                ? `You're close to your ${name.toLowerCase()} budget.`
                : `${formatMoney(status.remainingCents, currency)} remaining`}
      </p>
    </div>
  );
}
