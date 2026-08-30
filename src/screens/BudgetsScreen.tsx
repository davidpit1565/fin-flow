import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { budgetStatus } from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { Button, Card, EmptyState, Field, IconBadge, NumericInput, ProgressBar, ScreenHeader, Segmented, Sheet } from "../components/ui";
import { iconByName } from "../lib/icons";
import type { BudgetPeriod, Category, CurrencyCode } from "../types";

const PERIOD_LABEL: Record<BudgetPeriod, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const PERIOD_UNIT: Record<BudgetPeriod, string> = { daily: "day", weekly: "week", monthly: "month" };
const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function BudgetsScreen() {
  const { budgets, categories, settings, addBudget, updateBudget, deleteBudget, confirm, toast } = useApp();
  const { back } = useNavigation();
  const [editing, setEditing] = useState<{ categoryId: string | null; current: number; period: BudgetPeriod } | null>(null);
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
        if (overall) updateBudget(overall.id, amountCents, editing.period);
        else addBudget(null, amountCents, editing.period);
      } else {
        const existing = budgets.find((b) => b.categoryId === editing.categoryId);
        if (existing) updateBudget(existing.id, amountCents, editing.period);
        else addBudget(editing.categoryId, amountCents, editing.period);
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
      <ScreenHeader title="Budgets" subtitle="Set a daily, weekly, or monthly limit for your overall spending or per category" onBack={back} />

      {budgets.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="No budgets yet"
          message="Set a limit and Flow will tell you when you're getting close."
          action={
            <Button
              onClick={() => {
                setEditing({ categoryId: null, current: 0, period: "monthly" });
                setAmountCents(null);
              }}
            >
              <Plus size={18} strokeWidth={2} /> Add budget
            </Button>
          }
        />
      )}

      {budgets.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Overall</h2>
            {!overall && (
              <button
                className="section-action"
                onClick={() => {
                  setEditing({ categoryId: null, current: 0, period: "monthly" });
                  setAmountCents(null);
                }}
              >
                <Plus size={15} strokeWidth={2.2} /> Add overall budget
              </button>
            )}
          </div>
          {overall ? (
            <Card className="budget-card">
              <BudgetStatusView
                budgetId={overall.id}
                currency={currency}
                onEdit={() => {
                  setEditing({ categoryId: null, current: overall.amountCents, period: overall.period ?? "monthly" });
                  setAmountCents(overall.amountCents);
                }}
                onDelete={() => void removeBudget(overall)}
              />
            </Card>
          ) : (
            <Card className="card-soft">
              <p className="card-soft-text">Set a limit for your overall spending. Use the “Add” button above.</p>
            </Card>
          )}
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Category budgets</h2>
          {availableCategories.length > 0 && (
            <button
              className="section-action"
              onClick={() => {
                setEditing({ categoryId: availableCategories[0].id, current: 0, period: "monthly" });
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
                    category={cat}
                    currency={currency}
                    onEdit={() => {
                      setEditing({ categoryId: b.categoryId, current: b.amountCents, period: b.period ?? "monthly" });
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
        <Sheet title={editing.categoryId === null ? "Overall budget" : "Category budget"} onClose={() => setEditing(null)} ariaLabel="Edit budget">
          <div className="sheet-form">
            <Field label="Period">
              <Segmented
                options={PERIOD_OPTIONS}
                value={editing.period}
                onChange={(period) => setEditing({ ...editing, period })}
                ariaLabel="Budget period"
              />
            </Field>
            <Field label={`Amount per ${PERIOD_UNIT[editing.period]}`}>
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
                  {(availableCategories.some((c) => c.id === editing.categoryId)
                    ? availableCategories
                    : availableCategories.concat(categories.find((c) => c.id === editing.categoryId) ?? [])
                  ).map((c) => (
                    <button
                      key={c.id}
                      className={`chip ${editing.categoryId === c.id ? "chip-active" : ""}`}
                      onClick={() => setEditing({ ...editing, categoryId: c.id })}
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
  category,
  currency,
  onEdit,
  onDelete,
}: {
  budgetId: string;
  category?: Category;
  currency: CurrencyCode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { budgets, transactions, settings } = useApp();
  const budget = budgets.find((b) => b.id === budgetId);
  if (!budget || !settings) return null;
  const status = budgetStatus(budget, transactions, undefined, settings.startWeekOn);
  const period = budget.period ?? "monthly";
  const tone = status.level === "over" ? "over" : status.level === "reached" ? "over" : status.level === "high" || status.level === "close" ? "warn" : "ok";
  const label = category ? category.name : PERIOD_LABEL[period];
  const heading = category ? category.name : `${PERIOD_LABEL[period]} budget`;
  const phrase = label.toLowerCase();
  const Icon = iconByName(category?.icon);
  return (
    <div>
      <div className="budget-item-head">
        <div className="budget-item-name">
          {category && <IconBadge icon={Icon} size="sm" />}
          <span className="row-title">{heading}</span>
          {category && <span className="period-tag">{PERIOD_LABEL[period]}</span>}
        </div>
        <div className="budget-item-actions">
          <button className="icon-btn icon-btn-sm" aria-label={`Edit ${label} budget`} onClick={onEdit}>
            <Pencil size={15} strokeWidth={2} />
          </button>
          <button className="icon-btn icon-btn-sm" aria-label={`Delete ${label} budget`} onClick={onDelete}>
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
          ? `You're ${formatMoney(-status.remainingCents, currency)} over your ${phrase} budget.`
          : status.level === "reached"
            ? `You've reached your ${phrase} budget.`
            : status.level === "high"
              ? `You've used 90% of your ${phrase} budget.`
              : status.level === "close"
                ? `You're close to your ${phrase} budget.`
                : `${formatMoney(status.remainingCents, currency)} remaining`}
      </p>
    </div>
  );
}
