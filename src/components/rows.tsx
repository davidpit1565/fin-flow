import { useRef, useState, type ReactNode } from "react";
import { ChevronRight, Repeat, Trash2 } from "lucide-react";
import type { Category, CurrencyCode, Subscription, Transaction } from "../types";
import { iconByName } from "../lib/icons";
import { frequencyLabel, monthlyEquivalent } from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { shortDate } from "../lib/dates";
import { useT } from "../lib/i18n";
import { IconBadge } from "./ui";

/* ---------- swipe row ---------- */

interface SwipeRowProps {
  children: ReactNode;
  onTap?: () => void;
  onOpenChange?: (open: boolean) => void;
  leftAction?: { label: string; icon?: ReactNode; onPress: () => void; ariaLabel: string };
  rightAction?: { label: string; icon?: ReactNode; onPress: () => void; ariaLabel: string };
}

const REVEAL = 84;

export function SwipeRow({ children, onTap, onOpenChange, leftAction, rightAction }: SwipeRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const base = useRef(0);
  const dragging = useRef(false);
  const suppressTap = useRef(false);
  const [open, setOpen] = useState<"left" | "right" | null>(null);

  const applyOffset = (offset: number) => {
    if (trackRef.current) trackRef.current.style.transform = `translateX(${offset}px)`;
  };

  const snapTo = (side: "left" | "right" | null) => {
    setOpen(side);
    if (onOpenChange) onOpenChange(side !== null);
    applyOffset(side === "left" ? REVEAL : side === "right" ? -REVEAL : 0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    base.current = open === "left" ? REVEAL : open === "right" ? -REVEAL : 0;
    dragging.current = false;
    suppressTap.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!dragging.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dragging.current = true;
      suppressTap.current = true;
      document.body.style.userSelect = "none";
    }
    if (!dragging.current) return;
    const offset = Math.max(-REVEAL, Math.min(REVEAL, base.current + dx));
    applyOffset(offset);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    document.body.style.userSelect = "";
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    start.current = null;
    if (dragging.current) {
      dragging.current = false;
      const offset = base.current + dx;
      if (offset < -REVEAL / 2) snapTo("right");
      else if (offset > REVEAL / 2) snapTo("left");
      else snapTo(null);
      return;
    }
    if (!suppressTap.current && onTap) onTap();
  };

  const close = () => snapTo(null);

  const runAction = (fn: () => void) => {
    fn();
    close();
  };

  return (
    <div className="swipe-row">
      {leftAction && (
        <div className="swipe-action swipe-action-left">
          <button className="swipe-action-btn" onClick={() => runAction(leftAction.onPress)} aria-label={leftAction.ariaLabel}>
            {leftAction.icon ?? <Repeat size={18} strokeWidth={2} />}
            <span>{leftAction.label}</span>
          </button>
        </div>
      )}
      {rightAction && (
        <div className="swipe-action swipe-action-right">
          <button
            className="swipe-action-btn swipe-action-danger"
            onClick={() => runAction(rightAction.onPress)}
            aria-label={rightAction.ariaLabel}
          >
            {rightAction.icon ?? <Trash2 size={18} strokeWidth={2} />}
            <span>{rightAction.label}</span>
          </button>
        </div>
      )}
      <div
        className="swipe-track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => {
          if (dragging.current) e.preventDefault();
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- transaction row ---------- */

export function TransactionRow({
  transaction,
  category,
  currency,
  onTap,
  swipe,
}: {
  transaction: Transaction;
  category?: Category;
  currency: CurrencyCode;
  onTap?: () => void;
  swipe?: { leftAction?: SwipeRowProps["leftAction"]; rightAction?: SwipeRowProps["rightAction"] };
}) {
  const t = useT();
  const Icon = iconByName(category?.icon);
  const title = transaction.merchant || category?.name || t.transactionDetail.fallbackName;
  const subtitle = transaction.recurring
    ? `${category?.name ?? ""}${category ? " · " : ""}${t.transactionList.recurringSwipeLabel}`
    : category?.name ?? "";
  const isIncome = transaction.type === "income";
  return (
    <SwipeRow onTap={onTap} leftAction={swipe?.leftAction} rightAction={swipe?.rightAction}>
      <div className="row">
        <IconBadge icon={Icon} size="sm" />
        <div className="row-main">
          <span className="row-title">{title}</span>
          <span className="row-sub">{subtitle}</span>
        </div>
        <span className={`row-amount ${isIncome ? "income" : "expense"}`}>
          {isIncome ? "+" : "−"}
          {formatMoney(transaction.amountCents, currency)}
        </span>
        <ChevronRight className="row-chevron" size={16} strokeWidth={2} aria-hidden="true" />
      </div>
    </SwipeRow>
  );
}

/* ---------- subscription row ---------- */

export function SubscriptionRow({
  subscription,
  category,
  currency,
  onTap,
  onDelete,
}: {
  subscription: Subscription;
  category?: Category;
  currency: CurrencyCode;
  onTap?: () => void;
  onDelete?: () => void;
}) {
  const t = useT();
  const paused = subscription.status === "paused";
  const cancelled = subscription.status === "cancelled";
  const Icon = iconByName(category?.icon);
  return (
    <SwipeRow
      onTap={onTap}
      rightAction={
        onDelete
          ? {
              label: t.common.delete,
              onPress: onDelete,
              ariaLabel: `Delete ${subscription.name}`,
            }
          : undefined
      }
    >
      <div className={`row ${paused || cancelled ? "row-muted" : ""}`}>
        <IconBadge icon={Icon} size="sm" />
        <div className="row-main">
          <span className="row-title">{subscription.name}</span>
          <span className="row-sub">
            {paused ? "Paused · " : cancelled ? "Cancelled · " : ""}
            {frequencyLabel(subscription.frequency)} · next {shortDate(subscription.nextPaymentDate, { includeYear: true })}
          </span>
        </div>
        <div className="row-end">
          <span className="row-amount">{formatMoney(subscription.amountCents, currency)}</span>
          <span className="row-sub">{formatMoney(monthlyEquivalent(subscription), currency)}/mo</span>
        </div>
      </div>
    </SwipeRow>
  );
}

/* ---------- category row ---------- */

export function CategoryRow({
  category,
  spentCents,
  percent,
  currency,
  onTap,
}: {
  category: Category;
  spentCents: number;
  percent?: number;
  currency: CurrencyCode;
  onTap?: () => void;
}) {
  const Icon = iconByName(category.icon);
  return (
    <SwipeRow onTap={onTap}>
      <div className="row">
        <IconBadge icon={Icon} size="sm" />
        <div className="row-main">
          <span className="row-title">{category.name}</span>
          {percent !== undefined && <span className="row-sub">{Math.round(percent)}% of spending</span>}
        </div>
        <span className="row-amount">{formatMoney(spentCents, currency)}</span>
        <ChevronRight className="row-chevron" size={16} strokeWidth={2} aria-hidden="true" />
      </div>
    </SwipeRow>
  );
}
