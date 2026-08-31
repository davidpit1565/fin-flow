import { useMemo, useState } from "react";
import { ArrowDownUp, Plus, Search, Settings as SettingsIcon, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { categoryDisplayName, useT } from "../lib/i18n";
import { Button, ChipGroup, DateInput, EmptyState, Field, NumericInput, ScreenHeader, Sheet } from "../components/ui";
import { TransactionList } from "../components/TransactionList";

type FilterType = "all" | "expense" | "income" | "recurring";
type SortKey = "newest" | "oldest" | "highest" | "lowest" | "alpha";

const SORT_KEYS: SortKey[] = ["newest", "oldest", "highest", "lowest", "alpha"];

function loadSort(): SortKey {
  try {
    const v = localStorage.getItem("flow-sort");
    if (v && SORT_KEYS.includes(v as SortKey)) return v as SortKey;
  } catch {
    /* ignore */
  }
  return "newest";
}

export function Transactions({ onAdd }: { onAdd: () => void }) {
  const t = useT();
  const { settings, transactions, categories } = useApp();
  const { push } = useNavigation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortKey>(loadSort);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [minCents, setMinCents] = useState<number | null>(null);
  const [maxCents, setMaxCents] = useState<number | null>(null);

  if (!settings) return null;

  const FILTERS: { value: FilterType; label: string }[] = [
    { value: "all", label: t.transactions.filterAll },
    { value: "expense", label: t.transactions.filterExpenses },
    { value: "income", label: t.transactions.filterIncome },
    { value: "recurring", label: t.transactions.filterRecurring },
  ];

  const SORT_LABELS: Record<SortKey, string> = {
    newest: t.transactions.sortNewest,
    oldest: t.transactions.sortOldest,
    highest: t.transactions.sortHighest,
    lowest: t.transactions.sortLowest,
    alpha: t.transactions.sortAlpha,
  };

  const nextSort = (current: SortKey): SortKey => {
    const idx = SORT_KEYS.indexOf(current);
    return SORT_KEYS[(idx + 1) % SORT_KEYS.length];
  };

  const hasActiveFilters = dateFrom !== "" || dateTo !== "" || categoryId !== null || minCents !== null || maxCents !== null;

  const filtered = useMemo(() => {
    let list = transactions;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((tx) => {
        const category = categories.find((c) => c.id === tx.categoryId);
        return (
          tx.merchant.toLowerCase().includes(q) ||
          (category ? categoryDisplayName(t, category) : "").toLowerCase().includes(q) ||
          tx.notes.toLowerCase().includes(q)
        );
      });
    }
    if (filter === "expense") list = list.filter((tx) => tx.type === "expense");
    else if (filter === "income") list = list.filter((tx) => tx.type === "income");
    else if (filter === "recurring") list = list.filter((tx) => tx.recurring);

    if (dateFrom) list = list.filter((tx) => tx.date >= dateFrom);
    if (dateTo) list = list.filter((tx) => tx.date <= dateTo);
    if (categoryId) list = list.filter((tx) => tx.categoryId === categoryId);
    if (minCents !== null) list = list.filter((tx) => tx.amountCents >= minCents);
    if (maxCents !== null) list = list.filter((tx) => tx.amountCents <= maxCents);

    const sorted = [...list];
    switch (sort) {
      case "oldest":
        sorted.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt));
        break;
      case "highest":
        sorted.sort((a, b) => b.amountCents - a.amountCents);
        break;
      case "lowest":
        sorted.sort((a, b) => a.amountCents - b.amountCents);
        break;
      case "alpha":
        sorted.sort((a, b) => (a.merchant || a.categoryId).localeCompare(b.merchant || b.categoryId));
        break;
      default:
        sorted.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
    }
    return sorted;
  }, [transactions, query, filter, sort, dateFrom, dateTo, categoryId, minCents, maxCents, categories, t]);

  const changeSort = (s: SortKey) => {
    setSort(s);
    try {
      localStorage.setItem("flow-sort", s);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t.transactions.title}
        right={
          <button className="icon-btn" aria-label={t.transactions.settingsButton} onClick={() => push({ tab: "settings", name: "settings" })}>
            <SettingsIcon size={20} strokeWidth={2} />
          </button>
        }
      />

      <div className="search-row">
        <div className="search-box">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            className="search-input"
            placeholder={t.transactions.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.transactions.searchPlaceholder}
          />
          {query && (
            <button className="search-clear" aria-label={t.transactions.clearSearchAriaLabel} onClick={() => setQuery("")}>
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <button
          className={`icon-btn filter-btn ${hasActiveFilters ? "active" : ""}`}
          aria-label={t.transactions.filterButtonAriaLabel}
          onClick={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="filter-row">
        <ChipGroup options={FILTERS} value={filter} onChange={setFilter} ariaLabel={t.transactions.typeFilterAriaLabel} />
        <div className="sort-menu">
          <button
            className="sort-btn"
            onClick={() => changeSort(nextSort(sort))}
            aria-label={t.transactions.sortButtonAriaLabel(SORT_LABELS[sort])}
          >
            <ArrowDownUp size={14} strokeWidth={2} />
            {SORT_LABELS[sort]}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="screen-empty">
          {transactions.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t.transactions.emptyTitle}
              message={t.transactions.emptyMessage}
              action={
                <button className="btn btn-primary" onClick={onAdd}>
                  <Plus size={18} strokeWidth={2} /> {t.transactions.addExpenseButton}
                </button>
              }
            />
          ) : (
            <EmptyState icon={Search} title={t.transactions.noResultsTitle} message={t.transactions.noResultsMessage} />
          )}
        </div>
      ) : (
        <TransactionList
          transactions={filtered}
          categories={categories}
          currency={settings.currency}
          onOpen={(id) => push({ tab: "transactions", name: "detail", transactionId: id })}
        />
      )}

      {showFilters && (
        <Sheet title={t.transactions.filtersSheetTitle} onClose={() => setShowFilters(false)} ariaLabel={t.transactions.filterButtonAriaLabel}>
          <div className="sheet-form">
            <Field label={t.transactions.dateRangeLabel}>
              <div className="field-grid">
                <DateInput value={dateFrom} onChange={setDateFrom} aria-label={t.transactions.fromDateAriaLabel} />
                <DateInput value={dateTo} onChange={setDateTo} aria-label={t.transactions.toDateAriaLabel} />
              </div>
            </Field>
            <Field label={t.transactions.categoryLabel}>
              <div className="chip-group wrap">
                <button
                  className={`chip ${categoryId === null ? "chip-active" : ""}`}
                  onClick={() => setCategoryId(null)}
                >
                  {t.transactions.allCategoriesChip}
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={`chip ${categoryId === c.id ? "chip-active" : ""}`}
                    onClick={() => setCategoryId(c.id)}
                  >
                    {categoryDisplayName(t, c)}
                  </button>
                ))}
              </div>
            </Field>
            <div className="field-grid">
              <Field label={t.transactions.minAmountLabel}>
                <NumericInput
                  cents={minCents}
                  onCentsChange={setMinCents}
                  placeholder={t.transactions.amountPlaceholder}
                  aria-label={t.transactions.minAmountAriaLabel}
                />
              </Field>
              <Field label={t.transactions.maxAmountLabel}>
                <NumericInput
                  cents={maxCents}
                  onCentsChange={setMaxCents}
                  placeholder={t.transactions.amountPlaceholder}
                  aria-label={t.transactions.maxAmountAriaLabel}
                />
              </Field>
            </div>
          </div>
          <div className="sheet-footer sheet-footer-row">
            <Button
              variant="secondary"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setCategoryId(null);
                setMinCents(null);
                setMaxCents(null);
              }}
            >
              {t.transactions.resetButton}
            </Button>
            <Button size="lg" className="btn-grow" onClick={() => setShowFilters(false)}>
              {t.transactions.showResultsButton(filtered.length)}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
