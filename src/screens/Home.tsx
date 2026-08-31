import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Plus, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { useT } from "../lib/i18n";
import {
  activeSubscriptions,
  categoryTotals,
  currentMonthRange,
  lastMonthRange,
  lastNDaysRange,
  spendingWithComparison,
  subscriptionMonthlyTotal,
  upcomingPayments,
  upcomingTotalCents,
  yearRange,
  expensesInRange,
  incomeInRange,
  budgetStatus,
  monthlyEquivalent,
} from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { iconByName } from "../lib/icons";
import { Card, IconBadge, Money, ProgressBar, Segmented } from "../components/ui";
import { CategoryRow } from "../components/rows";
import { EmptyState } from "../components/ui";

type Period = "month" | "last" | "3m" | "year";

export function Home({ onAdd }: { onAdd: () => void }) {
  const { settings, transactions, subscriptions, categories, budgets } = useApp();
  const { push } = useNavigation();
  const t = useT();
  const [period, setPeriod] = useState<Period>("month");

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t.home.greetingMorning : hour < 18 ? t.home.greetingAfternoon : t.home.greetingEvening;

  const range = useMemo(() => {
    switch (period) {
      case "last":
        return lastMonthRange();
      case "3m":
        return lastNDaysRange(90);
      case "year":
        return yearRange();
      default:
        return currentMonthRange();
    }
  }, [period]);

  if (!settings) return null;
  const { currency } = settings;

  const spend = useMemo(() => spendingWithComparison(transactions, range), [transactions, range]);
  const income = useMemo(() => incomeInRange(transactions, range), [transactions, range]);
  const expenses = useMemo(() => expensesInRange(transactions, range), [transactions, range]);
  const remaining = income - expenses;
  const monthRange = useMemo(() => currentMonthRange(), []);
  const monthExpenses = expensesInRange(transactions, monthRange);

  const subMonthly = subscriptionMonthlyTotal(subscriptions);
  const upcoming = upcomingPayments(subscriptions, t, settings.dateFormat);
  const upcomingTotal = upcomingTotalCents(subscriptions);

  const categoriesThisMonth = useMemo(
    () => categoryTotals(transactions, categories, monthRange, 5),
    [transactions, categories, monthRange]
  );

  const overallBudget = budgets.find((b) => b.categoryId === null);
  const overallPeriod = overallBudget?.period ?? "monthly";
  const overallStatus = overallBudget && settings ? budgetStatus(overallBudget, transactions, undefined, settings.startWeekOn) : null;

  const savingsCandidates = useMemo(
    () => activeSubscriptions(subscriptions).filter((s) => s.usage === "rarely" || s.usage === "unused"),
    [subscriptions]
  );

  const totalTransactions = transactions.length;

  const comparisonText = useMemo(() => {
    if (spend.percent === null) return null;
    const lower = spend.change < 0;
    return {
      lower,
      text: t.home.comparedToPrevious(formatMoney(Math.abs(spend.change), currency), lower),
    };
  }, [spend, currency, t]);

  const budgetCopy = useMemo(() => {
    if (!overallStatus) return null;
    const { percent, level, remainingCents } = overallStatus;
    if (level === "over") {
      return {
        tone: "over" as const,
        text: t.home.budgetExceeded(overallPeriod, formatMoney(-remainingCents, currency)),
      };
    }
    if (level === "reached") return { tone: "over" as const, text: t.home.budgetReached(overallPeriod) };
    if (level === "high") return { tone: "warn" as const, text: t.home.budgetHigh(overallPeriod, Math.round(percent)) };
    if (level === "close") return { tone: "warn" as const, text: t.home.budgetClose(overallPeriod) };
    return { tone: "ok" as const, text: t.home.budgetRemaining(overallPeriod, formatMoney(remainingCents, currency)) };
  }, [overallStatus, currency, overallPeriod, t]);

  const empty = totalTransactions === 0 && subscriptions.length === 0 && budgets.length === 0;

  return (
    <div className="screen">
      <header className="home-header">
        <div>
          <p className="home-greeting">{greeting}</p>
          <h1 className="home-title">{t.home.title}</h1>
        </div>
        <button
          className="icon-btn"
          aria-label={t.home.settingsAriaLabel}
          onClick={() => push({ tab: "settings", name: "settings" })}
        >
          <SettingsIcon size={20} strokeWidth={2} />
        </button>
      </header>

      {empty ? (
        <div className="home-empty">
          <EmptyState
            icon={Sparkles}
            title={t.home.emptyTitle}
            message={t.home.emptyMessage}
            action={
              <button className="btn btn-primary btn-lg" onClick={onAdd}>
                <Plus size={18} strokeWidth={2} /> {t.home.addExpense}
              </button>
            }
          />
        </div>
      ) : (
        <div className="home-grid">
        <div className="home-col-main">
          {/* primary spending card */}
          <Card className="spend-card">
            <div className="spend-card-top">
              <div>
                <p className="spend-label">{t.home.spentLabel(period)}</p>
                <Money cents={spend.spent} currency={currency} amount="large" />
              </div>
            </div>
            <Segmented
              className="segmented-full"
              options={[
                { value: "month", label: t.home.periodOptionMonth },
                { value: "last", label: t.home.periodOptionLast },
                { value: "3m", label: t.home.periodOption3m },
                { value: "year", label: t.home.periodOptionYear },
              ]}
              value={period}
              onChange={setPeriod}
              ariaLabel={t.home.spendingPeriodAriaLabel}
            />
            {comparisonText && (
              <p className={`spend-compare ${comparisonText.lower ? "positive" : "negative"}`}>
                {comparisonText.lower ? (
                  <ArrowDownRight size={16} strokeWidth={2.2} />
                ) : (
                  <ArrowUpRight size={16} strokeWidth={2.2} />
                )}
                {comparisonText.text}
              </p>
            )}
            {(income > 0 || expenses > 0) && (
              <div className="spend-strip">
                <div className="spend-strip-item">
                  <span className="spend-strip-label">{t.home.income}</span>
                  <span className="spend-strip-value">{formatMoney(income, currency)}</span>
                </div>
                <div className="spend-strip-item">
                  <span className="spend-strip-label">{t.home.expenses}</span>
                  <span className="spend-strip-value">{formatMoney(expenses, currency)}</span>
                </div>
                <div className="spend-strip-item">
                  <span className="spend-strip-label">{t.home.remaining}</span>
                  <span className={`spend-strip-value ${remaining < 0 ? "negative" : ""}`}>{formatMoney(remaining, currency)}</span>
                </div>
              </div>
            )}
          </Card>

          {/* quick summary */}
          <div className="stat-grid">
            <Card className="stat-tile">
              <span className="stat-label">{t.home.expenses}</span>
              <span className="stat-value">{formatMoney(monthExpenses, currency)}</span>
            </Card>
            <Card className="stat-tile">
              <span className="stat-label">{t.home.subscriptions}</span>
              <span className="stat-value">{t.home.perMonth(formatMoney(subMonthly, currency))}</span>
            </Card>
            <Card className="stat-tile">
              <span className="stat-label">{t.home.upcoming}</span>
              <span className="stat-value">{formatMoney(upcomingTotal, currency)}</span>
            </Card>
          </div>

          {/* coming up */}
          <section className="section">
            <div className="section-head">
              <h2 className="section-title">{t.home.comingUp}</h2>
              <button
                className="section-action"
                onClick={() => push({ tab: "subscriptions", name: "root" })}
              >
                {t.home.viewAll} <ChevronRight size={14} strokeWidth={2.2} className="icon-directional" />
              </button>
            </div>
            {upcoming.length === 0 ? (
              <Card className="card-soft">
                <p className="card-soft-text">
                  {t.home.noUpcomingPayments}{" "}
                  <button className="link" onClick={() => push({ tab: "subscriptions", name: "root" })}>
                    {t.home.addSubscriptionLink}
                  </button>{" "}
                  {t.home.toSeeThemHere}
                </p>
              </Card>
            ) : (
              <Card className="coming-up">
                {upcoming.slice(0, 6).map((u) => {
                  const Icon = iconByName(categories.find((c) => c.id === u.subscription.categoryId)?.icon);
                  return (
                    <button
                      key={u.subscription.id}
                      className="coming-row"
                      onClick={() => push({ tab: "subscriptions", name: "detail", subscriptionId: u.subscription.id })}
                    >
                      <IconBadge icon={Icon} size="sm" />
                      <div className="coming-main">
                        <span className="row-title">{u.subscription.name}</span>
                        <span className="row-sub">{t.home.every(u.subscription.frequency)}</span>
                      </div>
                      <div className="coming-end">
                        <span className="row-amount">{formatMoney(u.amountCents, currency)}</span>
                        <span className="row-sub">{u.label}</span>
                      </div>
                      <ChevronRight className="row-chevron" size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  );
                })}
              </Card>
            )}
          </section>
        </div>

        <div className="home-col-side">
          {/* where your money goes */}
          {categoriesThisMonth.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">{t.home.whereYourMoneyGoes}</h2>
              </div>
              <Card className="category-list">
                {categoriesThisMonth.map((c) => (
                  <CategoryRow
                    key={c.category.id}
                    category={c.category}
                    spentCents={c.spentCents}
                    percent={c.percent}
                    currency={currency}
                    onTap={() => push({ tab: "home", name: "category", categoryId: c.category.id })}
                  />
                ))}
              </Card>
            </section>
          )}

          {/* budget status */}
          {overallBudget && overallStatus ? (
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">{t.home.budgetSectionTitle(overallPeriod)}</h2>
                <button className="section-action" onClick={() => push({ tab: "settings", name: "budgets" })}>
                  {t.home.manage} <ChevronRight size={14} strokeWidth={2.2} className="icon-directional" />
                </button>
              </div>
              <Card className="budget-card">
                <div className="budget-row">
                  <span className="row-title">
                    {formatMoney(overallStatus.spentCents, currency)} <span className="row-sub">/ {formatMoney(overallBudget.amountCents, currency)}</span>
                  </span>
                  <span className="row-sub">{Math.round(overallStatus.percent)}%</span>
                </div>
                <ProgressBar percent={overallStatus.percent} tone={budgetCopy?.tone === "over" ? "over" : budgetCopy?.tone === "warn" ? "warn" : "ok"} />
                {budgetCopy && <p className={`budget-msg ${budgetCopy.tone}`}>{budgetCopy.text}</p>}
              </Card>
            </section>
          ) : (
            <section className="section">
              <Card className="card-soft">
                <p className="card-soft-text">
                  {t.home.setBudgetPrompt}{" "}
                  <button className="link" onClick={() => push({ tab: "settings", name: "budgets" })}>
                    {t.home.setBudgetLink}
                  </button>
                </p>
              </Card>
            </section>
          )}

          {/* potential savings */}
          {activeSubscriptions(subscriptions).length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">{t.home.potentialSavings}</h2>
              </div>
              <Card className="savings-card">
                <div className="savings-head">
                  <IconBadge icon={Sparkles} size="sm" />
                  <p className="savings-text">
                    {t.home.currentlySpendPrefix}{" "}
                    <strong>{t.home.currentlySpendAmount(formatMoney(subMonthly, currency))}</strong>
                    {t.home.currentlySpendSuffix}
                  </p>
                </div>
                {savingsCandidates.length > 0 && (
                  <>
                    <p className="savings-estimate">
                      {t.home.savingsEstimatePrefix}{" "}
                      <strong>
                        {t.home.savingsEstimateAmount(
                          formatMoney(
                            savingsCandidates.reduce((s, sub) => s + monthlyEquivalent(sub), 0),
                            currency
                          )
                        )}
                      </strong>
                      {t.home.savingsEstimateSuffix}
                    </p>
                    <ul className="savings-list">
                      {savingsCandidates.slice(0, 4).map((s) => (
                        <li key={s.id}>
                          <span>{s.name}</span>
                          <span className="row-sub">{s.usage === "unused" ? t.home.unused : t.home.rarelyUsed}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </section>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
