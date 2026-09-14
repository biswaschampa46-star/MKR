"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Check, ShoppingBag, Truck, ShieldCheck, Heart, Loader2, Ruler } from "lucide-react";
import { useCart, useUI } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { addToWishlist, removeFromWishlist, fetchWishlistIds } from "@/lib/customer";
import { trackTask } from "@/lib/loading-store";
import { bdt } from "@/lib/format";
import type { VariantGroup } from "@/db/schema";
import { PANT_WAIST_GROUP } from "@/lib/clothing";
import { findSizeGroup } from "@/lib/sizing";
import FindMySizeModal from "@/components/FindMySizeModal";

export default function PurchasePanel({
  product,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    image: string;
    price: number;
    variants: VariantGroup[];
    stock?: number;
    sizeRecommendationEnabled?: boolean;
  };
}) {
  const hasVariants = product.variants.length > 0;
  const pantLike = product.variants.some((g) => g.name === PANT_WAIST_GROUP);

  /* Find My Size — only when the admin toggle is ON and a real size group exists */
  const sizeGroup = findSizeGroup(product.variants);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.variants.map((v) => [v.name, v.options[0]])),
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const add = useCart((s) => s.add);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const setAuthOpen = useUI((s) => s.setAuthOpen);
  const user = useAuth((s) => s.user);
  const setPendingAction = useAuth((s) => s.setPendingAction);

  /* wishlist state — heart fills when this product is saved (signed-in customers) */
  const [wished, setWished] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);

  useEffect(() => {
    if (!user || !supabase) {
      setWished(false);
      return;
    }
    let live = true;
    fetchWishlistIds(user.id).then((ids) => {
      if (live) setWished(ids.has(product.id));
    });
    return () => {
      live = false;
    };
  }, [user, product.id]);

  const toggleWishlist = async () => {
    if (!user) {
      setPendingAction(() => doAdd);
      setAuthOpen(true);
      return;
    }
    setWishBusy(true);
    try {
      const res = await trackTask(wished
        ? removeFromWishlist(user.id, product.id)
        : addToWishlist(user.id, product.id));
      if (res.ok) setWished(!wished);
    } finally {
      setWishBusy(false);
    }
  };

  const variantLabel = hasVariants
    ? product.variants.map((v) => selected[v.name]).join(" / ")
    : "Standard";

  /* labeled selections (Waist Size / Leg Opening / Length) carried into cart & order */
  const attributes = pantLike
    ? product.variants
        .map((g) => ({ label: g.name, value: selected[g.name] ?? "" }))
        .filter((a) => a.value)
    : [];

  const ready = hasVariants ? product.variants.every((v) => selected[v.name]) : true;
  const stock = product.stock;
  const outOfStock = stock !== undefined && stock <= 0;
  const maxQty = stock !== undefined ? Math.min(Math.max(stock, 1), 99) : 99;

  const doAdd = () => {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        variant: variantLabel,
        price: product.price,
        ...(pantLike ? { attributes } : {}),
        ...(stock !== undefined ? { stock } : {}),
      },
      Math.min(qty, maxQty),
    );
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setCartOpen(true);
    }, 550);
  };

  const onAdd = () => {
    if (!ready || outOfStock) return;
    /* Auth gate — must be signed in (Google or email) before taking a product into the cart. */
    if (!user) {
      setPendingAction(() => doAdd);
      setAuthOpen(true);
      return;
    }
    doAdd();
  };

  return (
    <div>
      {outOfStock ? (
        <p role="status" className="adm-badge adm-badge--danger mt-9">
          Out of stock — check back soon
        </p>
      ) : stock !== undefined && stock <= 5 ? (
        <p role="status" className="adm-badge adm-badge--warn mt-9">
          Only {stock} left — order soon
        </p>
      ) : null}
      {/* variant groups */}
      {product.variants.map((group) => (
        <div key={group.name} className="mt-9">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="label">{group.name}</p>
            <p className="text-xs text-mist/70">{selected[group.name]}</p>
          </div>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={group.name}>
            {group.options.map((opt) => {
              const active = selected[group.name] === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected((s) => ({ ...s, [group.name]: opt }))}
                  className={`rounded-full border px-5 py-2.5 text-xs uppercase tracking-[0.14em] transition-all duration-300 ${
                    active
                      ? "border-soft/70 bg-soft/10 text-ice"
                      : "border-line text-mist hover:border-soft/40 hover:text-foam"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {pantLike && (
        <p className="mt-3 text-xs leading-relaxed text-mist/70">
          Select a waist size and a leg opening to continue.
        </p>
      )}

      {/* Find My Size — directly below the size selector, MKR design language */}
      {product.sizeRecommendationEnabled && sizeGroup && (
        <div className="mt-6">
          <p className="text-xs text-mist/80">Confused about which size to choose?</p>
          <button
            type="button"
            onClick={() => setSizeModalOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-soft/40 px-5 py-2 text-xs uppercase tracking-[0.14em] text-soft transition-colors hover:border-soft/70 hover:text-ice"
          >
            <Ruler className="h-3.5 w-3.5" strokeWidth={1.5} />
            Find My Size
          </button>
        </div>
      )}
      {sizeModalOpen && sizeGroup && (
        <FindMySizeModal
          open={sizeModalOpen}
          onClose={() => setSizeModalOpen(false)}
          productId={product.id}
          productName={product.name}
          sizeGroupLabel={sizeGroup.name}
          availableSizes={sizeGroup.options}
          onSelect={(size) => setSelected((s) => ({ ...s, [sizeGroup.name]: size }))}
        />
      )}

      {/* quantity + add */}
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center rounded-full border border-line">
          <button
            type="button"
            className="grid h-12 w-11 place-items-center text-mist transition-colors hover:text-ice disabled:opacity-40"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            disabled={outOfStock}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm text-foam" aria-live="polite">{qty}</span>
          <button
            type="button"
            className="grid h-12 w-11 place-items-center text-mist transition-colors hover:text-ice disabled:opacity-40"
            onClick={() => setQty((q) => Math.min(q + 1, maxQty))}
            aria-label="Increase quantity"
            disabled={outOfStock || qty >= maxQty}
            title={qty >= maxQty ? "Only a few left in stock" : undefined}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={!ready || outOfStock}
          className={`btn btn-solid flex-1 sm:flex-none sm:min-w-60 ${added ? "added-pop" : ""}`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> Added
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" strokeWidth={1.5} /> Add to cart
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => void toggleWishlist()}
          disabled={wishBusy}
          aria-busy={wishBusy}
          aria-pressed={wished}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          title={wished ? "Saved to wishlist" : "Add to wishlist"}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
            wished
              ? "border-soft/60 bg-soft/15 text-soft"
              : "border-line text-mist hover:border-soft/40 hover:text-ice"
          }`}
        >
          {wishBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className="h-4 w-4" fill={wished ? "currentColor" : "none"} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* quiet reassurances — no invented claims */}
      <ul className="mt-8 space-y-3 border-t border-line-soft pt-7 text-xs leading-relaxed text-mist/80">
        <li className="flex items-center gap-3">
          <Truck className="h-4 w-4 shrink-0 text-soft/70" strokeWidth={1.5} />
          Delivery across Bangladesh — inside Chattogram {bdt(70)} · outside Chattogram {bdt(130)}
        </li>
        <li className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-soft/70" strokeWidth={1.5} />
          Pay the delivery charge in advance via bKash, Nagad or Rocket — products can be paid cash on delivery or fully in advance
        </li>
      </ul>
    </div>
  );
}
