/** The Settings screen: preferences, budgets/goals/debts summary rows, net
 *  worth, year in review, notifications, CSV export/import, encrypted
 *  backup/restore, categories, and the About section (legal links, app
 *  lock, version footer). Note: the "Language" picker row itself (its own
 *  label and its two option names "English"/"עברית") is intentionally NOT
 *  part of this namespace -- it's a language picker showing each option in
 *  its own language's name, like real apps do, and stays untranslated. */
export const settings = {
  title: "Settings",

  sectionPreferences: "Preferences",
  sectionBudgets: "Budgets",
  sectionNetWorth: "Net worth",
  sectionDebts: "Debts",
  sectionYearInReview: "Year in review",
  sectionNotifications: "Notifications",
  sectionData: "Data",
  sectionBackup: "Backup",
  sectionCategories: "Categories",
  sectionAbout: "About",

  currency: "Currency",
  chooseCurrency: "Choose currency",

  startOfWeek: "Start of week",
  weekMon: "Mon",
  weekSun: "Sun",

  dateFormat: "Date format",
  dateFormatAuto: "Auto",
  dateFormatDMY: "DD/MM",
  dateFormatMDY: "MM/DD",
  dateFormatISO: "ISO",

  theme: "Theme",
  themeSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",

  accentColor: "Accent color",
  accentGreen: "Green",
  accentBlue: "Blue",
  accentPurple: "Purple",
  accentOrange: "Orange",
  accentPink: "Pink",

  monthlyBudgets: "Monthly budgets",
  budgetsCount: (n: number) => `${n} ${n === 1 ? "budget" : "budgets"}`,
  savingsGoals: "Savings goals",
  goalsCount: (n: number) => `${n} ${n === 1 ? "goal" : "goals"}`,

  netWorthRow: "Net worth",

  debtPayoffPlanner: "Debt payoff planner",
  debtsCount: (n: number) => `${n} ${n === 1 ? "debt" : "debts"}`,

  yearInReviewRow: "Year in review",
  yearInReviewSub: "A Wrapped-style recap of your year",

  notificationsTitle: "Notifications",
  notificationsNotSupported: "Not supported by this browser",
  notificationsOnSub: "On — reminders at 9:00 AM",
  notificationsBlockedSub: "Blocked by your browser",
  notificationsDefaultSub: "Payment reminders and budget alerts",
  enableNotifications: "Enable notifications",

  subscriptionReminders: "Subscription reminders",
  subscriptionRemindersSub: "Before each payment is due",
  budgetAlerts: "Budget alerts",
  budgetAlertsSub: "When you approach or pass a budget",
  monthlySummary: "Monthly summary",
  monthlySummarySub: "A short recap at the start of each month",
  triggersUnsupportedNote: "Scheduled reminders need Chrome or Edge. Other browsers show them when you open Flow.",

  exportMyData: "Export my data",
  exportMyDataSub: "CSV — transactions and subscriptions",
  importData: "Import data",
  importDataSub: "CSV file from Flow or another tracker",
  deleteAllData: "Delete all data",
  deleteAllDataSub: "Erase everything on this device",

  exportEncryptedBackup: "Export encrypted backup",
  exportEncryptedBackupSub: "Everything — protected by a password you choose",
  restoreFromBackup: "Restore from backup",
  restoreFromBackupSub: "Replaces all current data on this device",
  backupNote:
    "The backup file is encrypted with the password you choose. Flow has no way to recover it if you forget that password — keep it somewhere safe.",

  manageCategories: "Manage categories",
  categoriesCount: (n: number) => `${n} categories`,

  privacyPolicy: "Privacy Policy",
  termsOfUse: "Terms of Use",
  helpAndSupport: "Help & Support",

  appLockWithFaceId: "App lock with Face ID",
  appLockNotAvailable: "Not available in the browser",
  appLockChecking: "Checking…",
  appLockRequireFaceId: "Require Face ID to open Flow",
  appLockSetupFirst: "Set up Face ID in iOS Settings first",

  version: (v: string) => `Flow ${v}`,
  privacyFooterNote: "Your financial data never leaves this device. No accounts, no servers, no ads.",

  confirmFaceIdReason: "Confirm Face ID to turn on app lock",
  faceIdNotVerified: "Couldn't verify Face ID — app lock not enabled",
  appLockEnabledToast: "App lock enabled",

  deleteAllTitle: "Delete all data?",
  deleteAllMessage: (counts: {
    transactions: number;
    subscriptions: number;
    budgets: number;
    goals: number;
    debts: number;
  }) =>
    `This permanently deletes ${counts.transactions} transaction${counts.transactions === 1 ? "" : "s"}, ${counts.subscriptions} subscription${counts.subscriptions === 1 ? "" : "s"}, ${counts.budgets} budget${counts.budgets === 1 ? "" : "s"}, ${counts.goals} goal${counts.goals === 1 ? "" : "s"}, and ${counts.debts} debt${counts.debts === 1 ? "" : "s"} from this device, along with every setting. Export a backup first if you might need this later — it cannot be undone.`,
  deleteAllMessageEmpty: "This removes every setting from this device. It cannot be undone.",
  deleteEverything: "Delete everything",

  exportReady: "Export ready",
  exportFailed: "We couldn't export your data. Please try again.",

  importedCount: (n: number) => `Imported ${n} ${n === 1 ? "transaction" : "transactions"}`,
  importNothingFormat: "Nothing imported — check the file format.",
  importNoneFound: "No transactions found in the file.",
  importFailed: "We couldn't import that file. Please try again.",

  backupExported: "Backup exported",
  backupExportFailed: "We couldn't create the backup. Please try again.",

  restoreTitle: "Restore from backup?",
  restoreMessage:
    "This replaces every transaction, subscription, budget, goal, net worth item, debt, and setting currently on this device with what's in the backup file. This cannot be undone.",
  restoreConfirmLabel: "Restore",
  restoreFailed: "We couldn't restore that backup. Please try again.",
  backupRestored: "Backup restored",

  notificationsBlockedByBrowser: "Notifications are blocked by your browser.",
  notificationsOnToast: "Notifications on",

  chooseBackupPasswordNote:
    "Choose a password to encrypt this backup. Flow never stores it — if you forget it, this backup can't be recovered.",
  backupPassword: "Backup password",
  confirmBackupPassword: "Confirm backup password",
  passwordsDontMatch: "Passwords don't match",
  exporting: "Exporting…",
  exportBackupButton: "Export backup",

  enterBackupPasswordNote: "Enter the password used to encrypt this backup.",
  restoring: "Restoring…",
};
