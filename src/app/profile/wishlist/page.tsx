"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { useCart } from "@/lib/store";
import { fetchWishlist, removeFromWishlist, type WishlistEntry } from "@/lib/customer";
import { bdt } from "@/lib/format";
import {
  ProfileHeader, EmptyState, Skeleton, ErrorState, Flash,
} from "@/components/profile/ProfileShell";

export default function WishlistPage() {
  const user = useAuth((s) => s.user);
  const cartAdd = useCart((s) => s.add);
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setItems(await fetchWishlist(user.id));
    } catch {
      setError("Could not load your wishlist. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (productId: string) => {
    if (!user) return;
    setBusyId(productId);
    const res = await removeFromWishlist(user.id, productId);
    setBusyId(null);
    if (res.ok) {
      setItems((prev) => prev.filter((w) => w.product_id !== productId));
      setMsg({ kind: "ok", text: "Removed from wishlist." });
      setTimeout(() => setMsg(null), 2500);
    } else {
      setMsg({ kind: "error", text: res.message });
    }
  };

  const moveToCart = (w: WishlistEntry) => {
    if (!w.product) return;
    const firstVariant = w.product.variants?.[0]?.options?.[0] ?? "Standard";
    cartAdd(
      {
        productId: w.product.id,
        slug: w.product.slug,
        name: w.product.name,
        image: w.product.image,
        variant: firstVariant,
        price: w.product.price,
      },
      1,
    );
    setMsg({ kind: "ok", text: "Added to your cart." });
    setTimeout(() => setMsg(null), 2500);
  };

  return (
    <div className="min-w-0">
      <ProfileHeader title="Wishlist" subtitle="Products you've saved. Add them to your cart with one tap." />
      {msg && <Flash kind={msg.kind} text={msg.text} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-56 w-full" /><Skeleton className="h-56 w-full" /><Skeleton className="h-56 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          subtitle="Explore the shop and tap the heart on any product to save it here."
          action={<Link href="/shop" className="btn btn-solid mt-2">Explore Shop</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <div key={w.id} className="card-glass overflow-hidden rounded-2xl">
              <Link href={`/product/${w.product?.slug ?? ""}`} className="block">
                <div className="media-frame relative aspect-[4/5] w-full">
                  <Image src={w.product?.image ?? ""} alt={w.product?.name ?? "Product"} fill sizes="(min-width:1024px)33vw,50vw" className="object-cover" />
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/product/${w.product?.slug ?? ""}`} className="font-display line-clamp-2 text-[0.82rem] font-semibold uppercase tracking-[0.04em] text-foam hover:text-ice">
                  {w.product?.name ?? "Product removed"}
                </Link>
                <p className="mt-2 font-display text-lg font-bold text-ice">{w.product ? bdt(w.product.price) : "—"}</p>
                <p className="mt-1 text-[0.68rem] text-mist/70">Saved {new Date(w.created_at).toLocaleDateString("en-GB")}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => moveToCart(w)} disabled={!w.product} className="btn btn-solid !px-3.5 !py-2 text-[0.62rem]">
                    <ShoppingBag className="h-3 w-3" /> Add to cart
                  </button>
                  <button type="button" onClick={() => remove(w.product_id)} disabled={busyId === w.product_id} className="btn !px-3.5 !py-2 text-[0.62rem] !border-[#ff9b8a]/30 !bg-[#ff9b8a]/10 !text-[#ffb3a6]">
                    {busyId === w.product_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}