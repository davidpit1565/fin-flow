import { useState } from "react";
import { ArrowRight, Bell, CalendarClock, PiggyBank, Sparkles } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { CURRENCIES, localeCurrency } from "../lib/currency";
import { Button, ChipGroup, Field, NumericInput, Toggle } from "../components/ui";
import type { CurrencyCode } from "../types";

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

const STEPS = [
  {
    icon: Sparkles,
    title: "Know where your money goes.",
    body: "Flow brings your expenses and subscriptions together in one clear view — so you always know what you're spending and where it's going.",
  },
  {
    icon: CalendarClock,
    title: "Never forget a recurring payment.",
    body: "Track every subscription and recurring charge. Flow shows what's coming up next, so nothing slips past you.",
  },
  {
    icon: PiggyBank,
    title: "Find opportunities to save.",
    body: "Clear spending insights and monthly comparisons help you spot the subscriptions and habits that cost you the most.",
  },
] as const;

export function Onboarding() {
  const { completeOnboarding, addBudget, toast } = useApp();
  const { navigate } = useNavigation();
  const [step, setStep] = useState(0);

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
          <div className="onboarding-dots" role="tablist" aria-label="Onboarding progress">
            {STEPS.map((_, i) => (
              <span key={i} className={`dot ${i === step ? "active" : ""}`} aria-hidden="true" />
            ))}
            <span className="dot dim" aria-hidden="true" />
          </div>
          <div className="onboarding-actions">
            <button className="btn btn-ghost" onClick={() => setStep(STEPS.length)}>
              Skip
            </button>
            <Button size="lg" onClick={() => setStep(step + 1)}>
              Continue <ArrowRight size={18} strokeWidth={2} />
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
        setError("Enter a valid monthly budget.");
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
      toast(notifications ? "Notifications on" : "You're all set");
    };

    return (
      <div className="onboarding">
        <div className="onboarding-mark">{FLOW_MARK}</div>
        <div className="onboarding-body onboarding-setup">
          <h1 className="onboarding-title">Set up Flow</h1>
          <p className="onboarding-copy">A few quick choices — you can change everything later in Settings.</p>

          <div className="setup-fields">
            <Field label="Currency">
              <ChipGroup
                options={CURRENCIES.map((c) => ({ value: c.code, label: c.code }))}
                value={currency}
                onChange={setCurrency}
                ariaLabel="Currency"
              />
            </Field>
            <Field label="Monthly spending goal" hint="Optional — a simple budget for each month.">
              <NumericInput cents={budgetCents} onCentsChange={setBudgetCents} placeholder="0.00" aria-label="Monthly spending goal" />
            </Field>
            <Field label="Starting balance" hint="Optional — what you have right now.">
              <NumericInput cents={balanceCents} onCentsChange={setBalanceCents} placeholder="0.00" aria-label="Starting balance" />
            </Field>
            <div className="recurring-head">
              <div>
                <span className="field-label">Notifications</span>
                <p className="field-hint">Payment reminders and budget alerts.</p>
              </div>
              <Toggle checked={notifications} onChange={setNotifications} label="Enable notifications" />
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
              <Bell size={18} strokeWidth={2} /> Get started
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
