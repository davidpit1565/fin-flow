/** Flow's Privacy Policy, Terms of Use, and Help & Support screens. This is
 *  real legal-ish content, not just UI chrome -- translations of this file
 *  should get a human/legal review pass before shipping, same as this
 *  English source presumably did. */
export const legal = {
  privacy: {
    title: "Privacy Policy",
    lede: "Flow is built around one idea: your money is your business. That's why the app has no accounts, no servers, and no tracking.",

    whatWeStoreTitle: "What we store",
    whatWeStoreBody:
      "Your transactions, subscriptions, budgets, categories, and preferences. All of it is stored locally on your device in your browser's built-in storage (IndexedDB).",

    whereStoredTitle: "Where it's stored",
    whereStoredBody: "On your device only. There is no Flow server, database, or cloud account. Your data is not synced anywhere.",

    leavesDeviceTitle: "Does anything leave the device?",
    leavesDeviceIntro: "Nothing is sent to us automatically. The only times data leaves your device are when you choose to do something with it:",
    leavesDeviceCsv: "You export a CSV file and share or save it somewhere.",
    leavesDeviceNotifications: "You enable notifications — your browser handles delivery, and Flow does not see the content.",

    analyticsTitle: "Analytics and crash reporting",
    analyticsBody:
      "Flow does not use analytics, crash reporting, advertising, or any third-party services. There is nothing to disable because there is nothing collecting data.",

    deletingTitle: "Deleting your data",
    deletingBody:
      "Go to Settings → Data → Delete all data. This erases everything stored by the app on this device. You can also clear your browser's storage for this site at any time.",

    changesTitle: "Changes to this policy",
    changesBody: "If this policy ever changes, the updated version will appear here in the app.",
  },

  terms: {
    title: "Terms of Use",
    lede: "Flow is a personal financial organization tool. It helps you track what you record — nothing more.",

    noAdviceTitle: "Not financial advice",
    noAdviceBody:
      "Flow does not provide financial, investment, legal, or tax advice. Information shown in the app is calculated from the data you enter and is for organization purposes only.",

    noGuaranteeTitle: "No guaranteed savings",
    noGuaranteeBody:
      "Potential savings figures are estimates based on the subscriptions you mark as rarely used or unused. Flow does not guarantee any savings and does not cancel subscriptions on your behalf.",

    responsibilityTitle: "Your responsibility",
    responsibilityBody: "You are responsible for the accuracy of the information you enter. Flow does not connect to banks and does not import transactions automatically.",

    serviceTitle: "The service",
    serviceBody:
      "The app is provided “as is”, without warranties of any kind. While Flow works hard to keep your data safe on your device, local data can be lost if the device or browser storage is cleared — consider exporting a CSV backup.",

    contactTitle: "Contact",
    contactBody: "Questions about these terms? Use the support options in Help & Support.",
  },

  support: {
    title: "Help & Support",
    lede: "Frequently asked questions — most answers are right here.",

    faqs: [
      {
        q: "How do I add an expense?",
        a: "Tap the + button at the bottom of the screen, enter the amount, choose a category, and tap “Add expense”. It takes seconds.",
      },
      {
        q: "How do I add a subscription?",
        a: "Open the Subscriptions tab, tap “Add subscription”, and enter the service name, amount, billing frequency, and next payment date.",
      },
      {
        q: "How are yearly subscription costs calculated?",
        a: "From the billing frequency you entered: weekly × 52, monthly × 12, quarterly × 4, and yearly × 1. Flow always uses the real values you record — it never guesses.",
      },
      {
        q: "Can I use multiple currencies?",
        a: "Flow works with one currency at a time — EUR, USD, GBP, CHF, CAD, AUD, or ILS. Change it any time in Settings → Preferences. Flow never applies fake currency conversions.",
      },
      {
        q: "Can I delete my data?",
        a: "Yes. Settings → Data → Delete all data removes everything from this device. It cannot be undone.",
      },
      {
        q: "Does the app connect to my bank?",
        a: "No. Flow is manual and local-first by design. Your records are entered by you, and there is no bank connection or automatic import.",
      },
      {
        q: "Does the app sell my data?",
        a: "No. There is no account, no server, and no advertising. Your financial data never leaves your device unless you export or share it yourself.",
      },
      {
        q: "How do notifications work?",
        a: "Subscription reminders are scheduled for 9:00 AM local time before each payment. Budget alerts and the monthly summary are delivered when you open the app. You can turn each type on or off in Settings → Notifications.",
      },
      {
        q: "Does Flow cancel subscriptions?",
        a: "No. Flow only tracks them. When you cancel a subscription record in the app, nothing happens to the real-world subscription — you'd still need to cancel it with the provider.",
      },
    ],

    stillStuckTitle: "Still stuck?",
    stillStuckBody:
      "Flow keeps your data on your device, so most issues are solved by rechecking what was entered. If something looks wrong in the app, tell us what you expected to see.",

    contactSupport: "Contact support",
    reportProblem: "Report a problem",
  },
};
