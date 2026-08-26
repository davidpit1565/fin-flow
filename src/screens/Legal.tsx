import { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import { useNavigation } from "../store/Navigation";
import { ScreenHeader } from "../components/ui";

/* ---------- Privacy Policy ---------- */

export function PrivacyScreen() {
  const { back } = useNavigation();
  return (
    <div className="screen">
      <ScreenHeader title="Privacy Policy" onBack={back} />
      <div className="legal">
        <p className="legal-lede">
          Flow is built around one idea: your money is your business. That's why the app has no accounts, no servers,
          and no tracking.
        </p>
        <LegalSection title="What we store">
          <p>Your transactions, subscriptions, budgets, categories, and preferences. All of it is stored locally on your device in your browser's built-in storage (IndexedDB).</p>
        </LegalSection>
        <LegalSection title="Where it's stored">
          <p>On your device only. There is no Flow server, database, or cloud account. Your data is not synced anywhere.</p>
        </LegalSection>
        <LegalSection title="Does anything leave the device?">
          <p>Nothing is sent to us automatically. The only times data leaves your device are when you choose to do something with it:</p>
          <ul>
            <li>You export a CSV file and share or save it somewhere.</li>
            <li>You enable notifications — your browser handles delivery, and Flow does not see the content.</li>
          </ul>
        </LegalSection>
        <LegalSection title="Analytics and crash reporting">
          <p>Flow does not use analytics, crash reporting, advertising, or any third-party services. There is nothing to disable because there is nothing collecting data.</p>
        </LegalSection>
        <LegalSection title="Deleting your data">
          <p>Go to Settings → Data → Delete all data. This erases everything stored by the app on this device. You can also clear your browser's storage for this site at any time.</p>
        </LegalSection>
        <LegalSection title="Changes to this policy">
          <p>If this policy ever changes, the updated version will appear here in the app.</p>
        </LegalSection>
      </div>
    </div>
  );
}

/* ---------- Terms of Use ---------- */

export function TermsScreen() {
  const { back } = useNavigation();
  return (
    <div className="screen">
      <ScreenHeader title="Terms of Use" onBack={back} />
      <div className="legal">
        <p className="legal-lede">
          Flow is a personal financial organization tool. It helps you track what you record — nothing more.
        </p>
        <LegalSection title="Not financial advice">
          <p>Flow does not provide financial, investment, legal, or tax advice. Information shown in the app is calculated from the data you enter and is for organization purposes only.</p>
        </LegalSection>
        <LegalSection title="No guaranteed savings">
          <p>Potential savings figures are estimates based on the subscriptions you mark as rarely used or unused. Flow does not guarantee any savings and does not cancel subscriptions on your behalf.</p>
        </LegalSection>
        <LegalSection title="Your responsibility">
          <p>You are responsible for the accuracy of the information you enter. Flow does not connect to banks and does not import transactions automatically.</p>
        </LegalSection>
        <LegalSection title="The service">
          <p>The app is provided “as is”, without warranties of any kind. While Flow works hard to keep your data safe on your device, local data can be lost if the device or browser storage is cleared — consider exporting a CSV backup.</p>
        </LegalSection>
        <LegalSection title="Contact">
          <p>Questions about these terms? Use the support options in Help &amp; Support.</p>
        </LegalSection>
      </div>
    </div>
  );
}

/* ---------- Help & Support ---------- */

const FAQS: { q: string; a: string }[] = [
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
];

export function SupportScreen() {
  const { back } = useNavigation();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="screen">
      <ScreenHeader title="Help & Support" onBack={back} />
      <div className="legal">
        <p className="legal-lede">Frequently asked questions — most answers are right here.</p>
        <div className="faq">
          {FAQS.map((f, i) => (
            <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span>{f.q}</span>
                <ChevronDown size={16} strokeWidth={2} />
              </button>
              {open === i && <p className="faq-a">{f.a}</p>}
            </div>
          ))}
        </div>

        <LegalSection title="Still stuck?">
          <p>Flow keeps your data on your device, so most issues are solved by rechecking what was entered. If something looks wrong in the app, tell us what you expected to see.</p>
        </LegalSection>

        <a className="btn btn-secondary btn-block" href="mailto:davidpit2008@gmail.com?subject=Flow%20support">
          <Mail size={17} strokeWidth={2} /> Contact support
        </a>
        <a className="btn btn-secondary btn-block" href="mailto:davidpit2008@gmail.com?subject=Report%20a%20problem%20in%20Flow">
          Report a problem
        </a>
      </div>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/* small helper to keep the version in one place */
export function appVersion(): string {
  return "1.0.0";
}
