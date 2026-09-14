"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Package, MapPin, CreditCard, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { fetchMyOrders, type CustomerOrder } from "@/lib/customer";
import { bdt, formatDate, methodLabel } from "@/lib/format";
import { variantLabel } from "@/lib/variant-attributes";
import {
  ProfileHeader, EmptyState, Skeleton, StatusBadge, Modal, ErrorState,
} from "@/components/profile/ProfileShell";

const ORDER_STAGES = ["pending_payment", "payment_verified", "confirmed", "processing", "shipped", "delivered"];

/* ───────────────────────── order details ───────────────────────── */
export function OrderDetailsModal({ order, onClose }: { order: CustomerOrder | null; onClose: () => void }) {
  if (!order) return null;
  const cancelled = order.status === "cancelled";
  const currentIdx = cancelled ? -1 : ORDER_STAGES.indexOf(order.status);
  const remaining = Math.max(0, order.total - order.amount_paid);

  return (
    <Modal open={!!order} onClose={onClose} wide>
      <p className="label !tracking-[0.2em]">Order Details</p>
      <h3 className="font-display mt-3 text-lg font-bold tracking-[0.12em] text-foam">{order.order_number}</h3>
      <p className="mt-1.5 text-xs text-mist">{formatDate(order.created_at)}</p>
      <div className="mt-3"><StatusBadge status={order.status} /></div>

      {!cancelled && (
        <ol className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ORDER_STAGES.map((stage, i) => (
            <li key={stage} className={`rounded-lg border px-2 py-2 text-center text-[0.56rem] font-semibold uppercase tracking-[0.08em] ${
              i <= currentIdx ? "border-soft/40 bg-soft/10 text-soft" : "border-line-soft text-mist/40"
            }`}>
              {stage.replace("_", " ")}
            </li>
          ))}
        </ol>
      )}

      <section className="mt-7">
        <p className="label !tracking-[0.2em]">Products</p>
        <ul className="mt-4 space-y-4">
          {order.items.map((item, i) => (
            <li key={`${item.productId}-${i}`} className="flex items-center gap-4">
              <div className="media-frame relative h-16 w-12 shrink-0">
                <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-[0.8rem] font-semibold uppercase tracking-[0.04em] text-foam">{item.name}</p>
                <p className="mt-1 text-[0.7rem] text-mist">
                  {variantLabel(item) || "Standard"} · ×{item.qty} · {bdt(item.price)} each
                </p>
              </div>
              <p className="text-sm text-ice">{bdt(item.price * item.qty)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-7 grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-line-soft p-5">
          <p className="label flex items-center gap-2 !tracking-[0.2em]"><MapPin className="h-3.5 w-3.5 text-soft" /> Delivery</p>
          <dl className="mt-4 space-y-2.5 text-[0.78rem] leading-relaxed">
            <div><dt className="text-mist/60">Name</dt><dd className="text-foam">{order.customer_name}</dd></div>
            <div><dt className="text-mist/60">Phone</dt><dd className="text-foam">{order.phone}</dd></div>
            <div><dt className="text-mist/60">Address</dt><dd className="text-foam">{order.address}</dd></div>
            <div><dt className="text-mist/60">Area / City</dt><dd className="text-foam">{order.city} ({order.delivery_zone === "inside_ctg" ? "inside Chattogram" : "outside Chattogram"})</dd></div>
            <div><dt className="text-mist/60">Delivery charge</dt><dd className="text-foam">{order.shipping_fee === 0 ? "Free" : bdt(order.shipping_fee)}</dd></div>
          </dl>
        </section>

        <section className="rounded-xl border border-line-soft p-5">
          <p className="label flex items-center gap-2 !tracking-[0.2em]"><CreditCard className="h-3.5 w-3.5 text-soft" /> Payment</p>
          <dl className="mt-4 space-y-2.5 text-[0.78rem]">
            <div className="flex justify-between"><dt className="text-mist/60">Method</dt><dd className="text-foam">{methodLabel(order.payment_method)}</dd></div>
            <div className="flex justify-between"><dt className="text-mist/60">Status</dt><dd className="text-foam">{order.product_payment_status === "paid" ? "Paid" : order.product_payment_status === "cod" ? "Cash on delivery" : "Awaiting verification"}</dd></div>
            <div className="flex justify-between"><dt className="text-mist/60">Paid amount</dt><dd className="font-semibold text-soft">{bdt(order.amount_paid)}{order.amount_paid > 0 ? " · verified" : ""}</dd></div>
            {remaining > 0 && (
              <div className="flex justify-between"><dt className="text-mist/60">Remaining</dt><dd className="text-amber-300">{bdt(remaining)}</dd></div>
            )}
          </dl>
        </section>
      </div>

      <section className="mt-7 rounded-xl border border-line-soft p-5">
        <p className="label flex items-center gap-2 !tracking-[0.2em]"><Receipt className="h-3.5 w-3.5 text-soft" /> Summary</p>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between"><dt className="text-mist">Product subtotal</dt><dd className="text-foam">{bdt(order.subtotal)}</dd></div>
          {order.discount > 0 && (
            <div className="flex justify-between"><dt className="text-mist">Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</dt><dd className="text-soft">−{bdt(order.discount)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-mist">Delivery charge</dt><dd className="text-foam">{order.shipping_fee === 0 ? "Free" : bdt(order.shipping_fee)}</dd></div>
          <div className="flex items-baseline justify-between border-t border-line-soft pt-3">
            <dt className="label">Grand Total</dt>
            <dd className="font-display text-xl font-bold text-ice">{bdt(order.total)}</dd>
          </div>
        </dl>
      </section>
    </Modal>
  );
}

/* ───────────────────────── orders list page ───────────────────────── */
function MyOrdersContent() {
  const user = useAuth((s) => s.user);
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CustomerOrder | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setOrders(await fetchMyOrders(user.id));
    } catch {
      setError("Could not load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /* Supabase Realtime: live status updates without a page refresh */
  useEffect(() => {
    if (!supabase || !user) return;
    const sb = supabase;
    const channel = sb
      .channel(`my-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? ({ ...o, ...payload.new } as CustomerOrder) : o)),
          );
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [user]);

  /* deep-link: /profile/orders?open=<id> (used by the overview page) */
  const openId = searchParams.get("open");
  useEffect(() => {
    if (!openId || orders.length === 0 || selected) return;
    const found = orders.find((o) => o.id === openId);
    if (found) setSelected(found);
  }, [openId, orders, selected]);

  return (
    <div className="min-w-0">
      <ProfileHeader title="My Orders" subtitle="Every order you placed, in one place. Status updates live as the store processes them." />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          subtitle="You haven't placed any orders. Explore the shop and your orders will show up here."
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelected(o)}
              className="card-glass block w-full rounded-2xl p-5 text-left transition-colors hover:bg-white/5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[0.82rem] font-bold tracking-[0.12em] text-ice">{o.order_number}</p>
                  <p className="mt-1.5 text-[0.72rem] text-mist">
                    {formatDate(o.created_at)} · {methodLabel(o.payment_method)}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
                {o.items.slice(0, 4).map((item, i) => (
                  <div key={`${item.productId}-${i}`} className="media-frame relative h-14 w-11 shrink-0">
                    <Image src={item.image} alt={item.name} fill sizes="44px" className="object-cover" />
                  </div>
                ))}
                {o.items.length > 4 && (
                  <span className="text-[0.7rem] text-mist">+{o.items.length - 4} more</span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-4 text-[0.75rem]">
                <span className="text-mist">{o.items.length} item{o.items.length > 1 ? "s" : ""}</span>
                <span className="font-display font-bold text-foam">{bdt(o.total)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <OrderDetailsModal order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>}>
      <MyOrdersContent />
    </Suspense>
  );
}
