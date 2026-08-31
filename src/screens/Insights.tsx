import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import {
  buildMonthlySummary,
  categoryTotals,
  currentMonthRange,
  largestTransaction,
  lastMonthRange,
  lastNDaysRange,
  spendingSeries,
  subscriptionMonthlyTotal,
  subscriptionSpendInRange,
  subscriptionYearlyTotal,
} from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { CHART_COLORS, CategoryDonut, SpendingChart } from "../components/charts";
import { Card, EmptyState, Money, ProgressBar, ScreenHeader, Segmented } from "../components/ui";
import { monthLabelISO } from "../lib/dates";
import {
  computeFinancialHealthScore,
  detectSpendingAnomalies,
  detectUnusedSubscriptions,
  generateMonthlyNarrative,
  type HealthFactor,
} from "../lib/insights";

/** Max points each health factor can contribute -- mirrors the weights
 *  documented in src/lib/insights.ts, used here only to size the bars. */
const HEALTH_FACTOR_MAX: Record<string, number> = {
  "Savings rate": 40,
  "Budget adherence": 35,
  "Subscription load": 25,
};

function factorPercent(factor: HealthFactor): number {
  const max = HEALTH_FACTOR_MAX[factor.label] ?? 100;
  return max > 0 ? (factor.contribution / max) * 100 : 0;
}

type RangeKey = "7d" | "1m" | "3m" | "6m" | "12m";

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "12m", label: "12M" },
];

export function Insights() {
  const { settings, transactions, subscriptions, categories, budgets } = useApp();
  const { push } = useNavigation();
  const [rangeKey, setRangeKey] = useState<RangeKey>("1m");

  if (!settings) return null;
  const { currency } = settings;

  const range = useMemo(() => {
    switch (rangeKey) {
      case "7d":
        return lastNDaysRange(7);
      case "3m":
        return lastNDaysRange(90);
      case "6m":
        return lastNDaysRange(180);
      case "12m":
        return lastNDaysRange(365);
      default:
        return currentMonthRange();
    }
  }, [rangeKey]);

  const series = useMemo(() => spendingSeries(transactions, range), [transactions, range]);
  const totalSpent = series.reduce((s, p) => s + p.cents, 0);
  const donut = useMemo(() => {
    const totals = categoryTotals(transactions, categories, range, 6);
    return {
      items: totals.map((t, i) => ({
        name: t.category.name,
        value: t.spentCents / 100,
        cents: t.spentCents,
        percent: t.percent,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      top: totals[0] ?? null,
    };
  }, [transactions, categories, range]);

  const now = new Date();
  const thisMonth = buildMonthlySummary(transactions, categories, now.getFullYear(), now.getMonth());
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevSummary = buildMonthlySummary(transactions, categories, prevMonth.getFullYear(), prevMonth.getMonth());

  const thisMonthSubs = subscriptionSpendInRange(transactions, currentMonthRange());
  const prevRange = lastMonthRange();
  const prevMonthSubs = subscriptionSpendInRange(transactions, prevRange);
  const subDelta = thisMonthSubs - prevMonthSubs;

  const largest = largestTransaction(transactions, currentMonthRange());
  const monthlySubs = subscriptionMonthlyTotal(subscriptions);
  const yearlySubs = subscriptionYearlyTotal(subscriptions);

  const isEmpty = transactions.length === 0 && subscriptions.length === 0;

  // Derived on-device "AI Insights" -- pure computation over the data
  // already loaded above, nothing fetched or invented.
  const health = useMemo(
    () => computeFinancialHealthScore(transactions, subscriptions, budgets),
    [transactions, subscriptions, budgets]
  );
  const narrative = useMemo(
    () => generateMonthlyNarrative(transactions, subscriptions, categories, budgets),
    [transactions, subscriptions, categories, budgets]
  );
  const unusedSubs = useMemo(() => detectUnusedSubscriptions(subscriptions), [subscriptions]);
  const anomalies = useMemo(() => detectSpendingAnomalies(transactions, categories), [transactions, categories]);

  return (
    <div className="screen">
      <ScreenHeader
        title="Insights"
        right={
          <button className="icon-btn" aria-label="Settings" onClick={() => push({ tab: "settings", name: "settings" })}>
            <SettingsIcon size={20} strokeWidth={2} />
          </button>
        }
      />

      {isEmpty ? (
        <div className="screen-empty">
          <EmptyState
            icon={BarChart3}
            title="Insights will appear here"
            message="Add a few transactions to start seeing your spending patterns."
          />
        </div>
      ) : (
        <>
          {/* financial health score */}
          <Card className="insight-card health-card">
            <div className="health-card-head">
              <div>
                <p className="spend-label">Financial health</p>
                <span className="health-score">{health.score}</span>
              </div>
              <span className={`health-tier health-tier-${health.tier.replace(/\s+/g, "-")}`}>{health.tier}</span>
            </div>
            <ul className="health-factors">
              {health.factors.map((f) => (
                <li key={f.label}>
                  <div className="health-factor-row">
                    <span className="stat-label">{f.label}</span>
                    <span className="row-sub">{Math.round(f.contribution)} pts</span>
                  </div>
                  <ProgressBar percent={factorPercent(f)} />
                </li>
              ))}
            </ul>
          </Card>

          {/* monthly narrative */}
          <Card className="insight-card">
            <p className="spend-label">This month</p>
            <ul className="narrative-list">
              {narrative.map((sentence, i) => (
                <li key={i}>{sentence}</li>
              ))}
            </ul>
          </Card>

          {/* unused subscriptions callout */}
          {unusedSubs.length > 0 && (
            <Card className="insight-card callout-card">
              <p className="spend-label">Unused subscriptions</p>
              <ul className="callout-list">
                {unusedSubs.map((u) => (
                  <li key={u.subscription.id} className="callout-item">
                    <span>{u.subscription.name}</span>
                    <span className="row-sub negative">
                      {formatMoney(u.potentialSavingsCents, currency)}/mo
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* spending anomalies callout */}
          {anomalies.length > 0 && (
            <Card className="insight-card callout-card">
              <p className="spend-label">Worth a look</p>
              <ul className="callout-list">
                {anomalies.map((a) => (
                  <li key={a.category.id} className="callout-item anomaly-item">
                    <span>{a.category.name}</span>
                    <span className="row-sub negative">+{Math.round(a.percentIncrease)}% vs usual</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="insights-range">
            <Segmented options={RANGES} value={rangeKey} onChange={setRangeKey} ariaLabel="Chart time range" />
          </div>

          <Card className="chart-card">
            <div className="chart-card-head">
              <div>
                <p className="spend-label">Spending</p>
                <Money cents={totalSpent} currency={currency} amount="large" />
              </div>
              <span className="row-sub">{range.label}</span>
            </div>
            <SpendingChart data={series} currency={currency} kind={rangeKey === "7d" ? "bar" : "area"} />
            <p className="sr-only">
              Spending chart: {series.map((p) => `${p.label}: ${formatMoney(p.cents, currency)}`).join(", ")}.
            </p>
          </Card>

          {donut.items.length > 0 && (
            <Card className="chart-card">
              <p className="spend-label">By category</p>
              <CategoryDonut data={donut.items.map((d) => ({ name: d.name, value: d.value }))} currency={currency} centerLabel="Spending" />
              <ul className="donut-legend">
                {donut.items.map((d) => (
                  <li key={d.name}>
                    <span className="donut-legend-swatch" style={{ background: d.color }} aria-hidden="true" />
                    <span className="donut-legend-name">{d.name}</span>
                    <span className="donut-legend-value">
                      {formatMoney(d.cents, currency)} · {Math.round(d.percent)}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="sr-only">
                Category breakdown: {donut.items.map((d) => `${d.name} ${formatMoney(d.cents, currency)}`).join(", ")}.
              </p>
            </Card>
          )}

          {/* month comparison */}
          {thisMonth.spentCents > 0 || prevSummary.spentCents > 0 ? (
            <Card className="insight-card">
              <div className="insight-card-row">
                <div className="insight-month">
                  <span className="stat-label">{monthLabelISO(thisMonthRangeStart())}</span>
                  <span className="insight-amount">{formatMoney(thisMonth.spentCents, currency)}</span>
                </div>
                <div className="insight-month">
                  <span className="stat-label">{monthLabelISO(prevMonthRangeStart())}</span>
                  <span className="insight-amount">{formatMoney(prevSummary.spentCents, currency)}</span>
                </div>
              </div>
              {thisMonth.vsPreviousPercent !== null && (
                <p className={`spend-compare ${thisMonth.vsPreviousPercent <= 0 ? "positive" : "negative"}`}>
                  {thisMonth.vsPreviousPercent <= 0 ? (
                    <ArrowDownRight size={16} strokeWidth={2.2} />
                  ) : (
                    <ArrowUpRight size={16} strokeWidth={2.2} />
                  )}
                  You spent {formatMoney(Math.abs(thisMonth.spentCents - prevSummary.spentCents), currency)}{" "}
                  {thisMonth.vsPreviousPercent <= 0 ? "less" : "more"} this month
                </p>
              )}
            </Card>
          ) : null}

          {/* subscription spending */}
          <Card className="insight-card">
            <p className="spend-label">Subscriptions</p>
            <div className="equiv-row">
              <div className="equiv-cell">
                <span className="stat-label">Current monthly</span>
                <span className="equiv-value">{formatMoney(monthlySubs, currency)}</span>
              </div>
              <div className="equiv-cell">
                <span className="stat-label">Current yearly</span>
                <span className="equiv-value">{formatMoney(yearlySubs, currency)}</span>
              </div>
            </div>
            <p className={`spend-compare ${subDelta <= 0 ? "positive" : "negative"}`}>
              {subDelta <= 0 ? <ArrowDownRight size={16} strokeWidth={2.2} /> : <ArrowUpRight size={16} strokeWidth={2.2} />}
              {formatMoney(Math.abs(subDelta), currency)} {subDelta <= 0 ? "less" : "more"} on subscriptions this month than last
            </p>
          </Card>

          {/* highlights */}
          <div className="insight-grid">
            {donut.top && (
              <Card className="insight-tile">
                <span className="stat-label">Top category</span>
                <span className="insight-tile-title">{donut.top.category.name}</span>
                <span className="insight-tile-value">{formatMoney(donut.top.spentCents, currency)}</span>
              </Card>
            )}
            {largest && (
              <Card className="insight-tile">
                <span className="stat-label">Largest transaction</span>
                <span className="insight-tile-title">{largest.merchant || "—"}</span>
                <span className="insight-tile-value">{formatMoney(largest.amountCents, currency)}</span>
              </Card>
            )}
          </div>

          <p className="insights-footnote">
            All insights are calculated from the transactions and subscriptions you record.
          </p>
        </>
      )}
    </div>
  );

  function thisMonthRangeStart(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  function prevMonthRangeStart(): string {
    const d = new Date();
    const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-01`;
  }
}
