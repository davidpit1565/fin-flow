import { useApp } from "../store/AppContext";
import { iconByName } from "../lib/icons";
import { Check } from "lucide-react";

export function CategoryPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string | null;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const { categories } = useApp();
  return (
    <div className="category-grid" role="radiogroup" aria-label={ariaLabel ?? "Category"}>
      {categories.map((c) => {
        const Icon = iconByName(c.icon);
        const selected = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`category-chip ${selected ? "category-chip-active" : ""}`}
            onClick={() => onChange(c.id)}
          >
            <span className="category-chip-icon">
              <Icon size={18} strokeWidth={1.8} />
              {selected && (
                <span className="category-chip-check">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="category-chip-name">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
