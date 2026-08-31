import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { buildYearInReview } from "../lib/yearInReview";
import { formatMoney } from "../lib/currency";
import { shortDate } from "../lib/dates";
import { Card, EmptyState, Money, ScreenHeader } from "../components/ui";

export function YearInReviewScreen() {
  const { settings, transactions, subscriptions, categories } = useApp();
  const { back } = useNavigation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // Earliest year worth letting the user page back to -- the oldest
  // transaction on file, or just the current year when there's no history
  // yet. Capped a few years back regardless, since there's nothing useful
  // to show before Flow had any data.
  const minYear = useMemo(() => {
    let earliest = currentYear;
    for (const t of transactions) {
      const y = Number(t.date.slice(0, 4));
      if (Number.isFinite(y) && y < earliest) earliest = y;
    }
    return Math.max(earliest, currentYear - 10);
  }, [transactions, currentYear]);

  const review = useMemo(
    () => buildYearInReview(year, transactions, subscriptions, categories),
    [year, transactions, subscriptions, categories]
  );

  if (!settings) return null;
  const { currency } = settings;
  const isEmpty = review.transactionCount === 0;
  const topSharePercent =
    review.topCategory && review.totalSpentCents > 0
      ? Math.round((review.topCategory.spentCents / review.totalSpentCents) * 100)
      : 0;

  return (
    <div className="screen">
      <ScreenHeader title="Year in review" subtitle="A recap of your finances, built from what's on your device" onBack={back} />

      <div className="year-picker">
        <button
          className="icon-btn"
          aria-label="Previous year"
          onClick={() => setYear((y) => Math.max(minYear, y - 1))}
          disabled={year <= minYear}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <span className="year-picker-value">{year}</span>
        <button
          className="icon-btn"
          aria-label="Next year"
          onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
          disabled={year >= currentYear}
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>

      {isEmpty ? (
        <div className="screen-empty">
          <EmptyState
            icon={PartyPopper}
            title="Nothing to look back on yet"
            message={`No transactions yet in ${year}. Add a few and your ${year} recap will appear here.`}
          />
        </div>
      ) : (
        <>
          <Card className="wrapped-hero">
            <p className="spend-label">Your {year} in numbers</p>
            <Money cents={review.totalSpentCents} currency={currency} amount="large" />
            <p className="wrapped-hero-sub">
              spent across {review.transactionCount} transaction{review.transactionCount === 1 ? "" : "s"}
            </p>
          </Card>

          <Card className="insight-card">
            <p className="spend-label">Income, spending &amp; savings</p>
            <div className="equiv-row">
              <div className="equiv-cell">
                <span className="stat-label">Income</span>
                <span className="equiv-value">{formatMoney(review.totalIncomeCents, currency)}</span>
              </div>
              <div className="equiv-cell">
                <span className="stat-label">Spent</span>
                <span className="equiv-value">{formatMoney(review.totalSpentCents, currency)}</span>
              </div>
            </div>
            <p className={`spend-compare ${review.netSavedCents >= 0 ? "positive" : "negative"}`}>
              {review.netSavedCents >= 0
                ? `You saved ${formatMoney(review.netSavedCents, currency)} net in ${year}`
                : `You spent ${formatMoney(Math.abs(review.netSavedCents), currency)} more than you earned in ${year}`}
            </p>
          </Card>

          {review.topCategory && (
            <Card className="insight-tile">
              <span className="stat-label">Top category</span>
              <span className="insight-tile-title">{review.topCategory.category.name}</span>
              <span className="insight-tile-value">
                {formatMoney(review.topCategory.spentCents, currency)} · {topSharePercent}% of your spending
              </span>
            </Card>
          )}

          {review.biggestExpense && (
            <Card className="insight-tile">
              <span className="stat-label">Biggest single expense</span>
              <span className="insight-tile-title">{review.biggestExpense.merchant || "—"}</span>
              <span className="insight-tile-value">
                {formatMoney(review.biggestExpense.amountCents, currency)} · {shortDate(review.biggestExpense.date)}
              </span>
            </Card>
          )}

          {review.busiestMonth && (
            <Card className="insight-tile">
              <span className="stat-label">Busiest month</span>
              <span className="insight-tile-title">{review.busiestMonth.label}</span>
              <span className="insight-tile-value">{formatMoney(review.busiestMonth.spentCents, currency)} spent</span>
            </Card>
          )}

          <Card className="insight-card">
            <p className="spend-label">Subscriptions</p>
            <div className="equiv-row" style={{ borderBottom: "none" }}>
              <div className="equiv-cell">
                <span className="stat-label">Current yearly total</span>
                <span className="equiv-value">{formatMoney(review.subscriptionTotalCents, currency)}</span>
              </div>
            </div>
          </Card>

          <p className="insights-footnote">
            Your {year} recap is calculated entirely from the transactions and subscriptions on this device.
          </p>
        </>
      )}
    </div>
  );
}
