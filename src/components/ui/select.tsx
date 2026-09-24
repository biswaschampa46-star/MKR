"use client";

import type { ChangeEvent, ComponentProps, KeyboardEvent, ReactNode } from "react";
import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────── Dropdown / Select system ───────────────
   Custom MKR-styled listbox replacing the native <select> popup
   (native option sheets are OS-rendered and impossible to style).
   Drop-in compatible with the old wrapper: children stay <option>
   elements, forms keep working via a hidden input (name/value),
   controlled (value + onChange) and uncontrolled (defaultValue)
   modes both supported. Client-only — import from
   "@/components/ui/select", not the server-safe barrel. */

type Option = { value: string; label: string; disabled: boolean };

function optionText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (isValidElement(node)) return optionText((node.props as { children?: ReactNode }).children);
  return "";
}

function parseOptions(children: ReactNode): Option[] {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
    const raw = props.value !== undefined ? String(props.value) : optionText(props.children);
    options.push({
      value: raw,
      label: optionText(props.children) || raw,
      disabled: Boolean(props.disabled),
    });
  });
  return options;
}

const MAX_POP_HEIGHT = 240;

export function Select({
  className,
  children,
  value,
  defaultValue,
  name,
  onChange,
  disabled,
  ...rest
}: Omit<ComponentProps<"select">, "ref" | "onClose" | "onClick" | "onKeyDown">) {
  const ariaLabel = rest["aria-label"] as string | undefined;
  const options = parseOptions(children);
  const listboxId = useId();
  const shellRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeaheadRef = useRef({ buffer: "", timer: 0 as ReturnType<typeof setTimeout> | 0 });

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue !== undefined ? String(defaultValue) : "");
  const current = isControlled ? String(value) : internal;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [flipUp, setFlipUp] = useState(false);

  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const commit = (next: string) => {
    if (!isControlled) setInternal(next);
    onChange?.({ target: { value: next, name } } as ChangeEvent<HTMLSelectElement>);
  };

  const close = (refocus = true) => {
    setOpen(false);
    setActive(-1);
    if (refocus) triggerRef.current?.focus();
  };

  // Close on outside pointerdown.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  // Flip the sheet upward when there is no room below.
  useEffect(() => {
    if (!open) return;
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    const roomBelow = window.innerHeight - rect.bottom;
    setFlipUp(roomBelow < MAX_POP_HEIGHT + 24 && rect.top > roomBelow);
  }, [open]);

  // Keep the active option visible.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => () => clearTimeout(typeaheadRef.current.timer), []);

  const moveActive = (from: number, dir: 1 | -1) => {
    for (let i = 1; i <= options.length; i++) {
      const idx = (from + dir * i + options.length * i) % options.length;
      if (!options[idx]?.disabled) {
        setActive(idx);
        return;
      }
    }
  };

  const typeahead = (char: string) => {
    const state = typeaheadRef.current;
    clearTimeout(state.timer);
    state.buffer += char.toLowerCase();
    state.timer = setTimeout(() => {
      typeaheadRef.current.buffer = "";
    }, 600);
    const pool = options.filter((o) => !o.disabled);
    const start = pool.findIndex((o) => o.value === (open ? options[active]?.value : current));
    const ordered = [...pool.slice(start + 1), ...pool.slice(0, start + 1)];
    const hit = ordered.find((o) => o.label.toLowerCase().startsWith(state.buffer));
    if (!hit) return;
    const idx = options.indexOf(hit);
    if (open) setActive(idx);
    else commit(hit.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(Math.max(selectedIndex, 0));
        } else moveActive(active, 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(Math.max(selectedIndex, 0));
        } else moveActive(active, -1);
        return;
      case "Home":
        if (open) {
          event.preventDefault();
          moveActive(-1, 1);
        }
        return;
      case "End":
        if (open) {
          event.preventDefault();
          moveActive(0, -1);
        }
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(Math.max(selectedIndex, 0));
        } else if (active >= 0 && !options[active].disabled) {
          commit(options[active].value);
          close();
        }
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        return;
      case "Tab":
        if (open) close(false);
        return;
      default:
        if (event.key.length === 1) typeahead(event.key);
    }
  };

  const optionId = (index: number) => `${listboxId}-opt-${index}`;

  return (
    <span ref={shellRef} data-select className="mkr-select-shell relative block w-full">
      {name && !disabled ? <input type="hidden" name={name} value={current} /> : null}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 truncate rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 py-3 pl-4 pr-10 text-left text-sm text-[#f4faff] transition-colors duration-300",
          "hover:border-[#8ccbff]/50 focus-visible:border-[#8ccbff] focus-visible:bg-[#071a2b] focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-55",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-[#a8c0d5]/70")}>{selected?.label ?? "Select"}</span>
      </button>
      <ChevronDown
        aria-hidden
        className={cn(
          "mkr-select-chevron pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8c0d5] transition-transform duration-300",
          open && "mkr-select-chevron-open text-[#8ccbff]",
        )}
      />
      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn("mkr-select-pop", flipUp && "mkr-select-pop-up")}
        >
          {options.map((option, index) => {
            const isSelected = option.value === current;
            return (
              <li
                key={option.value + index}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                className={cn(
                  "mkr-select-option",
                  index === active && "mkr-select-option-active",
                  isSelected && "mkr-select-option-selected",
                  option.disabled && "mkr-select-option-disabled",
                )}
                onMouseEnter={() => !option.disabled && setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (option.disabled) return;
                  commit(option.value);
                  close();
                }}
              >
                <span className="mkr-select-option-label">{option.label}</span>
                {isSelected ? <Check aria-hidden className="h-3.5 w-3.5 shrink-0" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </span>
  );
}
