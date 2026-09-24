"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Alert, Button, EmptyState, LinkButton } from "@/components/ui";
import { MediaImage } from "@/components/media-image";
import { useCart } from "@/components/cart/cart-provider";
import { formatTaka } from "@/lib/utils";

export function CartPageView({ authenticated }: { authenticated: boolean }) {
  const { cart, refresh, updateItem, removeItem, pending, error } = useCart();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error && !cart) return <Alert tone="error">{error}</Alert>;

  if (!cart) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-3xl" />
        <div className="skeleton h-24 rounded-3xl" />
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Everything you add is stored on the server, so it stays with you across devices once you sign in."
        action={<LinkButton href="/shop">Browse the collection</LinkButton>}
      />
    );
  }

  const checkoutHref = authenticated ? "/checkout" : "/checkout";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {cart.lines.map((line) => (
          <article key={line.id} className="hairline-b flex gap-4 py-5 first:pt-0">
            <MediaImage src={line.imageUrl} alt={line.name} className="aspect-[4/5] w-20 shrink-0 rounded-xl sm:w-24" sizes="96px" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/product/${line.slug}`} className="font-display text-base text-[#f4faff] hover:text-[#8ccbff]">
                    {line.name}
                  </Link>
                  {line.size || line.color ? (
                    <p className="meta-label-muted mt-1">{[line.size, line.color].filter(Boolean).join(" · ")}</p>
                  ) : null}
                  {!line.inStock ? <p className="text-xs text-rose-300">Only {line.stockAvailable} available</p> : null}
                </div>
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => void removeItem(line.id)}
                  className="rounded-full p-2 text-[#a8c0d5] transition hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-[#a8c0d5]/20 px-1.5">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={pending}
                    onClick={() => void updateItem(line.id, line.quantity - 1)}
                    className="rounded-full p-2 text-[#ddf3ff] disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-8 text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={pending || line.quantity >= line.stockAvailable}
                    onClick={() => void updateItem(line.id, line.quantity + 1)}
                    className="rounded-full p-2 text-[#ddf3ff] disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="font-display text-base text-[#f4faff]">{formatTaka(line.lineTotal)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="surface h-max space-y-5 rounded-[24px] p-[clamp(1.25rem,3vw,2rem)]">
        <p className="meta-label">Order summary</p>
        <div className="hairline-t space-y-3 pt-4 text-sm text-[#a8c0d5]">
          <div className="flex justify-between">
            <span>Items</span>
            <span className="text-[#f4faff]">{cart.itemCount}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span>Subtotal</span>
            <span className="font-display text-lg text-[#f4faff]">{formatTaka(cart.subtotal)}</span>
          </div>
          <p className="text-[11px] text-[#a8c0d5]/80">
            Delivery is added after you choose your district — the fee comes from the Supabase delivery settings.
          </p>
        </div>
        <LinkButton href={checkoutHref} size="lg" className="w-full">
          Continue to checkout
        </LinkButton>
        <Button variant="ghost" className="w-full" onClick={() => void refresh()}>
          Refresh from server
        </Button>
      </aside>
    </div>
  );
}
