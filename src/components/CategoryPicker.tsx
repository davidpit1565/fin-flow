import { useRef } from "react";
import { useApp } from "../store/AppContext";
import { iconByName } from "../lib/icons";
import { Check } from "lucide-react";
import { rovingNextIndex } from "./ui";

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
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    categories.findIndex((c) => c.id === value)
  );

  return (
    <div className="category-grid" role="radiogroup" aria-label={ariaLabel ?? "Category"}>
      {categories.map((c, i) => {
        const Icon = iconByName(c.icon);
        const selected = value === c.id;
        return (
          <button
            key={c.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === selectedIndex ? 0 : -1}
            className={`category-chip ${selected ? "category-chip-active" : ""}`}
            onClick={() => onChange(c.id)}
            onKeyDown={(e) => {
              const next = rovingNextIndex(e.key, i, categories.length);
              if (next === null) return;
              e.preventDefault();
              onChange(categories[next].id);
              refs.current[next]?.focus();
            }}
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
