"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Minus, Plus, ArrowRight, ShoppingBag } from "lucide-react";
import { useUI, useCart, useCartTotals } from "@/lib/store";
import { bdt } from "@/lib/format";
import { variantLabel } from "@/lib/variant-attributes";

export default function CartDrawer({
  fees = { inside: 70, outside: 130 },
}: {
  /** Delivery fees from admin Settings (passed from the root layout). */
  fees?: { inside: number; outside: number };
}) {
  const { cartOpen, setCartOpen } = useUI();
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { items, count, subtotal } = useCartTotals();
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCartOpen]);

  const go = (href: string) => {
    setCartOpen(false);
    router.push(href);
  };

  return (
    <div className={`fixed inset-0 z-[70] ${cartOpen ? "" : "pointer-events-none"}`} aria-hidden={!cartOpen}>
      <div
        className={`scrim absolute inset-0 bg-[rgba(4,13,22,0.55)] backdrop-blur-sm ${cartOpen ? "opacity-100" : "opacity-0"}`}
        onClick={() => setCartOpen(false)}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line-soft bg-[rgba(9,31,50,0.94)] backdrop-blur-2xl ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-line-soft px-7 py-6">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.28em] text-foam">
            Cart <span className="text-mist">({count})</span>
          </p>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
            className="grid h-9 w-9 place-items-center rounded-full text-mist transition-colors hover:text-ice"
          >
            <X className="h-4.5 w-4.5" strokeWidth={1.5} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
            <ShoppingBag className="h-8 w-8 text-mist/50" strokeWidth={1} />
            <div>
              <p className="font-display text-lg font-bold uppercase tracking-[0.14em] text-foam">
                Your cart is empty
              </p>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                Discover something worth bringing home.
              </p>
            </div>
            <button type="button" className="btn btn-line" onClick={() => go("/shop")}>
              Explore Shop <ArrowRight className="btn-arrow h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-7 py-6">
              <ul className="space-y-7">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-5">
                    <div className="media-frame relative h-24 w-[4.8rem] shrink-0">
                      <Image src={item.image || "/images/mkr-logo.jpg"} alt={item.name} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/product/${item.slug}`}
                            onClick={() => setCartOpen(false)}
                            className="font-display block truncate text-[0.85rem] font-semibold uppercase tracking-[0.06em] text-foam hover:text-ice"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-xs text-mist/80">{variantLabel(item)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.key)}
                          aria-label={`Remove ${item.name}`}
                          className="text-mist/60 transition-colors hover:text-ice"
                        >
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                        <div className="inline-flex items-center rounded-full border border-line">
                          <button
                            type="button"
                            className="grid h-7 w-7 place-items-center text-mist hover:text-ice disabled:opacity-40"
                            onClick={() => setQty(item.key, item.qty - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs text-foam">{item.qty}</span>
                          <button
                            type="button"
                            className="grid h-7 w-7 place-items-center text-mist hover:text-ice disabled:opacity-40"
                            onClick={() => setQty(item.key, item.qty + 1)}
                            aria-label="Increase quantity"
                            disabled={item.stock !== undefined && item.qty >= Math.max(item.stock, 0)}
                            title={item.stock !== undefined && item.qty >= item.stock ? "Stock limit reached" : undefined}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="shrink-0 text-sm font-medium text-ice">{bdt(item.price * item.qty)}</p>
                      </div>
                      {item.stock !== undefined && item.stock <= 0 && (
                        <p role="status" className="pt-2 text-xs text-accent/90">Out of stock — it will be removed at checkout.</p>
                      )}
                      {item.stock !== undefined && item.stock > 0 && item.qty >= item.stock && (
                        <p role="status" className="pt-2 text-xs text-mist/70">Only {item.stock} available.</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="border-t border-line-soft px-7 py-6">
              <div className="flex items-baseline justify-between">
                <p className="label">Subtotal</p>
                <p className="font-display text-xl font-bold text-ice">{bdt(subtotal)}</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-mist/70">
                Products are paid in cash on delivery. The delivery charge —
                {bdt(fees.inside)} inside Chattogram, {bdt(fees.outside)} outside — is prepaid
                via bKash, Nagad or Rocket.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                <button type="button" className="btn btn-line w-full !px-4" onClick={() => go("/cart")}>
                  View Cart
                </button>
                <button type="button" className="btn btn-solid w-full !px-4" onClick={() => go("/checkout")}>
                  Checkout <ArrowRight className="btn-arrow h-3.5 w-3.5" />
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
