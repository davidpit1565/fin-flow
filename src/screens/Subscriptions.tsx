import { useMemo, useState } from "react";
import { Plus, RefreshCcw, Settings as SettingsIcon } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import {
  activeSubscriptions,
  subscriptionMonthlyTotal,
  subscriptionYearlyTotal,
  upcomingPayments,
} from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { useT } from "../lib/i18n";
import { Button, Card, EmptyState, Money, ScreenHeader } from "../components/ui";
import { SubscriptionRow } from "../components/rows";
import { AddSubscriptionSheet } from "../components/AddSubscriptionSheet";

export function Subscriptions() {
  const { settings, subscriptions, categories, deleteSubscription, confirm, toast, haptic } = useApp();
  const { push } = useNavigation();
  const t = useT();
  const [adding, setAdding] = useState(false);

  if (!settings) return null;
  const { currency } = settings;

  const monthly = subscriptionMonthlyTotal(subscriptions);
  const yearly = subscriptionYearlyTotal(subscriptions);
  const activeCount = activeSubscriptions(subscriptions).length;
  const upcomingCount = upcomingPayments(subscriptions, t, settings.dateFormat).length;

  const sorted = useMemo(
    () => [...subscriptions].sort((a, b) => (a.nextPaymentDate < b.nextPaymentDate ? -1 : 1)),
    [subscriptions]
  );

  const doDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: t.subscriptions.deleteConfirmTitle,
      message: t.subscriptions.deleteConfirmMessage(name),
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteSubscription(id);
    haptic("warning");
    toast(t.common.deleted);
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t.subscriptions.title}
        right={
          <button className="icon-btn" aria-label={t.subscriptions.settingsAriaLabel} onClick={() => push({ tab: "settings", name: "settings" })}>
            <SettingsIcon size={20} strokeWidth={2} />
          </button>
        }
      />

      <Card className="sub-summary">
        <div className="sub-summary-main">
          <div>
            <p className="spend-label">{t.subscriptions.recurringCost}</p>
            <Money cents={monthly} currency={currency} amount="large" />
            <p className="sub-summary-note">{t.subscriptions.yearlyEquivalentNote(formatMoney(yearly, currency))}</p>
          </div>
          <div className="sub-summary-stats">
            <div className="sub-summary-stat">
              <span className="stat-value">{activeCount}</span>
              <span className="stat-label">{t.subscriptions.activeStatLabel}</span>
            </div>
            <div className="sub-summary-stat">
              <span className="stat-value">{upcomingCount}</span>
              <span className="stat-label">{t.subscriptions.upcomingStatLabel}</span>
            </div>
          </div>
        </div>
        <p className="sub-summary-foot">{t.subscriptions.costFootnote}</p>
      </Card>

      <div className="sub-toolbar">
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={17} strokeWidth={2} /> {t.subscriptions.addSubscription}
        </Button>
        {activeCount === 0 && subscriptions.length > 0 && (
          <p className="sub-toolbar-note">{t.subscriptions.allPausedOrCancelled}</p>
        )}
      </div>

      {subscriptions.length === 0 ? (
        <div className="screen-empty">
          <EmptyState
            icon={RefreshCcw}
            title={t.subscriptions.emptyTitle}
            message={t.subscriptions.emptyMessage}
            action={
              <Button onClick={() => setAdding(true)}>
                <Plus size={18} strokeWidth={2} /> {t.subscriptions.addSubscription}
              </Button>
            }
          />
        </div>
      ) : (
        <Card className="list-card">
          {sorted.map((s) => (
            <SubscriptionRow
              key={s.id}
              subscription={s}
              category={categories.find((c) => c.id === s.categoryId)}
              currency={currency}
              dateFormat={settings.dateFormat}
              onTap={() => push({ tab: "subscriptions", name: "detail", subscriptionId: s.id })}
              onDelete={() => void doDelete(s.id, s.name)}
            />
          ))}
        </Card>
      )}

      {adding && <AddSubscriptionSheet onClose={() => setAdding(false)} />}
    </div>
  );
}
