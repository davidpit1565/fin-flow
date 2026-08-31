import { useEffect, useRef, useState } from "react";
import { ChevronRight, Download, FolderCog, LifeBuoy, Lock, Scale, Shield, Trash2, Upload } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { authenticateWithBiometrics, checkBiometryAvailable } from "../lib/appLock";
import { computeNetWorth } from "../lib/calc";
import { CURRENCIES, formatMoney, symbolFor } from "../lib/currency";
import { buildCSV, downloadCSV, fileToText, parseImportCSV } from "../lib/csv";
import { decryptBackup, downloadBackupFile, encryptBackup, type BackupPayload } from "../lib/backup";
import { notificationsSupported, permissionState, requestPermission, triggersSupported } from "../lib/notifications";
import { isNative } from "../lib/platform";
import { resyncAllReminders } from "../lib/reminders";
import { todayISO } from "../lib/dates";
import { Button, Card, ChipGroup, Field, FormError, ScreenHeader, Sheet, TextInput, Toggle } from "../components/ui";

export function Settings() {
  const {
    settings,
    categories,
    budgets,
    goals,
    debts,
    transactions,
    subscriptions,
    netWorthItems,
    updateSettings,
    importTransactions,
    deleteAllData,
    restoreBackup,
    confirm,
    toast,
    haptic,
  } = useApp();
  const { back, push } = useNavigation();
  const [showCurrency, setShowCurrency] = useState(false);
  const [biometryAvailable, setBiometryAvailable] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [showExportBackup, setShowExportBackup] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState("");
  const [restoring, setRestoring] = useState(false);

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
    const itemCount = transactions.length + subscriptions.length + budgets.length + goals.length + debts.length;
    const ok = await confirm({
      title: "Delete all data?",
      message:
        itemCount > 0
          ? `This permanently deletes ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}, ${subscriptions.length} subscription${subscriptions.length === 1 ? "" : "s"}, ${budgets.length} budget${budgets.length === 1 ? "" : "s"}, ${goals.length} goal${goals.length === 1 ? "" : "s"}, and ${debts.length} debt${debts.length === 1 ? "" : "s"} from this device, along with every setting. Export a backup first if you might need this later — it cannot be undone.`
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

  const closeExportBackup = () => {
    setShowExportBackup(false);
    setExportPassword("");
    setExportPasswordConfirm("");
  };

  const onExportBackup = async () => {
    if (!settings || exportPassword.length === 0 || exportPassword !== exportPasswordConfirm) return;
    setExporting(true);
    try {
      const payload: BackupPayload = {
        version: 1,
        settings,
        categories,
        transactions,
        subscriptions,
        budgets,
        goals,
        netWorthItems,
        debts,
      };
      const encrypted = await encryptBackup(payload, exportPassword);
      await downloadBackupFile(encrypted, `flow-backup-${todayISO()}.flowbackup`);
      toast("Backup exported");
      closeExportBackup();
    } catch {
      toast("We couldn't create the backup. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const closeRestoreBackup = () => {
    setRestoreFile(null);
    setRestorePassword("");
    if (backupFileRef.current) backupFileRef.current.value = "";
  };

  const onRestoreBackup = async () => {
    if (!restoreFile || restorePassword.length === 0) return;
    setRestoring(true);
    let payload: BackupPayload;
    try {
      const text = await fileToText(restoreFile);
      payload = await decryptBackup(text, restorePassword);
    } catch (err) {
      // decryptBackup's message ("Wrong password or corrupted file") tells
      // the user exactly what to try again -- worth surfacing verbatim.
      toast(err instanceof Error ? err.message : "We couldn't restore that backup. Please try again.");
      setRestoring(false);
      return;
    }
    try {
      const ok = await confirm({
        title: "Restore from backup?",
        message:
          "This replaces every transaction, subscription, budget, goal, net worth item, debt, and setting currently on this device with what's in the backup file. This cannot be undone.",
        confirmLabel: "Restore",
        danger: true,
      });
      if (!ok) return;
      await restoreBackup(payload);
      toast("Backup restored");
      closeRestoreBackup();
    } catch {
      toast("We couldn't restore that backup. Please try again.");
    } finally {
      setRestoring(false);
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
  const netWorth = computeNetWorth(netWorthItems);

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
          <SettingsRow label="Accent color" valueAsControl={
            <ChipGroup
              options={[
                { value: "green", label: "Green" },
                { value: "blue", label: "Blue" },
                { value: "purple", label: "Purple" },
                { value: "orange", label: "Orange" },
                { value: "pink", label: "Pink" },
              ]}
              value={settings.accentColor ?? "green"}
              onChange={(v) => updateSettings({ accentColor: v })}
              ariaLabel="Accent color"
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

      <SettingsSection title="Net worth">
        <Card className="list-card">
          <SettingsRow
            label="Net worth"
            value={formatMoney(netWorth.netCents, currency)}
            onPress={() => push({ tab: "settings", name: "networth" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title="Debts">
        <Card className="list-card">
          <SettingsRow
            label="Debt payoff planner"
            value={`${debts.length} ${debts.length === 1 ? "debt" : "debts"}`}
            onPress={() => push({ tab: "settings", name: "debts" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title="Year in review">
        <Card className="list-card">
          <SettingsRow
            label="Year in review"
            sub="A Wrapped-style recap of your year"
            onPress={() => push({ tab: "settings", name: "yearinreview" })}
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

      <SettingsSection title="Backup">
        <Card className="list-card">
          <SettingsRow
            label="Export encrypted backup"
            sub="Everything — protected by a password you choose"
            icon={Lock}
            onPress={() => setShowExportBackup(true)}
          />
          <SettingsRow
            label="Restore from backup"
            sub="Replaces all current data on this device"
            icon={Upload}
            onPress={() => backupFileRef.current?.click()}
            last
          />
          <input
            ref={backupFileRef}
            type="file"
            accept=".flowbackup,application/json"
            style={{ display: "none" }}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setRestoreFile(f);
            }}
          />
        </Card>
        <p className="settings-note">
          The backup file is encrypted with the password you choose. Flow has no way to recover it if you
          forget that password — keep it somewhere safe.
        </p>
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

      {showExportBackup && (
        <Sheet title="Export encrypted backup" onClose={closeExportBackup} ariaLabel="Export encrypted backup">
          <div className="sheet-form">
            <p className="settings-note">
              Choose a password to encrypt this backup. Flow never stores it — if you forget it, this backup
              can't be recovered.
            </p>
            <Field label="Backup password">
              <TextInput
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                autoFocus
                autoComplete="new-password"
                aria-label="Backup password"
              />
            </Field>
            <Field label="Confirm backup password">
              <TextInput
                type="password"
                value={exportPasswordConfirm}
                onChange={(e) => setExportPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                aria-label="Confirm backup password"
              />
            </Field>
            <FormError
              message={
                exportPasswordConfirm.length > 0 && exportPassword !== exportPasswordConfirm
                  ? "Passwords don't match"
                  : null
              }
            />
          </div>
          <div className="sheet-footer">
            <Button
              size="lg"
              className="btn-block"
              disabled={exporting || exportPassword.length === 0 || exportPassword !== exportPasswordConfirm}
              onClick={() => void onExportBackup()}
            >
              {exporting ? "Exporting…" : "Export backup"}
            </Button>
          </div>
        </Sheet>
      )}

      {restoreFile && (
        <Sheet title="Restore from backup" onClose={closeRestoreBackup} ariaLabel="Restore from backup">
          <div className="sheet-form">
            <p className="settings-note">Enter the password used to encrypt this backup.</p>
            <Field label="Backup password">
              <TextInput
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                aria-label="Backup password"
              />
            </Field>
          </div>
          <div className="sheet-footer">
            <Button
              size="lg"
              className="btn-block"
              disabled={restoring || restorePassword.length === 0}
              onClick={() => void onRestoreBackup()}
            >
              {restoring ? "Restoring…" : "Restore"}
            </Button>
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
