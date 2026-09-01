import { useRef, useState } from "react";
import { CalendarCheck, CheckCircle2, Pause, Pencil, Play, RefreshCcw, Trash2, XCircle } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { monthlyEquivalent, yearlyEquivalent } from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { longDate, shortDate } from "../lib/dates";
import { iconByName } from "../lib/icons";
import { categoryDisplayName, relativeDayLabel, useT } from "../lib/i18n";
import { Card, IconBadge, ScreenHeader } from "../components/ui";
import { AddSubscriptionSheet } from "../components/AddSubscriptionSheet";

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
  const t = useT();
  const [editing, setEditing] = useState(false);

  const subscription = subscriptions.find((s) => s.id === subscriptionId);
  if (!settings) return null;
  if (!subscription) {
    return (
      <div className="screen">
        <ScreenHeader title={t.subscriptions.detailTitle} onBack={back} largeTitle={false} />
        <p className="screen-empty-text">{t.subscriptions.notFound}</p>
      </div>
    );
  }

  const category = categories.find((c) => c.id === subscription.categoryId);
  const Icon = iconByName(category?.icon);
  const { currency } = settings;
  const status = subscription.status;
  const nextLabel =
    relativeDayLabel(t, subscription.nextPaymentDate) ?? shortDate(subscription.nextPaymentDate, { includeYear: true, format: settings.dateFormat });

  const doDelete = async () => {
    const ok = await confirm({
      title: t.subscriptions.deleteConfirmTitle,
      message:
        status === "active"
          ? t.subscriptions.deleteConfirmMessageActive(subscription.name)
          : t.subscriptions.deleteConfirmMessageInactive,
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteSubscription(subscription.id);
    haptic("warning");
    toast(t.common.deleted);
    back();
  };

  const doCancel = async () => {
    const ok = await confirm({
      title: t.subscriptions.cancelRecordTitle,
      message: t.subscriptions.cancelRecordMessage(subscription.name),
      confirmLabel: t.subscriptions.cancelRecordConfirmLabel,
    });
    if (!ok) return;
    updateSubscription(subscription.id, { status: "cancelled" });
    toast(t.subscriptions.recordCancelledToast);
  };

  const togglePause = () => {
    const next = status === "paused" ? "active" : "paused";
    updateSubscription(subscription.id, { status: next });
    toast(next === "paused" ? t.subscriptions.pausedToast : t.subscriptions.resumedToast);
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
    toast(t.subscriptions.paymentRecorded);
    setTimeout(() => {
      recordingPayment.current = false;
    }, 500);
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t.subscriptions.detailTitle}
        onBack={back}
        largeTitle={false}
        right={
          <button className="icon-btn" aria-label={t.subscriptions.editSubscription} onClick={() => setEditing(true)}>
            <Pencil size={18} strokeWidth={2} />
          </button>
        }
      />

      <div className="detail-hero">
        <IconBadge icon={Icon} size="lg" />
        <span className={`status-chip status-${status}`}>{t.subscriptions.statusLabel(status)}</span>
        <span className="detail-merchant">{subscription.name}</span>
        <span className="detail-amount">
          {formatMoney(subscription.amountCents, currency)}
          <span className="detail-amount-per">{t.subscriptions.perFrequency(subscription.frequency)}</span>
        </span>
        <p className="sub-hero-next">
          {t.subscriptions.nextPaymentPrefix} {nextLabel}
          {status !== "active" && t.subscriptions.remindersOffSuffix}
        </p>
      </div>

      {status === "active" && (
        <button className="btn btn-primary btn-block" onClick={recordPayment}>
          <CalendarCheck size={17} strokeWidth={2} /> {t.subscriptions.recordPaymentButton}
        </button>
      )}

      <div className="detail-card">
        <div className="equiv-row">
          <div className="equiv-cell">
            <span className="stat-label">{t.subscriptions.monthlyEquivalentLabel}</span>
            <span className="equiv-value">{formatMoney(monthlyEquivalent(subscription), currency)}</span>
          </div>
          <div className="equiv-cell">
            <span className="stat-label">{t.subscriptions.yearlyEquivalentLabel}</span>
            <span className="equiv-value">{formatMoney(yearlyEquivalent(subscription), currency)}</span>
          </div>
        </div>
        <DetailRow label={t.subscriptions.categoryFieldLabel} value={category ? categoryDisplayName(t, category) : t.subscriptions.emptyDash} />
        <DetailRow label={t.subscriptions.nextPaymentLabel} value={longDate(subscription.nextPaymentDate)} />
        <DetailRow
          label={t.subscriptions.paymentMethodFieldLabel}
          value={subscription.paymentMethod ? t.subscriptions.paymentMethodLabel(subscription.paymentMethod) : t.subscriptions.emptyDash}
        />
        <DetailRow label={t.subscriptions.reminderFieldLabel} value={t.subscriptions.reminderDetailValue(subscription.reminderDays)} />
        <DetailRow label={t.subscriptions.usageFieldLabel} value={t.subscriptions.usageLabel(subscription.usage)} />
        {subscription.notes && <DetailRow label={t.subscriptions.notesFieldLabel} value={subscription.notes} />}
      </div>

      <section className="section">
        <h2 className="section-title">{t.subscriptions.paymentHistoryTitle}</h2>
        {subscription.payments.length === 0 ? (
          <Card className="card-soft">
            <p className="card-soft-text">{t.subscriptions.paymentHistoryEmpty}</p>
          </Card>
        ) : (
          <Card className="list-card">
            {[...subscription.payments].reverse().map((p, i) => (
              <div className="row" key={i}>
                <IconBadge icon={CheckCircle2} size="sm" muted />
                <div className="row-main">
                  <span className="row-title">{shortDate(p.date, { includeYear: true, format: settings.dateFormat })}</span>
                  <span className="row-sub">{t.subscriptions.paymentRecorded}</span>
                </div>
                <span className="row-amount">{formatMoney(p.amountCents, currency)}</span>
              </div>
            ))}
          </Card>
        )}
      </section>

      <div className="detail-actions detail-actions-column">
        {status !== "cancelled" && (
          <button className="btn btn-ghost" onClick={togglePause}>
            {status === "paused" ? (
              <>
                <Play size={16} strokeWidth={2} /> {t.subscriptions.resumeButton}
              </>
            ) : (
              <>
                <Pause size={16} strokeWidth={2} /> {t.subscriptions.pauseButton}
              </>
            )}
          </button>
        )}
        {/* Pause is an instant, one-tap-reversible toggle -- everything below
            this divider changes the subscription's recorded status and needs
            its own visual tier so it doesn't read as equally casual. */}
        <div className="detail-actions-danger">
          {status !== "cancelled" && (
            <button className="btn btn-secondary" onClick={() => void doCancel()}>
              <XCircle size={16} strokeWidth={2} /> {t.subscriptions.cancelRecordButton}
            </button>
          )}
          {status === "cancelled" && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                updateSubscription(subscription.id, { status: "active" });
                toast(t.subscriptions.reactivatedToast);
              }}
            >
              <RefreshCcw size={16} strokeWidth={2} /> {t.subscriptions.reactivateButton}
            </button>
          )}
          <button className="btn btn-danger-outline" onClick={() => void doDelete()}>
            <Trash2 size={16} strokeWidth={2} /> {t.common.delete}
          </button>
        </div>
      </div>

      <p className="sub-disclaimer">{t.subscriptions.disclaimer}</p>

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
