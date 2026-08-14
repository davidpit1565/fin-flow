import { useMemo, useState } from "react";
import { ArrowDownUp, Plus, Search, Settings as SettingsIcon, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { Button, ChipGroup, DateInput, EmptyState, Field, NumericInput, ScreenHeader, Sheet } from "../components/ui";
import { TransactionList } from "../components/TransactionList";

type FilterType = "all" | "expense" | "income" | "recurring";
type SortKey = "newest" | "oldest" | "highest" | "lowest" | "alpha";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "recurring", label: "Recurring" },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
  { value: "alpha", label: "Alphabetical" },
];

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  highest: "Highest",
  lowest: "Lowest",
  alpha: "A–Z",
};

function loadSort(): SortKey {
  try {
    const v = localStorage.getItem("flow-sort");
    if (v && SORTS.some((s) => s.value === v)) return v as SortKey;
  } catch {
    /* ignore */
  }
  return "newest";
}

export function Transactions({ onAdd }: { onAdd: () => void }) {
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

  const hasActiveFilters = dateFrom !== "" || dateTo !== "" || categoryId !== null || minCents !== null || maxCents !== null;

  const filtered = useMemo(() => {
    let list = transactions;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        return (
          t.merchant.toLowerCase().includes(q) ||
          (category?.name ?? "").toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
        );
      });
    }
    if (filter === "expense") list = list.filter((t) => t.type === "expense");
    else if (filter === "income") list = list.filter((t) => t.type === "income");
    else if (filter === "recurring") list = list.filter((t) => t.recurring);

    if (dateFrom) list = list.filter((t) => t.date >= dateFrom);
    if (dateTo) list = list.filter((t) => t.date <= dateTo);
    if (categoryId) list = list.filter((t) => t.categoryId === categoryId);
    if (minCents !== null) list = list.filter((t) => t.amountCents >= minCents);
    if (maxCents !== null) list = list.filter((t) => t.amountCents <= maxCents);

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
  }, [transactions, query, filter, sort, dateFrom, dateTo, categoryId, minCents, maxCents, categories]);

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
        title="Transactions"
        right={
          <button className="icon-btn" aria-label="Settings" onClick={() => push({ tab: "settings", name: "settings" })}>
            <SettingsIcon size={20} strokeWidth={2} />
          </button>
        }
      />

      <div className="search-row">
        <div className="search-box">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            className="search-input"
            placeholder="Search transactions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search transactions"
          />
          {query && (
            <button className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <button
          className={`icon-btn filter-btn ${hasActiveFilters ? "active" : ""}`}
          aria-label="Filter transactions"
          onClick={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="filter-row">
        <ChipGroup options={FILTERS} value={filter} onChange={setFilter} ariaLabel="Transaction type filter" />
        <div className="sort-menu">
          <button className="sort-btn" onClick={() => changeSort(nextSort(sort))} aria-label={`Sort: ${SORT_LABELS[sort]}. Change sorting`}>
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
              title="Nothing here yet"
              message="Add your first expense to start understanding your spending."
              action={
                <button className="btn btn-primary" onClick={onAdd}>
                  <Plus size={18} strokeWidth={2} /> Add expense
                </button>
              }
            />
          ) : (
            <EmptyState icon={Search} title="No results" message="Try another search or filter." />
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
        <Sheet title="Filters" onClose={() => setShowFilters(false)} ariaLabel="Filter transactions">
          <div className="sheet-form">
            <Field label="Date range">
              <div className="field-grid">
                <DateInput value={dateFrom} onChange={setDateFrom} aria-label="From date" />
                <DateInput value={dateTo} onChange={setDateTo} aria-label="To date" />
              </div>
            </Field>
            <Field label="Category">
              <div className="chip-group wrap">
                <button
                  className={`chip ${categoryId === null ? "chip-active" : ""}`}
                  onClick={() => setCategoryId(null)}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={`chip ${categoryId === c.id ? "chip-active" : ""}`}
                    onClick={() => setCategoryId(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </Field>
            <div className="field-grid">
              <Field label="Min amount">
                <NumericInput cents={minCents} onCentsChange={setMinCents} placeholder="0.00" aria-label="Minimum amount" />
              </Field>
              <Field label="Max amount">
                <NumericInput cents={maxCents} onCentsChange={setMaxCents} placeholder="0.00" aria-label="Maximum amount" />
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
              Reset
            </Button>
            <Button size="lg" className="btn-grow" onClick={() => setShowFilters(false)}>
              Show {filtered.length} {filtered.length === 1 ? "result" : "results"}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function nextSort(current: SortKey): SortKey {
  const idx = SORTS.findIndex((s) => s.value === current);
  return SORTS[(idx + 1) % SORTS.length].value;
}
