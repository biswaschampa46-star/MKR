"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type UiSelectOption = { value: string; label: string };

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly UiSelectOption[];
  placeholder?: string;
  /** Show the search box (default true). Set false for tiny lists. */
  searchable?: boolean;
  searchPlaceholder?: string;
  ariaLabel?: string;
  required?: boolean;
  autoComplete?: string;
  name?: string;
  /** Extra classes appended to the trigger button (e.g. pill variant). */
  triggerClassName?: string;
  /** "store" = navy storefront theme, "admin" = var(--adm-*) dashboard theme. */
  variant?: "store" | "admin";
  disabled?: boolean;
};

/* Theme-controlled single-select listbox — the OS white <option> popup is
   never used, so options stay readable in every theme. */
export default function UiSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchable = true,
  searchPlaceholder = "Search…",
  ariaLabel,
  required,
  autoComplete,
  name,
  triggerClassName = "",
  variant = "store",
  disabled = false,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(-1);
      if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable ]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const selected = options.find((o) => o.value === value) ?? null;

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setActive((a) => {
        const next = e.key === "ArrowDown" ? a + 1 : a - 1;
        return (next + filtered.length) % filtered.length;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = active >= 0 && active < filtered.length ? filtered[active] : filtered[0];
      if (target) pick(target.value);
    }
  };

  return (
    <div ref={rootRef} className={`ds${variant === "admin" ? " ds--admin" : ""}`}>
      <input
        id={id}
        name={name}
        tabIndex={-1}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        value={value}
        onChange={() => {}}
        onFocus={(e) => {
          e.target.blur();
          if (!disabled) setOpen(true);
        }}
        className="ds-native"
      />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        className={`ds-trigger${open ? " ds-trigger--open" : ""}${value ? "" : " ds-trigger--empty"}${triggerClassName ? ` ${triggerClassName}` : ""}`}
      >
        <span className="ds-trigger-text">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`ds-chevron${open ? " ds-chevron--open" : ""}`} strokeWidth={2} />
      </button>

      {open && (
        <div className="ds-panel" role="listbox" id={listId} aria-label={ariaLabel ?? placeholder}>
          {searchable && (
            <div className="ds-search">
              <Search className="ds-search-icon" strokeWidth={1.75} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(-1);
                }}
                onKeyDown={onSearchKey}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="ds-search-input"
              />
            </div>
          )}
          <ul className="ds-list">
            {filtered.map((o, i) => {
              const isSel = o.value === value;
              const highlighted = i === active;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o.value)}
                    className={`ds-option${isSel ? " ds-option--selected" : ""}${highlighted ? " ds-option--active" : ""}`}
                  >
                    <span className="ds-option-text">{o.label}</span>
                    {isSel && <Check className="ds-option-check" strokeWidth={2.5} />}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="ds-empty">No match found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
