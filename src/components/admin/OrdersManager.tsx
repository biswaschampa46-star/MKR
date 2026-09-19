"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bdt, stageLabel, methodLabel, formatDate } from "@/lib/format";
import type { Order, OrderItem } from "@/db/schema";
import UiSelect from "@/components/UiSelect";
import { subscribeOrderEvents } from "@/lib/realtime-bus";
import { useGlobalLoading } from "@/lib/loading-store";
import { variantLabel } from "@/lib/variant-attributes";

const STATUSES = [
  "pending_payment",
  "payment_verified",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: stageLabel(s) }));

export default function OrdersManager({ orders: initialOrders }: { orders: Order[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  /* ——— live orders: server render = snapshot, then realtime-driven refetch ——— */
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const seq = useRef(0);

  const refetch = useCallback(async () => {
    const n = ++seq.current;
    useGlobalLoading.getState().startTask();
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { ok: boolean; orders: Order[] };
      if (data.ok && seq.current === n) {
        setOrders(data.orders); // full replace → no duplicates possible
      }
    } catch (err) {
      console.error("orders: live refetch failed", err);
    } finally {
      useGlobalLoading.getState().endTask();
    }
  }, []);

  useEffect(() => {
    const off = subscribeOrderEvents(() => void refetch());
    const onExternal = () => void refetch();
    window.addEventListener("mkr:orders-changed", onExternal);
    return () => {
      off();
      window.removeEventListener("mkr:orders-changed", onExternal);
    };
  }, [refetch]);

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (filter === "all" || o.status === filter) &&
          (o.orderNumber.toLowerCase().includes(q.trim().toLowerCase()) ||
            o.customerName.toLowerCase().includes(q.trim().toLowerCase()) ||
            o.phone.includes(q.trim())),
      ),
    [orders, filter, q],
  );

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    useGlobalLoading.getState().startTask();
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await refetch(); // status change broadcasts → this tab updates via event too
      router.refresh();
    } finally {
      setBusyId(null);
      useGlobalLoading.getState().endTask();
    }
  };

  const action = async (id: string, act: "verify_payment" | "collect_cod") => {
    setBusyId(id);
    useGlobalLoading.getState().startTask();
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: act }),
      });
      await refetch();
      router.refresh();
    } finally {
      setBusyId(null);
      useGlobalLoading.getState().endTask();
    }
  };

  const remove = async (id: string, num: string) => {
    if (!confirm(`Delete order ${num}? This cannot be undone.`)) return;
    setBusyId(id);
    useGlobalLoading.getState().startTask();
    try {
      await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      await refetch();
      router.refresh();
    } finally {
      setBusyId(null);
      useGlobalLoading.getState().endTask();
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order #, name, phone…"
          className="w-64 rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
        />
        <UiSelect
          variant="admin"
          value={filter}
          onChange={setFilter}
          options={useMemo(
            () => [
              { value: "all", label: "All statuses" },
              ...STATUSES.map((s) => ({ value: s, label: stageLabel(s) })),
            ],
            [],
          )}
          placeholder="All statuses"
          searchable={false}
          ariaLabel="Filter by status"
          triggerClassName="ds-trigger--compact"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-mist">No orders found.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((o) => (
            <li key={o.id} className="rounded-xl border border-line-soft p-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="min-w-40">
                  <p className="font-display text-sm font-bold tracking-[0.1em] text-foam">{o.orderNumber}</p>
                  <p className="mt-1 text-xs text-mist">{formatDate(o.createdAt)}</p>
                </div>
                <div className="min-w-44">
                  <p className="text-sm text-foam">{o.customerName}</p>
                  <p className="mt-1 text-xs text-mist">{o.phone} · {o.city}</p>
                </div>
                <div className="min-w-32">
                  <p className="text-sm text-ice">{bdt(o.total)}</p>
                  <p className="mt-1 text-xs text-mist">
                    {o.paymentPurpose === "full_order" ? "Full prepaid" : "Delivery prepaid + COD"} · {methodLabel(o.paymentMethod)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {o.deliveryPaymentStatus !== "paid" && (
                    <button
                      type="button"
                      onClick={() => action(o.id, "verify_payment")}
                      disabled={busyId === o.id}
                      className="rounded-lg border border-soft/50 px-3 py-1.5 text-xs text-soft hover:bg-soft/10 disabled:opacity-50"
                    >
                      Verify payment
                    </button>
                  )}
                  {o.codAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => action(o.id, "collect_cod")}
                      disabled={busyId === o.id}
                      className="rounded-lg border border-amber-200/40 px-3 py-1.5 text-xs text-amber-200/90 hover:bg-amber-200/10 disabled:opacity-50"
                    >
                      COD collected
                    </button>
                  )}
                  <UiSelect
                    variant="admin"
                    value={o.status}
                    disabled={busyId === o.id}
                    onChange={(v) => setStatus(o.id, v)}
                    options={STATUS_OPTIONS}
                    placeholder="Select status"
                    searchable={false}
                    ariaLabel={`Change status of ${o.orderNumber}`}
                    triggerClassName="ds-trigger--compact"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(o.id, o.orderNumber)}
                  disabled={busyId === o.id}
                  className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-mist hover:text-foam">
                  Items & address
                </summary>
                <ul className="mt-4 space-y-3">
                  {o.items.map((item: OrderItem) => (
                    <li key={`${item.productId}-${item.variant}`} className="flex items-center gap-4">
                      <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-white/5">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-[10px] text-mist/50">—</span>
                        )}
                      </div>
                      <p className="flex-1 text-sm text-foam">
                        {item.name} <span className="text-mist">· {variantLabel(item)} × {item.qty}</span>
                      </p>
                      <p className="text-sm text-ice">{bdt(item.price * item.qty)}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-line-soft pt-3 text-xs leading-relaxed text-mist">
                  {o.customerName} · {o.phone} · {o.address}, {o.city}
                  {o.notes ? ` — Note: ${o.notes}` : ""}
                  {o.senderNumber ? ` — Sender: ${o.senderNumber}` : ""}
                </p>

                {/* payment breakdown */}
                <dl className="mt-4 grid gap-x-8 gap-y-2 border-t border-line-soft pt-3 text-xs sm:grid-cols-2">
                  <div className="flex justify-between">
                    <dt className="text-mist">Subtotal</dt>
                    <dd className="text-foam">{bdt(o.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-mist">Discount {o.couponCode ? `(${o.couponCode})` : ""}</dt>
                    <dd className="text-foam">{o.discount > 0 ? `−${bdt(o.discount)}` : bdt(0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-mist">Delivery ({o.deliveryZone === "inside_ctg" ? "inside Chattogram" : "outside Chattogram"})</dt>
                    <dd className="text-foam">{bdt(o.shippingFee)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-mist">Grand total</dt>
                    <dd className="font-semibold text-ice">{bdt(o.total)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-mist">Amount paid</dt>
                    <dd className={o.amountPaid > 0 ? "text-soft" : "text-mist"}>{bdt(o.amountPaid)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-mist">COD amount</dt>
                    <dd className={o.codAmount > 0 ? "text-amber-200/90" : "text-mist"}>{bdt(o.codAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-mist">Delivery payment</dt>
                    <dd className={o.deliveryPaymentStatus === "paid" ? "text-soft" : "text-amber-200/90"}>
                      {o.deliveryPaymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-mist">Product payment</dt>
                    <dd className="text-mist">
                      {o.productPaymentStatus === "paid" ? "Paid" : o.productPaymentStatus === "cod" ? "COD" : "Unpaid"}
                    </dd>
                  </div>
                </dl>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
