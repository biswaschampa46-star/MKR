"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { VariantAttribute } from "@/db/schema";

export type CartItem = {
  key: string; // productId + variant
  productId: string;
  slug: string;
  name: string;
  image: string;
  variant: string;
  price: number;
  qty: number;
  /** Optional, labeled options (Waist Size / Leg Opening) for pant/trouser items. */
  attributes?: VariantAttribute[];
  /** Known stock at add-time (UX hint only — checkout revalidates server-side). */
  stock?: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "key" | "qty">, qty: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty) =>
        set((s) => {
          const key = `${item.productId}::${item.variant}`;
          const cap = (n: number) =>
            Math.min(n, 99, item.stock !== undefined ? Math.max(item.stock, 0) : 99);
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === key
                  ? { ...i, qty: cap(i.qty + qty), stock: item.stock ?? i.stock }
                  : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, key, qty: cap(qty) }] };
        }),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      setQty: (key, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.key !== key)
              : s.items.map((i) => {
                  if (i.key !== key) return i;
                  const max = i.stock !== undefined ? Math.min(99, Math.max(i.stock, 0)) : 99;
                  return { ...i, qty: Math.min(qty, max) };
                }),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "mkr-casual-cart" },
  ),
);

type UIState = {
  cartOpen: boolean;
  menuOpen: boolean;
  searchOpen: boolean;
  aiOpen: boolean;
  authOpen: boolean;
  setCartOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setAiOpen: (v: boolean) => void;
  setAuthOpen: (v: boolean) => void;
};

export const useUI = create<UIState>((set) => ({
  cartOpen: false,
  menuOpen: false,
  searchOpen: false,
  aiOpen: false,
  authOpen: false,
  setCartOpen: (v) => set({ cartOpen: v }),
  setMenuOpen: (v) => set({ menuOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setAiOpen: (v) => set({ aiOpen: v }),
  setAuthOpen: (v) => set({ authOpen: v }),
}));

/** Avoids hydration mismatch for persisted-cart dependent UI. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useCartTotals() {
  const items = useCart((s) => s.items);
  const hydrated = useHydrated();
  const count = hydrated ? items.reduce((n, i) => n + i.qty, 0) : 0;
  const subtotal = hydrated ? items.reduce((n, i) => n + i.price * i.qty, 0) : 0;
  return { count, subtotal, items: hydrated ? items : ([] as CartItem[]) };
}
