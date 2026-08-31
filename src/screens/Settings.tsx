import { useEffect, useRef, useState } from "react";
import { ChevronRight, Download, FolderCog, LifeBuoy, Scale, Shield, Trash2, Upload } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { authenticateWithBiometrics, checkBiometryAvailable } from "../lib/appLock";
import { CURRENCIES, symbolFor } from "../lib/currency";
import { buildCSV, downloadCSV, fileToText, parseImportCSV } from "../lib/csv";
import { notificationsSupported, permissionState, requestPermission, triggersSupported } from "../lib/notifications";
import { isNative } from "../lib/platform";
import { resyncAllReminders } from "../lib/reminders";
import { todayISO } from "../lib/dates";
import { Card, ChipGroup, ScreenHeader, Sheet, Toggle } from "../components/ui";

export function Settings() {
  const {
    settings,
    categories,
    budgets,
    goals,
    transactions,
    subscriptions,
    updateSettings,
    importTransactions,
    deleteAllData,
    confirm,
    toast,
    haptic,
  } = useApp();
  const { back, push } = useNavigation();
  const [showCurrency, setShowCurrency] = useState(false);
  const [biometryAvailable, setBiometryAvailable] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    void checkBiometryAvailable().then((available) => {
      if (!cancelled) setBiometryAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) return null;
  const { currency } = settings;

  const onToggleAppLock = async (next: boolean) => {
    if (!next) {
      updateSettings({ appLockEnabled: false });
      return;
    }
    const ok = await authenticateWithBiometrics("Confirm Face ID to turn on app lock");
    if (!ok) {
      toast("Couldn't verify Face ID — app lock not enabled");
      return;
    }
    updateSettings({ appLockEnabled: true });
    toast("App lock enabled");
  };

  const onDeleteAll = async () => {
    const itemCount = transactions.length + subscriptions.length + budgets.length + goals.length;
    const ok = await confirm({
      title: "Delete all data?",
      message:
        itemCount > 0
          ? `This permanently deletes ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}, ${subscriptions.length} subscription${subscriptions.length === 1 ? "" : "s"}, ${budgets.length} budget${budgets.length === 1 ? "" : "s"}, and ${goals.length} goal${goals.length === 1 ? "" : "s"} from this device, along with every setting. Export a backup first if you might need this later — it cannot be undone.`
          : "This removes every setting from this device. It cannot be undone.",
      confirmLabel: "Delete everything",
      danger: true,
    });
    if (!ok) return;
    await deleteAllData();
    haptic("warning");
  };

  const onExport = async () => {
    try {
      await downloadCSV(
        buildCSV({ transactions, subscriptions, categories, currency }),
        `flow-data-${todayISO()}.csv`
      );
      toast("Export ready");
    } catch {
      toast("We couldn't export your data. Please try again.");
    }
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await fileToText(file);
      const parsed = parseImportCSV(text, categories);
      if (parsed.rows.length > 0) {
        const n = importTransactions(parsed.rows);
        toast(`Imported ${n} ${n === 1 ? "transaction" : "transactions"}`);
      } else {
        toast(parsed.errors.length > 0 ? "Nothing imported — check the file format." : "No transactions found in the file.");
      }
    } catch {
      toast("We couldn't import that file. Please try again.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setNotifications = (patch: Partial<typeof settings.notifications>) => {
    updateSettings({ notifications: { ...settings.notifications, ...patch } });
    if (patch.enabled === true) {
      void (async () => {
        const granted = await requestPermission();
        if (!granted) {
          toast("Notifications are blocked by your browser.");
        } else {
          void resyncAllReminders(subscriptions, { ...settings, notifications: { ...settings.notifications, enabled: true } });
          toast("Notifications on");
        }
      })();
    }
  };

  const permission = permissionState();

  return (
    <div className="screen">
      <ScreenHeader title="Settings" onBack={back} />

      <SettingsSection title="Preferences">
        <Card className="list-card">
          <SettingsRow
            label="Currency"
            value={currency}
            onPress={() => setShowCurrency(true)}
            last
          />
          <SettingsRow label="Start of week" valueAsControl={
            <ChipGroup
              options={[
                { value: "monday", label: "Mon" },
                { value: "sunday", label: "Sun" },
              ]}
              value={settings.startWeekOn}
              onChange={(v) => updateSettings({ startWeekOn: v })}
              ariaLabel="Start of week"
            />
          } />
          <SettingsRow label="Date format" valueAsControl={
            <ChipGroup
              options={[
                { value: "auto", label: "Auto" },
                { value: "dmy", label: "DD/MM" },
                { value: "mdy", label: "MM/DD" },
                { value: "iso", label: "ISO" },
              ]}
              value={settings.dateFormat}
              onChange={(v) => updateSettings({ dateFormat: v })}
              ariaLabel="Date format"
            />
          } />
          <SettingsRow label="Theme" valueAsControl={
            <ChipGroup
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              value={settings.theme}
              onChange={(v) => updateSettings({ theme: v })}
              ariaLabel="Theme"
            />
          } />
        </Card>
      </SettingsSection>

      <SettingsSection title="Budgets">
        <Card className="list-card">
          <SettingsRow
            label="Monthly budgets"
            value={`${budgets.length} ${budgets.length === 1 ? "budget" : "budgets"}`}
            onPress={() => push({ tab: "settings", name: "budgets" })}
          />
          <SettingsRow
            label="Savings goals"
            value={`${goals.length} ${goals.length === 1 ? "goal" : "goals"}`}
            onPress={() => push({ tab: "settings", name: "goals" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <Card className="list-card">
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">Notifications</span>
              <span className="row-sub">
                {!notificationsSupported()
                  ? "Not supported by this browser"
                  : permission === "granted"
                    ? "On — reminders at 9:00 AM"
                    : permission === "denied"
                      ? "Blocked by your browser"
                      : "Payment reminders and budget alerts"}
              </span>
            </div>
            <Toggle
              checked={settings.notifications.enabled}
              onChange={(v) => setNotifications({ enabled: v })}
              label="Enable notifications"
              disabled={!notificationsSupported()}
            />
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">Subscription reminders</span>
              <span className="row-sub">Before each payment is due</span>
            </div>
            <Toggle
              checked={settings.notifications.subscriptionReminders}
              onChange={(v) => setNotifications({ subscriptionReminders: v })}
              label="Subscription reminders"
              disabled={!settings.notifications.enabled}
            />
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">Budget alerts</span>
              <span className="row-sub">When you approach or pass a budget</span>
            </div>
            <Toggle
              checked={settings.notifications.budgetAlerts}
              onChange={(v) => setNotifications({ budgetAlerts: v })}
              label="Budget alerts"
              disabled={!settings.notifications.enabled}
            />
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">Monthly summary</span>
              <span className="row-sub">A short recap at the start of each month</span>
            </div>
            <Toggle
              checked={settings.notifications.monthlySummary}
              onChange={(v) => setNotifications({ monthlySummary: v })}
              label="Monthly summary"
              disabled={!settings.notifications.enabled}
            />
          </div>
          {settings.notifications.enabled && !triggersSupported() && (
            <p className="settings-note">
              Scheduled reminders need Chrome or Edge. Other browsers show them when you open Flow.
            </p>
          )}
        </Card>
      </SettingsSection>

      <SettingsSection title="Data">
        <Card className="list-card">
          <SettingsRow label="Export my data" sub="CSV — transactions and subscriptions" icon={Download} onPress={() => void onExport()} />
          <SettingsRow label="Import data" sub="CSV file from Flow or another tracker" icon={Upload} onPress={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
            }}
          />
          <SettingsRow
            label="Delete all data"
            sub="Erase everything on this device"
            icon={Trash2}
            danger
            onPress={() => void onDeleteAll()}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title="Categories">
        <Card className="list-card">
          <SettingsRow
            label="Manage categories"
            sub={`${categories.length} categories`}
            icon={FolderCog}
            onPress={() => push({ tab: "settings", name: "categories" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title="About">
        <Card className="list-card">
          <SettingsRow label="Privacy Policy" icon={Shield} onPress={() => push({ tab: "settings", name: "privacy" })} />
          <SettingsRow label="Terms of Use" icon={Scale} onPress={() => push({ tab: "settings", name: "terms" })} />
          <SettingsRow label="Help & Support" icon={LifeBuoy} onPress={() => push({ tab: "settings", name: "support" })} />
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">App lock with Face ID</span>
              <span className="row-sub">
                {!isNative()
                  ? "Not available in the browser"
                  : biometryAvailable === null
                    ? "Checking…"
                    : biometryAvailable
                      ? "Require Face ID to open Flow"
                      : "Set up Face ID in iOS Settings first"}
              </span>
            </div>
            <Toggle
              checked={settings.appLockEnabled ?? false}
              onChange={(v) => void onToggleAppLock(v)}
              label="App lock with Face ID"
              disabled={!isNative() || !biometryAvailable}
            />
          </div>
        </Card>
      </SettingsSection>

      <div className="settings-footer">
        <p className="settings-version">Flow {APP_VERSION}</p>
        <p className="settings-privacy-note">Your financial data never leaves this device. No accounts, no servers, no ads.</p>
      </div>

      {showCurrency && (
        <Sheet title="Currency" onClose={() => setShowCurrency(false)} ariaLabel="Choose currency">
          <div className="sheet-form">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                className={`row currency-row ${settings.currency === c.code ? "currency-row-active" : ""}`}
                onClick={() => {
                  updateSettings({ currency: c.code });
                  setShowCurrency(false);
                }}
              >
                <div className="row-main">
                  <span className="row-title">{c.code}</span>
                  <span className="row-sub">{c.label}</span>
                </div>
                <span className="row-amount">{symbolFor(c.code)}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

const APP_VERSION = "1.0.0";

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

function SettingsRow({
  label,
  sub,
  value,
  valueAsControl,
  icon: Icon,
  danger,
  last,
  onPress,
}: {
  label: string;
  sub?: string;
  value?: string;
  valueAsControl?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      {Icon && (
        <span className="settings-row-icon">
          <Icon size={17} strokeWidth={2} />
        </span>
      )}
      <div className="row-main">
        <span className={`row-title ${danger ? "danger" : ""}`}>{label}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </div>
      {value && !valueAsControl && <span className="row-sub">{value}</span>}
      {valueAsControl ?? null}
      {onPress && !valueAsControl && <ChevronRight className="row-chevron" size={16} strokeWidth={2} aria-hidden="true" />}
    </>
  );
  const className = `row ${last ? "row-last" : ""}`;
  if (onPress) {
    return (
      <button className={className} onClick={onPress}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}
