import { useEffect, useRef, useState } from "react";
import { ChevronRight, Download, FolderCog, LifeBuoy, Lock, Scale, Shield, Trash2, Upload } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { authenticateWithBiometrics, checkBiometryAvailable } from "../lib/appLock";
import { computeNetWorth } from "../lib/calc";
import { CURRENCIES, formatMoney, symbolFor } from "../lib/currency";
import { buildCSV, downloadCSV, fileToText, parseImportCSV } from "../lib/csv";
import { decryptBackup, downloadBackupFile, encryptBackup, type BackupPayload } from "../lib/backup";
import { LANGUAGE_NAMES, useT } from "../lib/i18n";
import { notificationsSupported, permissionState, requestPermission, triggersSupported } from "../lib/notifications";
import { isNative } from "../lib/platform";
import { resyncAllReminders } from "../lib/reminders";
import { todayISO } from "../lib/dates";
import type { Language } from "../types";
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
  const t = useT();
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
    const ok = await authenticateWithBiometrics(t.settings.confirmFaceIdReason);
    if (!ok) {
      toast(t.settings.faceIdNotVerified);
      return;
    }
    updateSettings({ appLockEnabled: true });
    toast(t.settings.appLockEnabledToast);
  };

  const onDeleteAll = async () => {
    const itemCount = transactions.length + subscriptions.length + budgets.length + goals.length + debts.length;
    const ok = await confirm({
      title: t.settings.deleteAllTitle,
      message:
        itemCount > 0
          ? t.settings.deleteAllMessage({
              transactions: transactions.length,
              subscriptions: subscriptions.length,
              budgets: budgets.length,
              goals: goals.length,
              debts: debts.length,
            })
          : t.settings.deleteAllMessageEmpty,
      confirmLabel: t.settings.deleteEverything,
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
        `flow-data-${todayISO()}.csv`,
        t.settings.exportShareDialogTitle
      );
      toast(t.settings.exportReady);
    } catch {
      toast(t.settings.exportFailed);
    }
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await fileToText(file);
      const parsed = parseImportCSV(text, categories);
      if (parsed.rows.length > 0) {
        const n = importTransactions(parsed.rows);
        toast(t.settings.importedCount(n));
      } else {
        toast(parsed.errors.length > 0 ? t.settings.importNothingFormat : t.settings.importNoneFound);
      }
    } catch {
      toast(t.settings.importFailed);
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
      await downloadBackupFile(encrypted, `flow-backup-${todayISO()}.flowbackup`, t.settings.backupShareDialogTitle);
      toast(t.settings.backupExported);
      closeExportBackup();
    } catch {
      toast(t.settings.backupExportFailed);
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
      toast(err instanceof Error ? err.message : t.settings.restoreFailed);
      setRestoring(false);
      return;
    }
    try {
      const ok = await confirm({
        title: t.settings.restoreTitle,
        message: t.settings.restoreMessage,
        confirmLabel: t.settings.restoreConfirmLabel,
        danger: true,
      });
      if (!ok) return;
      await restoreBackup(payload);
      toast(t.settings.backupRestored);
      closeRestoreBackup();
    } catch {
      toast(t.settings.restoreFailed);
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
          toast(t.settings.notificationsBlockedByBrowser);
        } else {
          void resyncAllReminders(subscriptions, { ...settings, notifications: { ...settings.notifications, enabled: true } }, t);
          toast(t.settings.notificationsOnToast);
        }
      })();
    }
  };

  const permission = permissionState();
  const netWorth = computeNetWorth(netWorthItems);

  return (
    <div className="screen">
      <ScreenHeader title={t.settings.title} onBack={back} />

      <SettingsSection title={t.settings.sectionPreferences}>
        <Card className="list-card">
          <SettingsRow
            label={t.settings.currency}
            value={currency}
            onPress={() => setShowCurrency(true)}
            last
          />
          <SettingsRow label={t.settings.startOfWeek} valueAsControl={
            <ChipGroup
              options={[
                { value: "monday", label: t.settings.weekMon },
                { value: "sunday", label: t.settings.weekSun },
              ]}
              value={settings.startWeekOn}
              onChange={(v) => updateSettings({ startWeekOn: v })}
              ariaLabel={t.settings.startOfWeek}
            />
          } />
          <SettingsRow label={t.settings.dateFormat} valueAsControl={
            <ChipGroup
              options={[
                { value: "auto", label: t.settings.dateFormatAuto },
                { value: "dmy", label: t.settings.dateFormatDMY },
                { value: "mdy", label: t.settings.dateFormatMDY },
                { value: "iso", label: t.settings.dateFormatISO },
              ]}
              value={settings.dateFormat}
              onChange={(v) => updateSettings({ dateFormat: v })}
              ariaLabel={t.settings.dateFormat}
            />
          } />
          <SettingsRow label={t.settings.theme} valueAsControl={
            <ChipGroup
              options={[
                { value: "system", label: t.settings.themeSystem },
                { value: "light", label: t.settings.themeLight },
                { value: "dark", label: t.settings.themeDark },
              ]}
              value={settings.theme}
              onChange={(v) => updateSettings({ theme: v })}
              ariaLabel={t.settings.theme}
            />
          } />
          <SettingsRow label={t.settings.accentColor} valueAsControl={
            <ChipGroup
              options={[
                { value: "green", label: t.settings.accentGreen },
                { value: "blue", label: t.settings.accentBlue },
                { value: "purple", label: t.settings.accentPurple },
                { value: "orange", label: t.settings.accentOrange },
                { value: "pink", label: t.settings.accentPink },
              ]}
              value={settings.accentColor ?? "green"}
              onChange={(v) => updateSettings({ accentColor: v })}
              ariaLabel={t.settings.accentColor}
            />
          } />
          <SettingsRow label="Language" valueAsControl={
            <ChipGroup
              options={Object.entries(LANGUAGE_NAMES).map(([value, label]) => ({ value: value as Language, label }))}
              value={settings.language ?? "en"}
              onChange={(v) => updateSettings({ language: v })}
              ariaLabel="Language"
            />
          } last />
        </Card>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionBudgets}>
        <Card className="list-card">
          <SettingsRow
            label={t.settings.monthlyBudgets}
            value={t.settings.budgetsCount(budgets.length)}
            onPress={() => push({ tab: "settings", name: "budgets" })}
          />
          <SettingsRow
            label={t.settings.savingsGoals}
            value={t.settings.goalsCount(goals.length)}
            onPress={() => push({ tab: "settings", name: "goals" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionNetWorth}>
        <Card className="list-card">
          <SettingsRow
            label={t.settings.netWorthRow}
            value={formatMoney(netWorth.netCents, currency)}
            onPress={() => push({ tab: "settings", name: "networth" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionDebts}>
        <Card className="list-card">
          <SettingsRow
            label={t.settings.debtPayoffPlanner}
            value={t.settings.debtsCount(debts.length)}
            onPress={() => push({ tab: "settings", name: "debts" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionYearInReview}>
        <Card className="list-card">
          <SettingsRow
            label={t.settings.yearInReviewRow}
            sub={t.settings.yearInReviewSub}
            onPress={() => push({ tab: "settings", name: "yearinreview" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionNotifications}>
        <Card className="list-card">
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">{t.settings.notificationsTitle}</span>
              <span className="row-sub">
                {!notificationsSupported()
                  ? t.settings.notificationsNotSupported
                  : permission === "granted"
                    ? t.settings.notificationsOnSub
                    : permission === "denied"
                      ? t.settings.notificationsBlockedSub
                      : t.settings.notificationsDefaultSub}
              </span>
            </div>
            <Toggle
              checked={settings.notifications.enabled}
              onChange={(v) => setNotifications({ enabled: v })}
              label={t.settings.enableNotifications}
              disabled={!notificationsSupported()}
            />
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">{t.settings.subscriptionReminders}</span>
              <span className="row-sub">{t.settings.subscriptionRemindersSub}</span>
            </div>
            <Toggle
              checked={settings.notifications.subscriptionReminders}
              onChange={(v) => setNotifications({ subscriptionReminders: v })}
              label={t.settings.subscriptionReminders}
              disabled={!settings.notifications.enabled}
            />
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">{t.settings.budgetAlerts}</span>
              <span className="row-sub">{t.settings.budgetAlertsSub}</span>
            </div>
            <Toggle
              checked={settings.notifications.budgetAlerts}
              onChange={(v) => setNotifications({ budgetAlerts: v })}
              label={t.settings.budgetAlerts}
              disabled={!settings.notifications.enabled}
            />
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">{t.settings.monthlySummary}</span>
              <span className="row-sub">{t.settings.monthlySummarySub}</span>
            </div>
            <Toggle
              checked={settings.notifications.monthlySummary}
              onChange={(v) => setNotifications({ monthlySummary: v })}
              label={t.settings.monthlySummary}
              disabled={!settings.notifications.enabled}
            />
          </div>
          {settings.notifications.enabled && !triggersSupported() && (
            <p className="settings-note">{t.settings.triggersUnsupportedNote}</p>
          )}
        </Card>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionData}>
        <Card className="list-card">
          <SettingsRow label={t.settings.exportMyData} sub={t.settings.exportMyDataSub} icon={Download} onPress={() => void onExport()} />
          <SettingsRow label={t.settings.importData} sub={t.settings.importDataSub} icon={Upload} onPress={() => fileRef.current?.click()} />
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
            label={t.settings.deleteAllData}
            sub={t.settings.deleteAllDataSub}
            icon={Trash2}
            danger
            onPress={() => void onDeleteAll()}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionBackup}>
        <Card className="list-card">
          <SettingsRow
            label={t.settings.exportEncryptedBackup}
            sub={t.settings.exportEncryptedBackupSub}
            icon={Lock}
            onPress={() => setShowExportBackup(true)}
          />
          <SettingsRow
            label={t.settings.restoreFromBackup}
            sub={t.settings.restoreFromBackupSub}
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
        <p className="settings-note">{t.settings.backupNote}</p>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionCategories}>
        <Card className="list-card">
          <SettingsRow
            label={t.settings.manageCategories}
            sub={t.settings.categoriesCount(categories.length)}
            icon={FolderCog}
            onPress={() => push({ tab: "settings", name: "categories" })}
            last
          />
        </Card>
      </SettingsSection>

      <SettingsSection title={t.settings.sectionAbout}>
        <Card className="list-card">
          <SettingsRow label={t.settings.privacyPolicy} icon={Shield} onPress={() => push({ tab: "settings", name: "privacy" })} />
          <SettingsRow label={t.settings.termsOfUse} icon={Scale} onPress={() => push({ tab: "settings", name: "terms" })} />
          <SettingsRow label={t.settings.helpAndSupport} icon={LifeBuoy} onPress={() => push({ tab: "settings", name: "support" })} />
          <div className="settings-toggle-row">
            <div>
              <span className="row-title">{t.settings.appLockWithFaceId}</span>
              <span className="row-sub">
                {!isNative()
                  ? t.settings.appLockNotAvailable
                  : biometryAvailable === null
                    ? t.settings.appLockChecking
                    : biometryAvailable
                      ? t.settings.appLockRequireFaceId
                      : t.settings.appLockSetupFirst}
              </span>
            </div>
            <Toggle
              checked={settings.appLockEnabled ?? false}
              onChange={(v) => void onToggleAppLock(v)}
              label={t.settings.appLockWithFaceId}
              disabled={!isNative() || !biometryAvailable}
            />
          </div>
        </Card>
      </SettingsSection>

      <div className="settings-footer">
        <p className="settings-version">{t.settings.version(APP_VERSION)}</p>
        <p className="settings-privacy-note">{t.settings.privacyFooterNote}</p>
      </div>

      {showCurrency && (
        <Sheet title={t.settings.currency} onClose={() => setShowCurrency(false)} ariaLabel={t.settings.chooseCurrency}>
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
        <Sheet title={t.settings.exportEncryptedBackup} onClose={closeExportBackup} ariaLabel={t.settings.exportEncryptedBackup}>
          <div className="sheet-form">
            <p className="settings-note">{t.settings.chooseBackupPasswordNote}</p>
            <Field label={t.settings.backupPassword}>
              <TextInput
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                autoFocus
                autoComplete="new-password"
                aria-label={t.settings.backupPassword}
              />
            </Field>
            <Field label={t.settings.confirmBackupPassword}>
              <TextInput
                type="password"
                value={exportPasswordConfirm}
                onChange={(e) => setExportPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                aria-label={t.settings.confirmBackupPassword}
              />
            </Field>
            <FormError
              message={
                exportPasswordConfirm.length > 0 && exportPassword !== exportPasswordConfirm
                  ? t.settings.passwordsDontMatch
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
              {exporting ? t.settings.exporting : t.settings.exportBackupButton}
            </Button>
          </div>
        </Sheet>
      )}

      {restoreFile && (
        <Sheet title={t.settings.restoreFromBackup} onClose={closeRestoreBackup} ariaLabel={t.settings.restoreFromBackup}>
          <div className="sheet-form">
            <p className="settings-note">{t.settings.enterBackupPasswordNote}</p>
            <Field label={t.settings.backupPassword}>
              <TextInput
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                aria-label={t.settings.backupPassword}
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
              {restoring ? t.settings.restoring : t.settings.restoreConfirmLabel}
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
