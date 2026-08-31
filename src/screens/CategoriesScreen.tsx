import { useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { categoryDisplayName, useT } from "../lib/i18n";
import { ICON_SET, iconByName } from "../lib/icons";
import { Button, Card, Field, IconBadge, ScreenHeader, Sheet, TextInput, rovingNextIndex } from "../components/ui";

export function CategoriesScreen() {
  const t = useT();
  const { categories, transactions, subscriptions, addCategory, updateCategory, deleteCategory, confirm, toast, haptic } = useApp();
  const { back } = useNavigation();
  const [editing, setEditing] = useState<{ id: string | null; name: string; icon: string } | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const iconRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const usageCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1);
    for (const s of subscriptions) map.set(s.categoryId, (map.get(s.categoryId) ?? 0) + 1);
    return map;
  }, [transactions, subscriptions]);

  const save = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      toast(t.categories.toastEnterName);
      return;
    }
    const duplicate = categories.some((c) => c.id !== editing.id && c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      toast(t.categories.toastDuplicateName);
      return;
    }
    if (editing.id) {
      updateCategory(editing.id, { name, icon: editing.icon });
      toast(t.categories.toastCategoryUpdated);
    } else {
      addCategory(name, editing.icon);
      toast(t.categories.toastCategoryAdded);
    }
    setEditing(null);
  };

  const remove = async (id: string, name: string) => {
    if (categories.length <= 1) {
      toast(t.categories.toastNeedOneCategory);
      return;
    }
    const count = usageCount.get(id) ?? 0;
    if (count > 0) {
      // Requires reassignment; no destination is chosen yet.
      setReassignTarget(null);
      const ok = await confirm({
        title: t.categories.reassignConfirmTitle(name),
        message: t.categories.reassignConfirmMessage(count),
        confirmLabel: t.categories.reassignConfirmLabel,
        danger: true,
      });
      if (!ok) return;
      // The sheet below picks the destination.
      setPendingDelete({ id, name });
      return;
    }
    const ok = await confirm({
      title: t.categories.deleteConfirmTitle(name),
      message: t.categories.deleteConfirmMessage,
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    deleteCategory(id, null);
    haptic("warning");
    toast(t.common.deleted);
  };

  const confirmDeleteWithReassign = () => {
    if (!pendingDelete || !reassignTarget) return;
    deleteCategory(pendingDelete.id, reassignTarget);
    setPendingDelete(null);
    setReassignTarget(null);
    haptic("warning");
    toast(t.common.deleted);
  };

  return (
    <div className="screen">
      <ScreenHeader title={t.categories.screenTitle} subtitle={t.categories.screenSubtitle} onBack={back} />

      <Card className="list-card">
        {categories.map((c) => {
          const Icon = iconByName(c.icon);
          const count = usageCount.get(c.id) ?? 0;
          const displayName = categoryDisplayName(t, c);
          return (
            <div key={c.id} className="row">
              <IconBadge icon={Icon} size="sm" />
              <div className="row-main">
                <span className="row-title">{displayName}</span>
                <span className="row-sub">{t.categories.rowSummary(count, !!c.isSystem)}</span>
              </div>
              <button
                className="icon-btn icon-btn-sm"
                aria-label={t.categories.editAriaLabel(displayName)}
                onClick={() => setEditing({ id: c.id, name: displayName, icon: c.icon })}
              >
                <Pencil size={15} strokeWidth={2} />
              </button>
              <button
                className="icon-btn icon-btn-sm danger"
                aria-label={t.categories.deleteAriaLabel(displayName)}
                onClick={() => void remove(c.id, displayName)}
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </Card>

      <div className="sub-toolbar">
        <Button variant="secondary" onClick={() => setEditing({ id: null, name: "", icon: "Ellipsis" })}>
          <Plus size={17} strokeWidth={2} /> {t.categories.addCategoryButton}
        </Button>
      </div>

      {editing && (
        <Sheet
          title={editing.id ? t.categories.editCategorySheetTitle : t.categories.addCategoryButton}
          onClose={() => setEditing(null)}
          ariaLabel={t.categories.editCategoryAriaLabel}
        >
          <div className="sheet-form">
            <Field label={t.categories.nameLabel} htmlFor="cat-name">
              <TextInput
                id="cat-name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                autoFocus
                placeholder={t.categories.namePlaceholder}
              />
            </Field>
            <Field label={t.categories.iconLabel}>
              <div className="icon-grid" role="radiogroup" aria-label={t.categories.iconGridAriaLabel}>
                {(() => {
                  const selectedIconIndex = Math.max(
                    0,
                    ICON_SET.findIndex((opt) => opt.name === editing.icon)
                  );
                  return ICON_SET.map(({ name, icon: Icon }, i) => (
                    <button
                      key={name}
                      ref={(el) => {
                        iconRefs.current[i] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={editing.icon === name}
                      tabIndex={i === selectedIconIndex ? 0 : -1}
                      className={`icon-option ${editing.icon === name ? "icon-option-active" : ""}`}
                      onClick={() => setEditing({ ...editing, icon: name })}
                      onKeyDown={(e) => {
                        const next = rovingNextIndex(e.key, i, ICON_SET.length);
                        if (next === null) return;
                        e.preventDefault();
                        setEditing({ ...editing, icon: ICON_SET[next].name });
                        iconRefs.current[next]?.focus();
                      }}
                      aria-label={name}
                    >
                      <Icon size={19} strokeWidth={1.8} />
                    </button>
                  ));
                })()}
              </div>
            </Field>
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" onClick={save}>
              {editing.id ? t.categories.saveChangesButton : t.categories.addCategoryButton}
            </Button>
          </div>
        </Sheet>
      )}

      {pendingDelete && (
        <Sheet
          title={t.categories.moveSheetTitle(pendingDelete.name)}
          onClose={() => {
            setPendingDelete(null);
            setReassignTarget(null);
          }}
          ariaLabel={t.categories.moveSheetAriaLabel}
        >
          <div className="sheet-form">
            <Field label={t.categories.moveToLabel}>
              <div className="chip-group wrap">
                {categories
                  .filter((c) => c.id !== pendingDelete.id)
                  .map((c) => (
                    <button
                      key={c.id}
                      className={`chip ${reassignTarget === c.id ? "chip-active" : ""}`}
                      onClick={() => setReassignTarget(c.id)}
                    >
                      {categoryDisplayName(t, c)}
                    </button>
                  ))}
              </div>
            </Field>
          </div>
          <div className="sheet-footer">
            <Button size="lg" className="btn-block" disabled={!reassignTarget} onClick={confirmDeleteWithReassign}>
              {t.categories.moveButtonText(pendingDelete.name)}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
