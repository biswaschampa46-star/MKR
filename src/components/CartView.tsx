"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, X, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart, useCartTotals, useUI } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { bdt } from "@/lib/format";
import { variantLabel } from "@/lib/variant-attributes";

export default function CartView({
  fees = { inside: 70, outside: 130 },
}: {
  /** Delivery fees from admin Settings (same source as Checkout/Footer). */
  fees?: { inside: number; outside: number };
}) {
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { items, subtotal } = useCartTotals();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const setAuthOpen = useUI((s) => s.setAuthOpen);
  const setPendingAction = useAuth((s) => s.setPendingAction);


  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-28 pt-36 md:px-10 md:pt-44">
      <header className="mb-14 md:mb-20">
        <p className="label">Your Selection</p>
        <h1 className="display-2 mt-6 text-foam">Cart</h1>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-7 border-t border-line-soft py-28 text-center">
          <ShoppingBag className="h-9 w-9 text-mist/40" strokeWidth={1} />
          <div>
            <p className="font-display text-xl font-bold uppercase tracking-[0.14em] text-foam">
              Your cart is empty
            </p>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-mist">
              Discover something worth bringing home.
            </p>
          </div>
          <Link href="/shop" className="btn btn-solid">
            Explore Shop <ArrowRight className="btn-arrow h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-16 lg:grid-cols-12">
          {/* items */}
          <ul className="space-y-0 border-t border-line-soft lg:col-span-7">
            {items.map((item) => (
              <li key={item.key} className="flex gap-6 border-b border-line-soft py-8">
                <Link href={`/product/${item.slug}`} className="media-frame relative block aspect-[4/5] w-24 shrink-0 md:w-28">
                  <Image src={item.image || "/images/mkr-logo.jpg"} alt={item.name} fill sizes="112px" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/product/${item.slug}`} className="font-display text-[0.95rem] font-semibold uppercase tracking-[0.07em] text-foam hover:text-ice">
                        {item.name}
                      </Link>
                      <p className="mt-2 text-xs text-mist/80">{variantLabel(item)}</p>
                      <p className="mt-2 text-xs text-mist/60">{bdt(item.price)} each</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.key)}
                      aria-label={`Remove ${item.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-mist/60 transition-colors hover:text-ice"
                    >
                      <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <div className="inline-flex items-center rounded-full border border-line">
                      <button type="button" className="grid h-9 w-9 place-items-center text-mist hover:text-ice disabled:opacity-40" onClick={() => setQty(item.key, item.qty - 1)} aria-label="Decrease quantity">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm text-foam">{item.qty}</span>
                      <button type="button" className="grid h-9 w-9 place-items-center text-mist hover:text-ice disabled:opacity-40" onClick={() => setQty(item.key, item.qty + 1)} aria-label="Increase quantity" disabled={item.stock !== undefined && item.qty >= Math.max(item.stock, 0)} title={item.stock !== undefined && item.qty >= item.stock ? "Stock limit reached" : undefined}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="font-display shrink-0 text-base font-semibold text-ice">{bdt(item.price * item.qty)}</p>
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

          {/* summary */}
          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="card-glass rounded-2xl p-8 lg:sticky lg:top-28">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-foam">
                Summary
              </p>
              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-mist">Subtotal</dt>
                  <dd className="text-foam">{bdt(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mist">Delivery charge (prepaid)</dt>
                  <dd className="text-foam">
                    {bdt(fees.inside)} inside Chattogram / {bdt(fees.outside)} outside
                  </dd>
                </div>
                <div className="hairline-full" />
                <div className="flex items-baseline justify-between">
                  <dt className="label">Total</dt>
                  <dd className="font-display text-2xl font-bold text-ice">{bdt(subtotal)}</dd>
                </div>
              </dl>
              <p className="mt-5 text-xs leading-relaxed text-mist/70">
                Products are paid in cash on delivery. The delivery charge —{" "}
                {bdt(fees.inside)} inside Chattogram, {bdt(fees.outside)} outside — is paid in
                advance via bKash, Nagad or Rocket.
              </p>
              <button
                type="button"
                className="btn btn-solid mt-7 w-full"
                onClick={() => {
                  /* safety net — checkout also requires a signed-in account */
                  if (!user) {
                    setPendingAction(() => () => router.push("/checkout"));
                    setAuthOpen(true);
                    return;
                  }
                  router.push("/checkout");
                }}
              >
                Proceed to Checkout <ArrowRight className="btn-arrow h-3.5 w-3.5" />
              </button>
              <Link href="/shop" className="link-line mt-6 inline-block text-xs uppercase tracking-[0.24em] text-mist hover:text-ice">
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
