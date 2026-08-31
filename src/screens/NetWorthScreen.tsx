import { useState } from "react";
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
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
      setError("Enter a name.");
      return;
    }
    if (valueCents === null || valueCents <= 0) {
      setError("Enter a valid value.");
      return;
    }
    const kindLabel = editing.kind === "asset" ? "Asset" : "Liability";
    if (editing.id) {
      updateNetWorthItem(editing.id, { name: name.trim(), category, valueCents });
      toast(`${kindLabel} updated`);
    } else {
      addNetWorthItem(editing.kind, name.trim(), category, valueCents);
      toast(`${kindLabel} added`);
    }
    setEditing(null);
  };

  const removeItem = async (item: NetWorthItem) => {
    const ok = await confirm({
      title: `Delete this ${item.kind}?`,
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteNetWorthItem(item.id);
    toast("Deleted");
  };

  return (
    <div className="screen">
      <ScreenHeader title="Net Worth" subtitle="Track what you own and what you owe" onBack={back} />

      <Card className="budget-card networth-total-card">
        <span className="row-sub">Net worth</span>
        <Money cents={netCents} currency={currency} amount="large" className={tone === "ok" ? "positive" : "negative"} />
        <p className={`budget-msg ${tone}`}>
          {formatMoney(assetsCents, currency)} in assets · {formatMoney(liabilitiesCents, currency)} in liabilities
        </p>
      </Card>

      {netWorthItems.length === 0 && (
        <EmptyState
          icon={Landmark}
          title="No net worth items yet"
          message="Add what you own and what you owe to track your net worth over time."
          action={
            <Button onClick={() => openAdd("asset")}>
              <Plus size={18} strokeWidth={2} /> Add asset
            </Button>
          }
        />
      )}

      <NetWorthSection
        title="Assets"
        kind="asset"
        items={assets}
        currency={currency}
        onAdd={() => openAdd("asset")}
        onEdit={openEdit}
        onDelete={(item) => void removeItem(item)}
      />

      <NetWorthSection
        title="Liabilities"
        kind="liability"
        items={liabilities}
        currency={currency}
        onAdd={() => openAdd("liability")}
        onEdit={openEdit}
        onDelete={(item) => void removeItem(item)}
      />

      {editing && (
        <Sheet
          title={editing.id ? `Edit ${editing.kind}` : editing.kind === "asset" ? "Add asset" : "Add liability"}
          onClose={() => setEditing(null)}
          ariaLabel="Edit net worth item"
        >
          <div className="sheet-form">
            <Field label="Name">
              <TextInput
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder={editing.kind === "asset" ? "e.g. Savings account" : "e.g. Car loan"}
                aria-label="Name"
                autoFocus
              />
            </Field>
            <Field label="Category">
              <ChipGroup
                options={categoriesFor(editing.kind).map((c) => ({ value: c, label: c }))}
                value={category}
                onChange={setCategory}
                ariaLabel="Category"
              />
            </Field>
            <Field label="Value">
              <NumericInput
                cents={valueCents}
                onCentsChange={(c) => {
                  setValueCents(c);
                  setError(null);
                }}
                placeholder="0.00"
                aria-label="Value"
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" onClick={save}>
              {editing.id ? "Save changes" : editing.kind === "asset" ? "Add asset" : "Add liability"}
            </Button>
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
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  kind: NetWorthItemKind;
  items: NetWorthItem[];
  currency: CurrencyCode;
  onAdd: () => void;
  onEdit: (item: NetWorthItem) => void;
  onDelete: (item: NetWorthItem) => void;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        <button className="section-action" onClick={onAdd}>
          <Plus size={15} strokeWidth={2.2} /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <Card className="card-soft">
          <p className="card-soft-text">
            {kind === "asset"
              ? "Add what you own, like cash, investments, or property. Use the “Add” button above."
              : "Add what you owe, like loans or credit cards. Use the “Add” button above."}
          </p>
        </Card>
      ) : (
        <Card className="budget-list">
          {items.map((item) => (
            <div key={item.id} className="budget-item">
              <div className="budget-item-head">
                <div className="budget-item-name">
                  <span className="row-title">{item.name}</span>
                  <span className="period-tag">{item.category}</span>
                </div>
                <div className="budget-item-actions">
                  <button className="icon-btn icon-btn-sm" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)}>
                    <Pencil size={15} strokeWidth={2} />
                  </button>
                  <button className="icon-btn icon-btn-sm" aria-label={`Delete ${item.name}`} onClick={() => onDelete(item)}>
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
