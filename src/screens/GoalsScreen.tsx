import { useRef, useState } from "react";
import { Minus, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { useT } from "../lib/i18n";
import { goalProgressPercent, projectedGoalCompletion } from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { shortDate } from "../lib/dates";
import { ICON_SET, iconByName } from "../lib/icons";
import {
  Button,
  Card,
  DateInput,
  EmptyState,
  Field,
  IconBadge,
  NumericInput,
  ProgressBar,
  ScreenHeader,
  Segmented,
  Sheet,
  TextInput,
  rovingNextIndex,
} from "../components/ui";
import type { Goal } from "../types";

interface EditingGoal {
  id: string | null;
  name: string;
  icon: string;
  targetCents: number | null;
  targetDate: string;
}

interface Contributing {
  id: string;
  mode: "add" | "withdraw";
  amountCents: number | null;
}

export function GoalsScreen() {
  const { goals, settings, addGoal, updateGoal, deleteGoal, contributeToGoal, confirm, toast } = useApp();
  const { back } = useNavigation();
  const t = useT();
  const [editing, setEditing] = useState<EditingGoal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contributing, setContributing] = useState<Contributing | null>(null);
  const iconRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!settings) return null;
  const { currency } = settings;

  const openAdd = () => {
    setEditing({ id: null, name: "", icon: "PiggyBank", targetCents: null, targetDate: "" });
    setError(null);
  };

  const openEdit = (g: Goal) => {
    setEditing({ id: g.id, name: g.name, icon: g.icon, targetCents: g.targetCents, targetDate: g.targetDate ?? "" });
    setError(null);
  };

  const save = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      setError(t.goals.enterGoalName);
      return;
    }
    if (editing.targetCents === null || editing.targetCents <= 0) {
      setError(t.goals.enterValidTargetAmount);
      return;
    }
    const targetDate = editing.targetDate.trim() === "" ? null : editing.targetDate;
    if (editing.id) {
      updateGoal(editing.id, { name, icon: editing.icon, targetCents: editing.targetCents, targetDate });
      toast(t.goals.goalUpdated);
    } else {
      addGoal(name, editing.icon, editing.targetCents, targetDate);
      toast(t.goals.goalAdded);
    }
    setEditing(null);
    setError(null);
  };

  const removeGoal = async (g: Goal) => {
    const ok = await confirm({
      title: t.goals.deleteGoalConfirmTitle(g.name),
      message: t.goals.deleteGoalConfirmMessage,
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteGoal(g.id);
    toast(t.common.deleted);
  };

  const saveContribution = () => {
    if (!contributing || contributing.amountCents === null || contributing.amountCents <= 0) {
      toast(t.goals.enterValidAmount);
      return;
    }
    const delta = contributing.mode === "add" ? contributing.amountCents : -contributing.amountCents;
    contributeToGoal(contributing.id, delta);
    toast(contributing.mode === "add" ? t.goals.fundsAdded : t.goals.withdrawalRecorded);
    setContributing(null);
  };

  return (
    <div className="screen">
      <ScreenHeader title={t.goals.title} subtitle={t.goals.subtitle} onBack={back} />

      {goals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={t.goals.emptyTitle}
          message={t.goals.emptyMessage}
          action={
            <Button onClick={openAdd}>
              <Plus size={18} strokeWidth={2} /> {t.goals.addGoal}
            </Button>
          }
        />
      ) : (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">{t.goals.sectionTitle}</h2>
            <button className="section-action" onClick={openAdd}>
              <Plus size={15} strokeWidth={2.2} /> {t.goals.addGoal}
            </button>
          </div>
          <Card className="budget-list">
            {goals.map((g) => {
              const Icon = iconByName(g.icon);
              const percent = goalProgressPercent(g);
              const projected = projectedGoalCompletion(g);
              return (
                <div key={g.id} className="budget-item">
                  <div className="budget-item-head">
                    <div className="budget-item-name">
                      <IconBadge icon={Icon} size="sm" />
                      <span className="row-title">{g.name}</span>
                    </div>
                    <div className="budget-item-actions">
                      <button className="icon-btn icon-btn-sm" aria-label={t.goals.editAria(g.name)} onClick={() => openEdit(g)}>
                        <Pencil size={15} strokeWidth={2} />
                      </button>
                      <button className="icon-btn icon-btn-sm" aria-label={t.goals.deleteAria(g.name)} onClick={() => void removeGoal(g)}>
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div className="budget-row">
                    <span className="row-title">
                      {formatMoney(g.currentCents, currency)}{" "}
                      <span className="row-sub">{t.goals.savedOfTarget(formatMoney(g.targetCents, currency))}</span>
                    </span>
                    <span className="row-sub">{Math.round(percent)}%</span>
                  </div>
                  <ProgressBar percent={percent} tone="ok" />
                  {projected && <p className="budget-msg ok">{t.goals.onTrackBy(shortDate(projected, { format: settings.dateFormat }))}</p>}
                  <div className="sub-toolbar">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setContributing({ id: g.id, mode: "add", amountCents: null })}
                    >
                      {t.goals.addFunds}
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {editing && (
        <Sheet
          title={editing.id ? t.goals.editGoalSheetTitle : t.goals.addGoal}
          onClose={() => setEditing(null)}
          ariaLabel={t.goals.editGoalSheetAria}
          footer={
            <Button size="lg" className="btn-block" onClick={save}>
              {editing.id ? t.goals.saveChanges : t.goals.addGoal}
            </Button>
          }
        >
          <div className="sheet-form">
            <Field label={t.goals.nameFieldLabel} htmlFor="goal-name">
              <TextInput
                id="goal-name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                autoFocus
                placeholder={t.goals.namePlaceholder}
              />
            </Field>
            <Field label={t.goals.iconFieldLabel}>
              <div className="icon-grid" role="radiogroup" aria-label={t.goals.goalIconAria}>
                {(() => {
                  const selectedIconIndex = Math.max(
                    0,
                    ICON_SET.findIndex((opt) => opt.name === editing.icon)
                  );
                  return ICON_SET.map(({ name, icon: Icon }, i) => (
                    <button
                      key={name}
                      ref={(el) => {
                        iconRefs.current[i] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={editing.icon === name}
                      tabIndex={i === selectedIconIndex ? 0 : -1}
                      className={`icon-option ${editing.icon === name ? "icon-option-active" : ""}`}
                      onClick={() => setEditing({ ...editing, icon: name })}
                      onKeyDown={(e) => {
                        const next = rovingNextIndex(e.key, i, ICON_SET.length);
                        if (next === null) return;
                        e.preventDefault();
                        setEditing({ ...editing, icon: ICON_SET[next].name });
                        iconRefs.current[next]?.focus();
                      }}
                      aria-label={name}
                    >
                      <Icon size={19} strokeWidth={1.8} />
                    </button>
                  ));
                })()}
              </div>
            </Field>
            <Field label={t.goals.targetAmountFieldLabel}>
              <NumericInput
                cents={editing.targetCents}
                onCentsChange={(c) => {
                  setEditing({ ...editing, targetCents: c });
                  setError(null);
                }}
                placeholder="0.00"
                aria-label={t.goals.targetAmountFieldLabel}
              />
            </Field>
            <Field label={t.goals.targetDateFieldLabel} htmlFor="goal-date">
              <DateInput
                id="goal-date"
                value={editing.targetDate}
                onChange={(v) => setEditing({ ...editing, targetDate: v })}
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

      {contributing && (
        <Sheet
          title={goals.find((g) => g.id === contributing.id)?.name ?? t.goals.updateGoalFallbackTitle}
          onClose={() => setContributing(null)}
          ariaLabel={t.goals.contributionSheetAria}
          footer={
            <Button size="lg" className="btn-block" onClick={saveContribution}>
              {contributing.mode === "add" ? (
                <>
                  <Plus size={18} strokeWidth={2} /> {t.goals.addFunds}
                </>
              ) : (
                <>
                  <Minus size={18} strokeWidth={2} /> {t.goals.withdraw}
                </>
              )}
            </Button>
          }
        >
          <div className="sheet-form">
            <Field label={t.goals.typeFieldLabel}>
              <Segmented
                options={[
                  { value: "add", label: t.goals.segmentedAddLabel },
                  { value: "withdraw", label: t.goals.withdraw },
                ]}
                value={contributing.mode}
                onChange={(mode) => setContributing({ ...contributing, mode })}
                ariaLabel={t.goals.addOrWithdrawAria}
              />
            </Field>
            <Field label={t.goals.amountFieldLabel}>
              <NumericInput
                cents={contributing.amountCents}
                onCentsChange={(c) => setContributing({ ...contributing, amountCents: c })}
                autoFocus
                placeholder="0.00"
                aria-label={t.goals.contributionAmountAria}
              />
            </Field>
          </div>
        </Sheet>
      )}
    </div>
  );
}
