import { useRef, useState } from "react";
import { Minus, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
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
      setError("Enter a goal name.");
      return;
    }
    if (editing.targetCents === null || editing.targetCents <= 0) {
      setError("Enter a valid target amount.");
      return;
    }
    const targetDate = editing.targetDate.trim() === "" ? null : editing.targetDate;
    if (editing.id) {
      updateGoal(editing.id, { name, icon: editing.icon, targetCents: editing.targetCents, targetDate });
      toast("Goal updated");
    } else {
      addGoal(name, editing.icon, editing.targetCents, targetDate);
      toast("Goal added");
    }
    setEditing(null);
    setError(null);
  };

  const removeGoal = async (g: Goal) => {
    const ok = await confirm({
      title: `Delete ${g.name}?`,
      message: "This only removes the goal — no other data is affected.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteGoal(g.id);
    toast("Deleted");
  };

  const saveContribution = () => {
    if (!contributing || contributing.amountCents === null || contributing.amountCents <= 0) {
      toast("Enter a valid amount.");
      return;
    }
    const delta = contributing.mode === "add" ? contributing.amountCents : -contributing.amountCents;
    contributeToGoal(contributing.id, delta);
    toast(contributing.mode === "add" ? "Funds added" : "Withdrawal recorded");
    setContributing(null);
  };

  return (
    <div className="screen">
      <ScreenHeader title="Savings Goals" subtitle="Set a target and track how close you are to reaching it" onBack={back} />

      {goals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No goals yet"
          message="Create a savings goal and Flow will track your progress toward it."
          action={
            <Button onClick={openAdd}>
              <Plus size={18} strokeWidth={2} /> Add goal
            </Button>
          }
        />
      ) : (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Your goals</h2>
            <button className="section-action" onClick={openAdd}>
              <Plus size={15} strokeWidth={2.2} /> Add goal
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
                      <button className="icon-btn icon-btn-sm" aria-label={`Edit ${g.name}`} onClick={() => openEdit(g)}>
                        <Pencil size={15} strokeWidth={2} />
                      </button>
                      <button className="icon-btn icon-btn-sm" aria-label={`Delete ${g.name}`} onClick={() => void removeGoal(g)}>
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div className="budget-row">
                    <span className="row-title">
                      {formatMoney(g.currentCents, currency)}{" "}
                      <span className="row-sub">/ {formatMoney(g.targetCents, currency)} saved</span>
                    </span>
                    <span className="row-sub">{Math.round(percent)}%</span>
                  </div>
                  <ProgressBar percent={percent} tone="ok" />
                  {projected && <p className="budget-msg ok">On track to reach this by {shortDate(projected)}</p>}
                  <div className="sub-toolbar">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setContributing({ id: g.id, mode: "add", amountCents: null })}
                    >
                      Add funds
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {editing && (
        <Sheet title={editing.id ? "Edit goal" : "Add goal"} onClose={() => setEditing(null)} ariaLabel="Edit goal">
          <div className="sheet-form">
            <Field label="Name" htmlFor="goal-name">
              <TextInput
                id="goal-name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                autoFocus
                placeholder="e.g. New laptop"
              />
            </Field>
            <Field label="Icon">
              <div className="icon-grid" role="radiogroup" aria-label="Goal icon">
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
            <Field label="Target amount">
              <NumericInput
                cents={editing.targetCents}
                onCentsChange={(c) => {
                  setEditing({ ...editing, targetCents: c });
                  setError(null);
                }}
                placeholder="0.00"
                aria-label="Target amount"
              />
            </Field>
            <Field label="Target date (optional)" htmlFor="goal-date">
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
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" onClick={save}>
              {editing.id ? "Save changes" : "Add goal"}
            </Button>
          </div>
        </Sheet>
      )}

      {contributing && (
        <Sheet
          title={goals.find((g) => g.id === contributing.id)?.name ?? "Update goal"}
          onClose={() => setContributing(null)}
          ariaLabel="Add or withdraw funds"
        >
          <div className="sheet-form">
            <Field label="Type">
              <Segmented
                options={[
                  { value: "add", label: "Add" },
                  { value: "withdraw", label: "Withdraw" },
                ]}
                value={contributing.mode}
                onChange={(mode) => setContributing({ ...contributing, mode })}
                ariaLabel="Add or withdraw"
              />
            </Field>
            <Field label="Amount">
              <NumericInput
                cents={contributing.amountCents}
                onCentsChange={(c) => setContributing({ ...contributing, amountCents: c })}
                autoFocus
                placeholder="0.00"
                aria-label="Contribution amount"
              />
            </Field>
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" onClick={saveContribution}>
              {contributing.mode === "add" ? (
                <>
                  <Plus size={18} strokeWidth={2} /> Add funds
                </>
              ) : (
                <>
                  <Minus size={18} strokeWidth={2} /> Withdraw
                </>
              )}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
