import { useState } from "react";
import { ArrowRight, Bell, CalendarClock, PiggyBank, Sparkles } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { useT } from "../lib/i18n";
import { CURRENCIES, localeCurrency } from "../lib/currency";
import { Button, ChipGroup, Field, NumericInput, Toggle } from "../components/ui";
import type { CurrencyCode } from "../types";
import type { Dictionary } from "../lib/i18n";

const FLOW_MARK = (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="#14161a" />
    <path
      d="M18 42 C 34 44, 42 34, 30 26 C 22 21, 26 14, 42 18"
      stroke="#f2f3f5"
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="42.5" cy="18.5" r="6" fill="#34c98a" />
  </svg>
);

function buildSteps(t: Dictionary) {
  return [
    { icon: Sparkles, title: t.onboarding.step1Title, body: t.onboarding.step1Body },
    { icon: CalendarClock, title: t.onboarding.step2Title, body: t.onboarding.step2Body },
    { icon: PiggyBank, title: t.onboarding.step3Title, body: t.onboarding.step3Body },
  ] as const;
}

export function Onboarding() {
  const { completeOnboarding, addBudget, toast } = useApp();
  const { navigate } = useNavigation();
  const t = useT();
  const [step, setStep] = useState(0);
  const STEPS = buildSteps(t);

  if (step < STEPS.length) {
    const s = STEPS[step];
    const Icon = s.icon;
    return (
      <div className="onboarding">
        <div className="onboarding-mark">{FLOW_MARK}</div>
        <div className="onboarding-body">
          <div className="onboarding-icon">
            <Icon size={30} strokeWidth={1.6} />
          </div>
          <h1 className="onboarding-title">{s.title}</h1>
          <p className="onboarding-copy">{s.body}</p>
        </div>
        <div className="onboarding-footer">
          <div className="onboarding-dots" role="tablist" aria-label={t.onboarding.progressAriaLabel}>
            {STEPS.map((_, i) => (
              <span key={i} className={`dot ${i === step ? "active" : ""}`} aria-hidden="true" />
            ))}
            <span className="dot dim" aria-hidden="true" />
          </div>
          <div className="onboarding-actions">
            <button className="btn btn-ghost" onClick={() => setStep(STEPS.length)}>
              {t.onboarding.skip}
            </button>
            <Button size="lg" onClick={() => setStep(step + 1)}>
              {t.onboarding.continueButton} <ArrowRight size={18} strokeWidth={2} className="icon-directional" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <SetupScreen />;

  function SetupScreen() {
    const [currency, setCurrency] = useState<CurrencyCode>(localeCurrency());
    const [budgetCents, setBudgetCents] = useState<number | null>(null);
    const [balanceCents, setBalanceCents] = useState<number | null>(null);
    const [notifications, setNotifications] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const finish = () => {
      if (budgetCents !== null && budgetCents <= 0) {
        setError(t.onboarding.invalidBudgetError);
        return;
      }
      completeOnboarding({
        currency,
        startBalanceCents: balanceCents ?? 0,
        notifications: { enabled: notifications, subscriptionReminders: true, budgetAlerts: true, monthlySummary: true },
      });
      if (budgetCents !== null) {
        addBudget(null, budgetCents);
      }
      // Always land on Home after onboarding (also after a delete-all reset).
      navigate("home", { tab: "home", name: "root" });
      toast(notifications ? t.onboarding.notificationsOnToast : t.onboarding.allSetToast);
    };

    return (
      <div className="onboarding">
        <div className="onboarding-mark">{FLOW_MARK}</div>
        <div className="onboarding-body onboarding-setup">
          <h1 className="onboarding-title">{t.onboarding.setupTitle}</h1>
          <p className="onboarding-copy">{t.onboarding.setupSubtitle}</p>

          <div className="setup-fields">
            <Field label={t.onboarding.currencyLabel}>
              <ChipGroup
                options={CURRENCIES.map((c) => ({ value: c.code, label: c.code }))}
                value={currency}
                onChange={setCurrency}
                ariaLabel={t.onboarding.currencyLabel}
              />
            </Field>
            <Field label={t.onboarding.budgetGoalLabel} hint={t.onboarding.budgetGoalHint}>
              <NumericInput
                cents={budgetCents}
                onCentsChange={setBudgetCents}
                placeholder={t.onboarding.amountPlaceholder}
                aria-label={t.onboarding.budgetGoalLabel}
              />
            </Field>
            <Field label={t.onboarding.startingBalanceLabel} hint={t.onboarding.startingBalanceHint}>
              <NumericInput
                cents={balanceCents}
                onCentsChange={setBalanceCents}
                placeholder={t.onboarding.amountPlaceholder}
                aria-label={t.onboarding.startingBalanceLabel}
              />
            </Field>
            <div className="recurring-head">
              <div>
                <span className="field-label">{t.onboarding.notificationsLabel}</span>
                <p className="field-hint">{t.onboarding.notificationsHint}</p>
              </div>
              <Toggle checked={notifications} onChange={setNotifications} label={t.onboarding.enableNotifications} />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="onboarding-footer">
          <div className="onboarding-actions">
            <Button size="lg" className="btn-block" onClick={finish}>
              <Bell size={18} strokeWidth={2} /> {t.onboarding.getStarted}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
