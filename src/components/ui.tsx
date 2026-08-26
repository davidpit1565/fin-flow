import { ArrowLeft, X } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppContext";
import { formatMoney } from "../lib/currency";
import { parseAmountToCents } from "../lib/money";
import type { CurrencyCode } from "../types";

/* ---------- button ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "lg" | "sm";
}

export function Button({ variant = "primary", size = "md", className = "", ...rest }: ButtonProps) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...rest} />;
}

/* ---------- segmented control ---------- */

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel, className }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = rovingNextIndex(e.key, index, options.length);
    if (next === null) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className={`segmented ${className ?? ""}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          aria-selected={value === o.value}
          tabIndex={i === selectedIndex ? 0 : -1}
          className={`segmented-item ${value === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Roving-tabindex arrow-key navigation shared by Segmented and ChipGroup. */
function rovingNextIndex(key: string, index: number, length: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % length;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + length) % length;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return null;
}

/* ---------- toggle ---------- */

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`toggle ${checked ? "on" : ""} ${disabled ? "disabled" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

/* ---------- fields ---------- */

export function Field({
  label,
  children,
  hint,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function NumericInput({ cents, onCentsChange, ...rest }: { cents: number | null; onCentsChange: (c: number | null) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  // The raw string the user typed is the source of truth for what's displayed.
  // We never reformat it while they type — that's what previously corrupted input.
  const [text, setText] = useState<string>(() => (cents === null ? "" : (cents / 100).toFixed(2)));
  const lastEmitted = useRef<number | null>(cents);

  // Sync when the parent supplies a different amount (e.g. prefill for editing).
  useEffect(() => {
    if (cents !== lastEmitted.current) {
      lastEmitted.current = cents;
      setText(cents === null ? "" : (cents / 100).toFixed(2));
    }
  }, [cents]);

  return (
    <input
      className="input input-amount"
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = raw.trim() === "" ? null : parseAmountToCents(raw);
        lastEmitted.current = parsed;
        onCentsChange(parsed);
      }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" {...props} />;
}

export function DateInput({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

/* ---------- chips ---------- */

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = rovingNextIndex(e.key, index, options.length);
    if (next === null) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="chip-group" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={i === selectedIndex ? 0 : -1}
          className={`chip ${value === o.value ? "chip-active" : ""}`}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- icon badge ---------- */

export function IconBadge({
  icon: Icon,
  size = "md",
  muted = false,
}: {
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
}) {
  const px = size === "sm" ? 30 : size === "lg" ? 52 : 40;
  const iconPx = size === "sm" ? 15 : size === "lg" ? 24 : 19;
  return (
    <span className={`icon-badge ${muted ? "muted" : ""}`} style={{ width: px, height: px }} aria-hidden="true">
      <Icon size={iconPx} strokeWidth={1.8} />
    </span>
  );
}

/* ---------- progress ---------- */

export function ProgressBar({ percent, tone }: { percent: number; tone?: "ok" | "warn" | "over" }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill ${tone ?? ""}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/* ---------- empty state ---------- */

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <IconBadge icon={Icon} size="lg" muted />
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
      {action}
    </div>
  );
}

/* ---------- money ---------- */

export function Money({
  cents,
  currency,
  sign,
  amount,
  className = "",
}: {
  cents: number;
  currency: CurrencyCode;
  sign?: boolean;
  amount?: "large";
  className?: string;
}) {
  return <span className={`money ${amount === "large" ? "money-large" : ""} ${className}`}>{formatMoney(cents, currency, { sign })}</span>;
}

/* ---------- screen header ---------- */

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="screen-header">
      <div className="screen-header-left">
        {onBack && (
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
        )}
        <div>
          <h1 className="screen-title">{title}</h1>
          {subtitle && <p className="screen-subtitle">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="screen-header-right">{right}</div>}
    </header>
  );
}

/* ---------- bottom sheet ---------- */

export function Sheet({
  title,
  onClose,
  children,
  footer,
  ariaLabel,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);

    // Lock the page scroller behind the sheet. Do NOT toggle overflow on
    // <body>: the app scrolls inside `.app-scroll`, and touching body overflow
    // is what made Settings jump/reposition on iOS. Instead we swallow scroll
    // gestures that begin outside the sheet, leaving the scroller's position
    // untouched so the user stays exactly where they were.
    const scroller = document.querySelector<HTMLElement>(".app-scroll");
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevTop = scroller ? scroller.scrollTop : 0;

    const preventScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && ref.current && ref.current.contains(target)) return;
      e.preventDefault();
    };
    if (scroller) {
      scroller.addEventListener("wheel", preventScroll, { passive: false });
      scroller.addEventListener("touchmove", preventScroll, { passive: false });
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      if (scroller) {
        scroller.removeEventListener("wheel", preventScroll);
        scroller.removeEventListener("touchmove", preventScroll);
        // When a focused element inside the sheet is removed, the browser
        // scrolls `.app-scroll` to reveal it (often to the very bottom). Undo
        // that synchronously (before paint) so the page stays put.
        if (scroller.scrollTop !== prevTop) scroller.scrollTop = prevTop;
      }
      // Restore keyboard focus to whatever was focused before the sheet
      // opened, without triggering another scroll.
      if (prevFocus && typeof prevFocus.focus === "function" && prevFocus.isConnected) {
        prevFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  // Render into <body> so the fixed backdrop/sheet are positioned against the
  // viewport. Sheets are sometimes mounted inside `.screen-anim`, whose
  // transform animation turns `position: fixed` into viewport-*relative*
  // (anchoring the sheet to the bottom of the scroll content instead of the
  // screen) — the bug where the currency picker opened below the viewport.
  return createPortal(
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={ariaLabel ?? title} ref={ref}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ---------- section ---------- */

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section-head">
          {title && <h2 className="section-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className = "", onClick, ariaLabel }: { children: ReactNode; className?: string; onClick?: () => void; ariaLabel?: string }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp className={`card ${onClick ? "card-pressable" : ""} ${className}`} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Comp>
  );
}

/* ---------- error text ---------- */

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

/* ---------- misc ---------- */

export function ToastPlaceholder() {
  return null;
}

export function useVibrationSuccess() {
  const { haptic } = useApp();
  return haptic;
}
