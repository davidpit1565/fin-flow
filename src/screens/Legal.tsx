import { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import { useNavigation } from "../store/Navigation";
import { ScreenHeader } from "../components/ui";
import { useT } from "../lib/i18n";

/* ---------- Privacy Policy ---------- */

export function PrivacyScreen() {
  const { back } = useNavigation();
  const t = useT();
  const p = t.legal.privacy;
  return (
    <div className="screen">
      <ScreenHeader title={p.title} onBack={back} />
      <div className="legal">
        <p className="legal-lede">{p.lede}</p>
        <LegalSection title={p.whatWeStoreTitle}>
          <p>{p.whatWeStoreBody}</p>
        </LegalSection>
        <LegalSection title={p.whereStoredTitle}>
          <p>{p.whereStoredBody}</p>
        </LegalSection>
        <LegalSection title={p.leavesDeviceTitle}>
          <p>{p.leavesDeviceIntro}</p>
          <ul>
            <li>{p.leavesDeviceCsv}</li>
            <li>{p.leavesDeviceNotifications}</li>
          </ul>
        </LegalSection>
        <LegalSection title={p.analyticsTitle}>
          <p>{p.analyticsBody}</p>
        </LegalSection>
        <LegalSection title={p.deletingTitle}>
          <p>{p.deletingBody}</p>
        </LegalSection>
        <LegalSection title={p.changesTitle}>
          <p>{p.changesBody}</p>
        </LegalSection>
      </div>
    </div>
  );
}

/* ---------- Terms of Use ---------- */

export function TermsScreen() {
  const { back } = useNavigation();
  const t = useT();
  const s = t.legal.terms;
  return (
    <div className="screen">
      <ScreenHeader title={s.title} onBack={back} />
      <div className="legal">
        <p className="legal-lede">{s.lede}</p>
        <LegalSection title={s.noAdviceTitle}>
          <p>{s.noAdviceBody}</p>
        </LegalSection>
        <LegalSection title={s.noGuaranteeTitle}>
          <p>{s.noGuaranteeBody}</p>
        </LegalSection>
        <LegalSection title={s.responsibilityTitle}>
          <p>{s.responsibilityBody}</p>
        </LegalSection>
        <LegalSection title={s.serviceTitle}>
          <p>{s.serviceBody}</p>
        </LegalSection>
        <LegalSection title={s.contactTitle}>
          <p>{s.contactBody}</p>
        </LegalSection>
      </div>
    </div>
  );
}

/* ---------- Help & Support ---------- */

export function SupportScreen() {
  const { back } = useNavigation();
  const t = useT();
  const s = t.legal.support;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="screen">
      <ScreenHeader title={s.title} onBack={back} />
      <div className="legal">
        <p className="legal-lede">{s.lede}</p>
        <div className="faq">
          {s.faqs.map((f, i) => (
            <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span>{f.q}</span>
                <ChevronDown size={16} strokeWidth={2} />
              </button>
              {open === i && <p className="faq-a">{f.a}</p>}
            </div>
          ))}
        </div>

        <LegalSection title={s.stillStuckTitle}>
          <p>{s.stillStuckBody}</p>
        </LegalSection>

        <a className="btn btn-secondary btn-block" href="mailto:davidpit2008@gmail.com?subject=Flow%20support">
          <Mail size={17} strokeWidth={2} /> {s.contactSupport}
        </a>
        <a className="btn btn-secondary btn-block" href="mailto:davidpit2008@gmail.com?subject=Report%20a%20problem%20in%20Flow">
          {s.reportProblem}
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
