"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Alert, Button, EmptyState, LinkButton } from "@/components/ui";
import { MediaImage } from "@/components/media-image";
import { useCart } from "@/components/cart/cart-provider";
import { formatTaka } from "@/lib/utils";

export function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, updateItem, removeItem, pending, error, clearError } = useCart();
  const panelRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    // Phase 21: remember the trigger so focus can return to it on close.
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      // Focus trap: cycle Tab within the dialog panel.
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog.
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button")?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      // Return focus to the element that opened the drawer.
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;
  const lines = cart?.lines ?? [];

  return (
    <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="absolute inset-0 bg-[#071a2b]/80 backdrop-blur-sm" onClick={closeDrawer} />
      <aside ref={panelRef} role="presentation" className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden border-l border-[#a8c0d5]/15 bg-[#0b263d] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#a8c0d5]/12 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-[#8ccbff]" />
            <h2 className="font-display text-lg text-[#f4faff]">Your cart</h2>
          </div>
          <button type="button" onClick={closeDrawer} aria-label="Close cart" className="rounded-full p-2 text-[#ddf3ff] hover:bg-[#ddf3ff]/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? (
            <Alert tone="error" role="alert">
              {error}
              <button type="button" onClick={clearError} className="ml-2 underline">
                dismiss
              </button>
            </Alert>
          ) : null}

          {lines.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Browse the MKR collection and add pieces you love. Your cart is stored securely on the server."
              action={
                <LinkButton href="/shop" onClick={closeDrawer} size="sm">
                  Shop the collection
                </LinkButton>
              }
            />
          ) : (
            lines.map((line) => (
              <div key={line.id} className="flex gap-3 rounded-3xl border border-[#a8c0d5]/12 bg-[#071a2b]/50 p-3">
                <MediaImage
                  src={line.imageUrl}
                  alt={line.name}
                  className="h-24 w-20 shrink-0 rounded-2xl"
                  sizes="80px"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/product/${line.slug}`} onClick={closeDrawer} className="line-clamp-2 text-sm text-[#f4faff] hover:text-[#8ccbff]">
                      {line.name}
                    </Link>
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => void removeItem(line.id)}
                      className="rounded-full p-1 text-[#a8c0d5] transition hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {line.size || line.color ? (
                    <p className="text-xs text-[#a8c0d5]">
                      {[line.size, line.color].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {!line.inStock ? <p className="text-xs text-rose-300">Only {line.stockAvailable} left in stock</p> : null}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-full border border-[#a8c0d5]/25 px-1">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={pending}
                        onClick={() => void updateItem(line.id, line.quantity - 1)}
                        className="rounded-full p-1.5 text-[#ddf3ff] disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={pending || line.quantity >= line.stockAvailable}
                        onClick={() => void updateItem(line.id, line.quantity + 1)}
                        className="rounded-full p-1.5 text-[#ddf3ff] disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-display text-sm text-[#f4faff]">{formatTaka(line.lineTotal)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {lines.length > 0 ? (
          <footer className="shrink-0 space-y-4 border-t border-[#a8c0d5]/12 bg-[#0b263d] px-5 py-5">
            <div className="flex items-center justify-between text-sm text-[#a8c0d5]">
              <span>Subtotal</span>
              <span className="font-display text-lg text-[#f4faff]">{formatTaka(cart?.subtotal ?? 0)}</span>
            </div>
            <p className="text-[11px] text-[#a8c0d5]/80">
              Delivery is calculated at checkout from the zone settings stored in Supabase.
            </p>
            <div className="flex flex-col gap-2">
              <LinkButton href="/checkout" onClick={closeDrawer} size="lg" className="w-full">
                Checkout
              </LinkButton>
              <Button type="button" variant="ghost" onClick={closeDrawer} className="w-full">
                Continue shopping
              </Button>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
