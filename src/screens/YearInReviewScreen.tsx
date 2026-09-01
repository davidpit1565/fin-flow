import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { categoryDisplayName, useT } from "../lib/i18n";
import { buildYearInReview } from "../lib/yearInReview";
import { formatMoney } from "../lib/currency";
import { shortDate } from "../lib/dates";
import { Card, EmptyState, Money, ScreenHeader } from "../components/ui";

export function YearInReviewScreen() {
  const { settings, transactions, subscriptions, categories } = useApp();
  const { back } = useNavigation();
  const t = useT();
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
      <ScreenHeader title={t.yearInReview.title} subtitle={t.yearInReview.subtitle} onBack={back} />

      <div className="year-picker">
        <button
          className="icon-btn"
          aria-label={t.yearInReview.previousYearAria}
          onClick={() => setYear((y) => Math.max(minYear, y - 1))}
          disabled={year <= minYear}
        >
          <ChevronLeft size={20} strokeWidth={2} className="icon-directional" />
        </button>
        <span className="year-picker-value">{year}</span>
        <button
          className="icon-btn"
          aria-label={t.yearInReview.nextYearAria}
          onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
          disabled={year >= currentYear}
        >
          <ChevronRight size={20} strokeWidth={2} className="icon-directional" />
        </button>
      </div>

      {isEmpty ? (
        <div className="screen-empty">
          <EmptyState icon={PartyPopper} title={t.yearInReview.emptyTitle} message={t.yearInReview.emptyMessage(year)} />
        </div>
      ) : (
        <>
          <Card className="wrapped-hero">
            <p className="spend-label">{t.yearInReview.yearInNumbers(year)}</p>
            <Money cents={review.totalSpentCents} currency={currency} amount="large" />
            <p className="wrapped-hero-sub">{t.yearInReview.spentAcrossTransactions(review.expenseCount)}</p>
          </Card>

          <Card className="insight-card">
            <p className="spend-label">{t.yearInReview.incomeSpendingSavingsTitle}</p>
            <div className="equiv-row">
              <div className="equiv-cell">
                <span className="stat-label">{t.yearInReview.incomeLabel}</span>
                <span className="equiv-value">{formatMoney(review.totalIncomeCents, currency)}</span>
              </div>
              <div className="equiv-cell">
                <span className="stat-label">{t.yearInReview.spentLabel}</span>
                <span className="equiv-value">{formatMoney(review.totalSpentCents, currency)}</span>
              </div>
            </div>
            <p className={`spend-compare ${review.netSavedCents >= 0 ? "positive" : "negative"}`}>
              {review.netSavedCents >= 0
                ? t.yearInReview.savedNet(formatMoney(review.netSavedCents, currency), year)
                : t.yearInReview.spentMoreThanEarned(formatMoney(Math.abs(review.netSavedCents), currency), year)}
            </p>
          </Card>

          {review.topCategory && (
            <Card className="insight-tile">
              <span className="stat-label">{t.yearInReview.topCategoryLabel}</span>
              <span className="insight-tile-title">{categoryDisplayName(t, review.topCategory.category)}</span>
              <span className="insight-tile-value">
                {t.yearInReview.topCategoryValue(formatMoney(review.topCategory.spentCents, currency), topSharePercent)}
              </span>
            </Card>
          )}

          {review.biggestExpense && (
            <Card className="insight-tile">
              <span className="stat-label">{t.yearInReview.biggestExpenseLabel}</span>
              <span className="insight-tile-title">{review.biggestExpense.merchant || "—"}</span>
              <span className="insight-tile-value">
                {formatMoney(review.biggestExpense.amountCents, currency)} ·{" "}
                {shortDate(review.biggestExpense.date, { format: settings.dateFormat })}
              </span>
            </Card>
          )}

          {review.busiestMonth && (
            <Card className="insight-tile">
              <span className="stat-label">{t.yearInReview.busiestMonthLabel}</span>
              <span className="insight-tile-title">{review.busiestMonth.label}</span>
              <span className="insight-tile-value">{t.yearInReview.busiestMonthValue(formatMoney(review.busiestMonth.spentCents, currency))}</span>
            </Card>
          )}

          <Card className="insight-card">
            <p className="spend-label">{t.yearInReview.subscriptionsLabel}</p>
            <div className="equiv-row" style={{ borderBottom: "none" }}>
              <div className="equiv-cell">
                <span className="stat-label">{t.yearInReview.currentYearlyTotalLabel}</span>
                <span className="equiv-value">{formatMoney(review.subscriptionTotalCents, currency)}</span>
              </div>
            </div>
          </Card>

          <p className="insights-footnote">{t.yearInReview.footnote(year)}</p>
        </>
      )}
    </div>
  );
}
