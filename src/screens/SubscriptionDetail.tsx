import { useRef, useState } from "react";
import { CalendarCheck, CheckCircle2, Pause, Pencil, Play, RefreshCcw, Trash2, XCircle } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { frequencyLabel, monthlyEquivalent, yearlyEquivalent } from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { longDate, relativeDay, shortDate } from "../lib/dates";
import { iconByName } from "../lib/icons";
import { Card, IconBadge, ScreenHeader } from "../components/ui";
import { AddSubscriptionSheet } from "../components/AddSubscriptionSheet";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bank: "Bank",
  other: "Other",
};

const REMINDER_LABELS: Record<number, string> = {
  0: "Same day",
  1: "1 day before",
  3: "3 days before",
  7: "7 days before",
};

export function SubscriptionDetail({ subscriptionId }: { subscriptionId: string }) {
  const {
    subscriptions,
    categories,
    settings,
    updateSubscription,
    deleteSubscription,
    recordSubscriptionPayment,
    confirm,
    toast,
    haptic,
  } = useApp();
  const { back } = useNavigation();
  const [editing, setEditing] = useState(false);

  const subscription = subscriptions.find((s) => s.id === subscriptionId);
  if (!settings) return null;
  if (!subscription) {
    return (
      <div className="screen">
        <ScreenHeader title="Subscription" onBack={back} />
        <p className="screen-empty-text">This subscription no longer exists.</p>
      </div>
    );
  }

  const category = categories.find((c) => c.id === subscription.categoryId);
  const Icon = iconByName(category?.icon);
  const { currency } = settings;
  const status = subscription.status;
  const nextLabel = relativeDay(subscription.nextPaymentDate) ?? shortDate(subscription.nextPaymentDate, { includeYear: true });

  const doDelete = async () => {
    const ok = await confirm({
      title: "Delete subscription?",
      message:
        status === "active"
          ? `${subscription.name} is active. Deleting removes it from Flow. This cannot be undone.`
          : "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteSubscription(subscription.id);
    haptic("warning");
    toast("Deleted");
    back();
  };

  const doCancel = async () => {
    const ok = await confirm({
      title: "Cancel subscription record?",
      message: `${subscription.name} will be marked as cancelled and kept in your history. Flow only tracks subscriptions — it never cancels the real one.`,
      confirmLabel: "Cancel record",
    });
    if (!ok) return;
    updateSubscription(subscription.id, { status: "cancelled" });
    toast("Record cancelled");
  };

  const togglePause = () => {
    const next = status === "paused" ? "active" : "paused";
    updateSubscription(subscription.id, { status: next });
    toast(next === "paused" ? "Subscription paused" : "Subscription resumed");
  };

  // Guards against a double-tap recording two payments and advancing two
  // billing cycles instead of one. A fixed cooldown, not a state-driven
  // reset -- React's own render cycle settles faster than a real double-tap.
  const recordingPayment = useRef(false);

  const recordPayment = () => {
    if (recordingPayment.current) return;
    recordingPayment.current = true;
    recordSubscriptionPayment(subscription.id);
    haptic("success");
    toast("Payment recorded");
    setTimeout(() => {
      recordingPayment.current = false;
    }, 500);
  };

  return (
    <div className="screen">
      <ScreenHeader
        title="Subscription"
        onBack={back}
        right={
          <button className="icon-btn" aria-label="Edit subscription" onClick={() => setEditing(true)}>
            <Pencil size={18} strokeWidth={2} />
          </button>
        }
      />

      <div className="detail-hero">
        <IconBadge icon={Icon} size="lg" />
        <span className={`status-chip status-${status}`}>{status === "active" ? "Active" : status === "paused" ? "Paused" : "Cancelled"}</span>
        <span className="detail-merchant">{subscription.name}</span>
        <span className="detail-amount">
          {formatMoney(subscription.amountCents, currency)}
          <span className="detail-amount-per"> / {frequencyLabel(subscription.frequency)}</span>
        </span>
        <p className="sub-hero-next">
          Next payment {nextLabel}
          {status !== "active" && " · reminders off"}
        </p>
      </div>

      {status === "active" && (
        <button className="btn btn-primary btn-block" onClick={recordPayment}>
          <CalendarCheck size={17} strokeWidth={2} /> Record payment
        </button>
      )}

      <div className="detail-card">
        <div className="equiv-row">
          <div className="equiv-cell">
            <span className="stat-label">Monthly equivalent</span>
            <span className="equiv-value">{formatMoney(monthlyEquivalent(subscription), currency)}</span>
          </div>
          <div className="equiv-cell">
            <span className="stat-label">Yearly equivalent</span>
            <span className="equiv-value">{formatMoney(yearlyEquivalent(subscription), currency)}</span>
          </div>
        </div>
        <DetailRow label="Category" value={category?.name ?? "—"} />
        <DetailRow label="Next payment" value={longDate(subscription.nextPaymentDate)} />
        <DetailRow label="Payment method" value={subscription.paymentMethod ? METHOD_LABELS[subscription.paymentMethod] : "—"} />
        <DetailRow label="Reminder" value={subscription.reminderDays !== null ? `${REMINDER_LABELS[subscription.reminderDays]} · 9:00 AM` : "Off"} />
        <DetailRow label="Usage" value={subscription.usage === "regular" ? "Used regularly" : subscription.usage === "rarely" ? "Rarely used" : "Unused"} />
        {subscription.notes && <DetailRow label="Notes" value={subscription.notes} />}
      </div>

      <section className="section">
        <h2 className="section-title">Payment history</h2>
        {subscription.payments.length === 0 ? (
          <Card className="card-soft">
            <p className="card-soft-text">No payments recorded yet. Tap “Record payment” when one happens.</p>
          </Card>
        ) : (
          <Card className="list-card">
            {[...subscription.payments].reverse().map((p, i) => (
              <div className="row" key={i}>
                <IconBadge icon={CheckCircle2} size="sm" muted />
                <div className="row-main">
                  <span className="row-title">{shortDate(p.date, { includeYear: true })}</span>
                  <span className="row-sub">Payment recorded</span>
                </div>
                <span className="row-amount">{formatMoney(p.amountCents, currency)}</span>
              </div>
            ))}
          </Card>
        )}
      </section>

      <div className="detail-actions detail-actions-column">
        {status !== "cancelled" && (
          <button className="btn btn-secondary" onClick={togglePause}>
            {status === "paused" ? (
              <>
                <Play size={16} strokeWidth={2} /> Resume
              </>
            ) : (
              <>
                <Pause size={16} strokeWidth={2} /> Pause
              </>
            )}
          </button>
        )}
        {status !== "cancelled" && (
          <button className="btn btn-secondary" onClick={() => void doCancel()}>
            <XCircle size={16} strokeWidth={2} /> Cancel subscription record
          </button>
        )}
        {status === "cancelled" && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              updateSubscription(subscription.id, { status: "active" });
              toast("Subscription reactivated");
            }}
          >
            <RefreshCcw size={16} strokeWidth={2} /> Reactivate
          </button>
        )}
        <button className="btn btn-danger-outline" onClick={() => void doDelete()}>
          <Trash2 size={16} strokeWidth={2} /> Delete
        </button>
      </div>

      <p className="sub-disclaimer">Flow only tracks this subscription. It never cancels your real-world subscription.</p>

      {editing && <AddSubscriptionSheet initial={subscription} onClose={() => setEditing(false)} />}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <span className="detail-row-value">{value}</span>
    </div>
  );
}
