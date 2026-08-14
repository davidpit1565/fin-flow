import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { ICON_SET, iconByName } from "../lib/icons";
import { Button, Card, Field, IconBadge, ScreenHeader, Sheet, TextInput } from "../components/ui";

export function CategoriesScreen() {
  const { categories, transactions, subscriptions, addCategory, updateCategory, deleteCategory, confirm, toast, haptic } = useApp();
  const { back } = useNavigation();
  const [editing, setEditing] = useState<{ id: string | null; name: string; icon: string } | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const usageCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1);
    for (const s of subscriptions) map.set(s.categoryId, (map.get(s.categoryId) ?? 0) + 1);
    return map;
  }, [transactions, subscriptions]);

  const save = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      toast("Please enter a category name.");
      return;
    }
    if (editing.id) {
      updateCategory(editing.id, { name, icon: editing.icon });
      toast("Category updated");
    } else {
      addCategory(name, editing.icon);
      toast("Category added");
    }
    setEditing(null);
  };

  const remove = async (id: string, name: string) => {
    const count = usageCount.get(id) ?? 0;
    if (count > 0) {
      // Requires reassignment.
      setReassignTarget(id);
      const ok = await confirm({
        title: `Reassign ${name}?`,
        message: `${count} ${count === 1 ? "transaction or subscription uses" : "transactions or subscriptions use"} this category. Choose a category to move them to before deleting.`,
        confirmLabel: "Reassign & delete",
        danger: true,
      });
      if (!ok) return;
      // The sheet below picks the destination.
      setPendingDelete({ id, name });
      return;
    }
    const ok = await confirm({
      title: `Delete ${name}?`,
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteCategory(id, null);
    haptic("warning");
    toast("Deleted");
  };

  const confirmDeleteWithReassign = () => {
    if (!pendingDelete || !reassignTarget) return;
    deleteCategory(pendingDelete.id, reassignTarget);
    setPendingDelete(null);
    setReassignTarget(null);
    haptic("warning");
    toast("Deleted");
  };

  return (
    <div className="screen">
      <ScreenHeader title="Categories" subtitle="Rename, re-icon, or add your own" onBack={back} />

      <Card className="list-card">
        {categories.map((c) => {
          const Icon = iconByName(c.icon);
          const count = usageCount.get(c.id) ?? 0;
          return (
            <div key={c.id} className="row">
              <IconBadge icon={Icon} size="sm" />
              <div className="row-main">
                <span className="row-title">{c.name}</span>
                <span className="row-sub">
                  {count} {count === 1 ? "item" : "items"}
                  {c.isSystem ? " · default" : ""}
                </span>
              </div>
              <button
                className="icon-btn icon-btn-sm"
                aria-label={`Edit ${c.name}`}
                onClick={() => setEditing({ id: c.id, name: c.name, icon: c.icon })}
              >
                <Plus size={15} strokeWidth={2} />
              </button>
              <button className="icon-btn icon-btn-sm danger" aria-label={`Delete ${c.name}`} onClick={() => void remove(c.id, c.name)}>
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </Card>

      <div className="sub-toolbar">
        <Button variant="secondary" onClick={() => setEditing({ id: null, name: "", icon: "Ellipsis" })}>
          <Plus size={17} strokeWidth={2} /> Add category
        </Button>
      </div>

      {editing && (
        <Sheet title={editing.id ? "Edit category" : "Add category"} onClose={() => setEditing(null)} ariaLabel="Edit category">
          <div className="sheet-form">
            <Field label="Name" htmlFor="cat-name">
              <TextInput
                id="cat-name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                autoFocus
                placeholder="Category name"
              />
            </Field>
            <Field label="Icon">
              <div className="icon-grid" role="radiogroup" aria-label="Category icon">
                {ICON_SET.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={editing.icon === name}
                    className={`icon-option ${editing.icon === name ? "icon-option-active" : ""}`}
                    onClick={() => setEditing({ ...editing, icon: name })}
                    aria-label={name}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" onClick={save}>
              {editing.id ? "Save changes" : "Add category"}
            </Button>
          </div>
        </Sheet>
      )}

      {pendingDelete && (
        <Sheet
          title={`Move ${pendingDelete.name} items`}
          onClose={() => {
            setPendingDelete(null);
            setReassignTarget(null);
          }}
          ariaLabel="Choose destination category"
        >
          <div className="sheet-form">
            <Field label="Move to">
              <div className="chip-group wrap">
                {categories
                  .filter((c) => c.id !== pendingDelete.id)
                  .map((c) => (
                    <button
                      key={c.id}
                      className={`chip ${reassignTarget === c.id ? "chip-active" : ""}`}
                      onClick={() => setReassignTarget(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
              </div>
            </Field>
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" disabled={!reassignTarget} onClick={confirmDeleteWithReassign}>
              Move items & delete {pendingDelete.name}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
