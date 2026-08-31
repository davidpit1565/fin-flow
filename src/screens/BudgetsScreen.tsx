import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { budgetStatus } from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { useT } from "../lib/i18n";
import { Button, Card, EmptyState, Field, IconBadge, NumericInput, ProgressBar, ScreenHeader, Segmented, Sheet } from "../components/ui";
import { iconByName } from "../lib/icons";
import type { BudgetPeriod, Category, CurrencyCode } from "../types";

export function BudgetsScreen() {
  const { budgets, categories, settings, addBudget, updateBudget, deleteBudget, confirm, toast } = useApp();
  const { back } = useNavigation();
  const t = useT();
  const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = useMemo(
    () =>
      (["daily", "weekly", "monthly"] as BudgetPeriod[]).map((value) => ({
        value,
        label: t.budgets.periodLabel(value),
      })),
    [t]
  );
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
      setError(t.budgets.errorAmount);
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
      toast(t.budgets.budgetSavedToast);
    }
    setEditing(null);
    setAmountCents(null);
    setError(null);
  };

  const removeBudget = async (b: { id: string; categoryId: string | null }) => {
    const ok = await confirm({
      title: t.budgets.deleteBudgetTitle,
      message: t.budgets.deleteBudgetMessage,
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteBudget(b.id);
    toast(t.common.deleted);
  };

  return (
    <div className="screen">
      <ScreenHeader title={t.budgets.screenTitle} subtitle={t.budgets.screenSubtitle} onBack={back} />

      {budgets.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={t.budgets.emptyTitle}
          message={t.budgets.emptyMessage}
          action={
            <Button
              onClick={() => {
                setEditing({ categoryId: null, current: 0, period: "monthly" });
                setAmountCents(null);
              }}
            >
              <Plus size={18} strokeWidth={2} /> {t.budgets.addBudget}
            </Button>
          }
        />
      )}

      {budgets.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">{t.budgets.overallSectionTitle}</h2>
            {!overall && (
              <button
                className="section-action"
                onClick={() => {
                  setEditing({ categoryId: null, current: 0, period: "monthly" });
                  setAmountCents(null);
                }}
              >
                <Plus size={15} strokeWidth={2.2} /> {t.budgets.addOverallBudget}
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
              <p className="card-soft-text">{t.budgets.overallEmptyMessage}</p>
            </Card>
          )}
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{t.budgets.categorySectionTitle}</h2>
          {availableCategories.length > 0 && (
            <button
              className="section-action"
              onClick={() => {
                setEditing({ categoryId: availableCategories[0].id, current: 0, period: "monthly" });
                setAmountCents(null);
              }}
            >
              <Plus size={15} strokeWidth={2.2} /> {t.common.add}
            </button>
          )}
        </div>
        {categoryBudgets.length === 0 ? (
          <Card className="card-soft">
            <p className="card-soft-text">{t.budgets.categoryEmptyMessage}</p>
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
        <Sheet
          title={editing.categoryId === null ? t.budgets.overallBudgetSheetTitle : t.budgets.categoryBudgetSheetTitle}
          onClose={() => setEditing(null)}
          ariaLabel={t.budgets.editSheetAria}
        >
          <div className="sheet-form">
            <Field label={t.budgets.periodFieldLabel}>
              <Segmented
                options={PERIOD_OPTIONS}
                value={editing.period}
                onChange={(period) => setEditing({ ...editing, period })}
                ariaLabel={t.budgets.periodAria}
              />
            </Field>
            <Field label={t.budgets.amountPerPeriod(editing.period)}>
              <NumericInput
                cents={amountCents}
                onCentsChange={(c) => {
                  setAmountCents(c);
                  setError(null);
                }}
                autoFocus
                placeholder={t.budgets.amountPlaceholder}
                aria-label={t.budgets.budgetAmountAria}
              />
            </Field>
            {editing.categoryId !== null && (
              <Field label={t.budgets.categoryFieldLabel}>
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
              {t.budgets.saveBudgetButton}
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
  const t = useT();
  const budget = budgets.find((b) => b.id === budgetId);
  if (!budget || !settings) return null;
  const status = budgetStatus(budget, transactions, undefined, settings.startWeekOn);
  const period = budget.period ?? "monthly";
  const tone = status.level === "over" ? "over" : status.level === "reached" ? "over" : status.level === "high" || status.level === "close" ? "warn" : "ok";
  const label = category ? category.name : t.budgets.periodLabel(period);
  const heading = category ? category.name : t.budgets.periodBudgetLabel(period);
  const amount = status.level === "over" ? formatMoney(-status.remainingCents, currency) : formatMoney(status.remainingCents, currency);
  const Icon = iconByName(category?.icon);
  return (
    <div>
      <div className="budget-item-head">
        <div className="budget-item-name">
          {category && <IconBadge icon={Icon} size="sm" />}
          <span className="row-title">{heading}</span>
          {category && <span className="period-tag">{t.budgets.periodLabel(period)}</span>}
        </div>
        <div className="budget-item-actions">
          <button className="icon-btn icon-btn-sm" aria-label={t.budgets.editBudgetAria(label)} onClick={onEdit}>
            <Pencil size={15} strokeWidth={2} />
          </button>
          <button className="icon-btn icon-btn-sm" aria-label={t.budgets.deleteBudgetAria(label)} onClick={onDelete}>
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
      <p className={`budget-msg ${tone}`}>{t.budgets.statusMessage(status.level, amount, period, category?.name)}</p>
    </div>
  );
}
