"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartView } from "@/types";

type CartContextValue = {
  cart: CartView | null;
  count: number;
  isAuthenticated: boolean;
  drawerOpen: boolean;
  pending: boolean;
  error: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => Promise<void>;
  addItem: (input: { productId: string; variantId?: string | null; quantity?: number }) => Promise<{ ok: boolean; error?: string }>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearError: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

/**
 * The cart lives in PostgreSQL/Supabase. This provider only mirrors the server
 * response in memory — nothing is persisted in the browser.
 */
export function CartProvider({
  children,
  initialCount,
  isAuthenticated,
}: {
  children: ReactNode;
  initialCount: number;
  isAuthenticated: boolean;
}) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [count, setCount] = useState(initialCount);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/cart", { cache: "no-store" });
      const payload = (await response.json()) as { ok: boolean; cart?: CartView; error?: string };
      if (!payload.ok || !payload.cart) throw new Error(payload.error ?? "Unable to load your cart.");
      setCart(payload.cart);
      setCount(payload.cart.itemCount);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your cart.");
    }
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [drawerOpen, refresh]);

  const applyResponse = useCallback((payload: { ok: boolean; cart?: CartView; error?: string }) => {
    if (!payload.ok || !payload.cart) throw new Error(payload.error ?? "Cart update failed.");
    setCart(payload.cart);
    setCount(payload.cart.itemCount);
    setError(null);
    return payload.cart;
  }, []);

  const addItem = useCallback<CartContextValue["addItem"]>(
    async (input) => {
      setPending(true);
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: input.productId, variantId: input.variantId ?? null, quantity: input.quantity ?? 1 }),
        });
        const payload = (await response.json()) as { ok: boolean; cart?: CartView; error?: string };
        applyResponse(payload);
        setDrawerOpen(true);
        return { ok: true };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to add this item.";
        setError(message);
        return { ok: false, error: message };
      } finally {
        setPending(false);
      }
    },
    [applyResponse],
  );

  const updateItem = useCallback<CartContextValue["updateItem"]>(
    async (itemId, quantity) => {
      setPending(true);
      try {
        const response = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, quantity }),
        });
        applyResponse((await response.json()) as { ok: boolean; cart?: CartView; error?: string });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to update your cart.");
      } finally {
        setPending(false);
      }
    },
    [applyResponse],
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>(
    async (itemId) => {
      setPending(true);
      try {
        const response = await fetch("/api/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId }),
        });
        applyResponse((await response.json()) as { ok: boolean; cart?: CartView; error?: string });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to remove this item.");
      } finally {
        setPending(false);
      }
    },
    [applyResponse],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count,
      isAuthenticated,
      drawerOpen,
      pending,
      error,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      refresh,
      addItem,
      updateItem,
      removeItem,
      clearError: () => setError(null),
    }),
    [addItem, cart, count, drawerOpen, error, isAuthenticated, pending, refresh, removeItem, updateItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
