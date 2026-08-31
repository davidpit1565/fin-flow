import { useState } from "react";
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { useT } from "../lib/i18n";
import type { Dictionary } from "../lib/i18n";
import { computeNetWorth } from "../lib/calc";
import { formatMoney } from "../lib/currency";
import { Button, Card, ChipGroup, EmptyState, Field, Money, NumericInput, ScreenHeader, Sheet, TextInput } from "../components/ui";
import type { CurrencyCode, NetWorthItem, NetWorthItemKind } from "../types";

const ASSET_CATEGORIES = ["Cash", "Investments", "Property", "Vehicle", "Other"];
const LIABILITY_CATEGORIES = ["Loan", "Credit Card", "Mortgage", "Other"];

function categoriesFor(kind: NetWorthItemKind): string[] {
  return kind === "asset" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
}

interface EditingState {
  id: string | null;
  kind: NetWorthItemKind;
}

export function NetWorthScreen() {
  const { netWorthItems, settings, addNetWorthItem, updateNetWorthItem, deleteNetWorthItem, confirm, toast } = useApp();
  const { back } = useNavigation();
  const t = useT();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [valueCents, setValueCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!settings) return null;
  const { currency } = settings;

  const assets = netWorthItems.filter((i) => i.kind === "asset");
  const liabilities = netWorthItems.filter((i) => i.kind === "liability");
  const { assetsCents, liabilitiesCents, netCents } = computeNetWorth(netWorthItems);
  const tone = netCents >= 0 ? "ok" : "over";

  const openAdd = (kind: NetWorthItemKind) => {
    setEditing({ id: null, kind });
    setName("");
    setCategory(categoriesFor(kind)[0]);
    setValueCents(null);
    setError(null);
  };

  const openEdit = (item: NetWorthItem) => {
    setEditing({ id: item.id, kind: item.kind });
    setName(item.name);
    setCategory(item.category);
    setValueCents(item.valueCents);
    setError(null);
  };

  const save = () => {
    if (!editing) return;
    if (!name.trim()) {
      setError(t.netWorth.enterName);
      return;
    }
    if (valueCents === null || valueCents <= 0) {
      setError(t.netWorth.enterValidValue);
      return;
    }
    if (editing.id) {
      updateNetWorthItem(editing.id, { name: name.trim(), category, valueCents });
      toast(editing.kind === "asset" ? t.netWorth.assetUpdated : t.netWorth.liabilityUpdated);
    } else {
      addNetWorthItem(editing.kind, name.trim(), category, valueCents);
      toast(editing.kind === "asset" ? t.netWorth.assetAdded : t.netWorth.liabilityAdded);
    }
    setEditing(null);
  };

  const removeItem = async (item: NetWorthItem) => {
    const ok = await confirm({
      title: t.netWorth.deleteItemConfirmTitle(item.kind),
      message: t.netWorth.deleteItemConfirmMessage,
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteNetWorthItem(item.id);
    toast(t.common.deleted);
  };

  return (
    <div className="screen">
      <ScreenHeader title={t.netWorth.title} subtitle={t.netWorth.subtitle} onBack={back} />

      <Card className="budget-card networth-total-card">
        <span className="row-sub">{t.netWorth.netWorthLabel}</span>
        <Money cents={netCents} currency={currency} amount="large" className={tone === "ok" ? "positive" : "negative"} />
        <p className={`budget-msg ${tone}`}>
          {t.netWorth.totalsSummary(formatMoney(assetsCents, currency), formatMoney(liabilitiesCents, currency))}
        </p>
      </Card>

      {netWorthItems.length === 0 && (
        <EmptyState
          icon={Landmark}
          title={t.netWorth.emptyTitle}
          message={t.netWorth.emptyMessage}
          action={
            <Button onClick={() => openAdd("asset")}>
              <Plus size={18} strokeWidth={2} /> {t.netWorth.addAsset}
            </Button>
          }
        />
      )}

      <NetWorthSection
        title={t.netWorth.assetsSectionTitle}
        kind="asset"
        items={assets}
        currency={currency}
        t={t}
        onAdd={() => openAdd("asset")}
        onEdit={openEdit}
        onDelete={(item) => void removeItem(item)}
      />

      <NetWorthSection
        title={t.netWorth.liabilitiesSectionTitle}
        kind="liability"
        items={liabilities}
        currency={currency}
        t={t}
        onAdd={() => openAdd("liability")}
        onEdit={openEdit}
        onDelete={(item) => void removeItem(item)}
      />

      {editing && (
        <Sheet
          title={
            editing.id
              ? t.netWorth.editItemSheetTitle(editing.kind)
              : editing.kind === "asset"
                ? t.netWorth.addAsset
                : t.netWorth.addLiability
          }
          onClose={() => setEditing(null)}
          ariaLabel={t.netWorth.editItemSheetAria}
          footer={
            <Button size="lg" className="btn-block" onClick={save}>
              {editing.id ? t.netWorth.saveChanges : editing.kind === "asset" ? t.netWorth.addAsset : t.netWorth.addLiability}
            </Button>
          }
        >
          <div className="sheet-form">
            <Field label={t.netWorth.nameFieldLabel}>
              <TextInput
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder={editing.kind === "asset" ? t.netWorth.namePlaceholderAsset : t.netWorth.namePlaceholderLiability}
                aria-label={t.netWorth.nameFieldLabel}
                autoFocus
              />
            </Field>
            <Field label={t.netWorth.categoryFieldLabel}>
              <ChipGroup
                options={categoriesFor(editing.kind).map((c) => ({ value: c, label: t.netWorth.categoryLabel(c) }))}
                value={category}
                onChange={setCategory}
                ariaLabel={t.netWorth.categoryAria}
              />
            </Field>
            <Field label={t.netWorth.valueFieldLabel}>
              <NumericInput
                cents={valueCents}
                onCentsChange={(c) => {
                  setValueCents(c);
                  setError(null);
                }}
                placeholder="0.00"
                aria-label={t.netWorth.valueAria}
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function NetWorthSection({
  title,
  kind,
  items,
  currency,
  t,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  kind: NetWorthItemKind;
  items: NetWorthItem[];
  currency: CurrencyCode;
  t: Dictionary;
  onAdd: () => void;
  onEdit: (item: NetWorthItem) => void;
  onDelete: (item: NetWorthItem) => void;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        <button className="section-action" onClick={onAdd}>
          <Plus size={15} strokeWidth={2.2} /> {t.common.add}
        </button>
      </div>
      {items.length === 0 ? (
        <Card className="card-soft">
          <p className="card-soft-text">{kind === "asset" ? t.netWorth.assetsEmptyHint : t.netWorth.liabilitiesEmptyHint}</p>
        </Card>
      ) : (
        <Card className="budget-list">
          {items.map((item) => (
            <div key={item.id} className="budget-item">
              <div className="budget-item-head">
                <div className="budget-item-name">
                  <span className="row-title">{item.name}</span>
                  <span className="period-tag">{t.netWorth.categoryLabel(item.category)}</span>
                </div>
                <div className="budget-item-actions">
                  <button className="icon-btn icon-btn-sm" aria-label={t.netWorth.editAria(item.name)} onClick={() => onEdit(item)}>
                    <Pencil size={15} strokeWidth={2} />
                  </button>
                  <button className="icon-btn icon-btn-sm" aria-label={t.netWorth.deleteAria(item.name)} onClick={() => onDelete(item)}>
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div className="budget-row">
                <span className="row-title">{formatMoney(item.valueCents, currency)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
