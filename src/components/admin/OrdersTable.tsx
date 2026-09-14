"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subscribeOrderEvents } from "@/lib/realtime-bus";
import { Search, ChevronLeft, ChevronRight, Download, ArrowUpDown } from "lucide-react";
import { bdt, stageLabel, methodLabel, formatDate } from "@/lib/format";
import UiSelect from "@/components/UiSelect";

export type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: Date | string;
  items: { name: string; qty: number }[];
};

type SortKey = "createdAt" | "total" | "customerName";

const STATUS_BADGE: Record<string, string> = {
  pending_payment: "adm-badge--warn",
  payment_verified: "adm-badge--info",
  confirmed: "adm-badge--info",
  processing: "adm-badge--info",
  shipped: "adm-badge--info",
  delivered: "adm-badge--success",
  cancelled: "adm-badge--danger",
};

const PAGE_SIZE = 8;

export default function OrdersTable({ orders: initialOrders }: { orders: OrderRow[] }) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const seq = useRef(0);

  /* ——— live: refetch on realtime events / window nudges, full replace → no dupes ——— */
  const refetch = useCallback(async () => {
    const n = ++seq.current;
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok: boolean;
        orders: (Omit<OrderRow, "items"> & { items: { name: string; qty: number }[] | null })[];
      };
      if (data.ok && seq.current === n) {
        setOrders(data.orders.map((o) => ({ ...o, items: Array.isArray(o.items) ? o.items : [] })));
      }
    } catch (err) {
      console.error("orders table: live refetch failed", err);
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

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = orders.filter(
      (o) =>
        (status === "all" || o.status === status) &&
        (!needle ||
          o.orderNumber.toLowerCase().includes(needle) ||
          o.customerName.toLowerCase().includes(needle) ||
          o.phone.includes(needle)),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "createdAt") return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      if (sort.key === "total") return (a.total - b.total) * dir;
      return a.customerName.localeCompare(b.customerName) * dir;
    });
  }, [orders, q, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => (allChecked ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportCsv = () => {
    const header = "Order,Customer,Phone,City,Items,Total,Payment,Status,Date";
    const lines = filtered.map((o) =>
      [
        o.orderNumber,
        o.customerName,
        o.phone,
        o.city,
        o.items.map((i) => `${i.qty}× ${i.name}`).join("; "),
        o.total,
        methodLabel(o.paymentMethod),
        stageLabel(o.status),
        formatDate(o.createdAt),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mkr-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setSortKey = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  return (
    <section className="adm-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="flex-1 basis-56">
          <h2 className="font-display text-base font-bold text-[var(--adm-text)]">Recent orders</h2>
          <p className="mt-0.5 text-sm text-[var(--adm-sub)]">
            {filtered.length} {filtered.length === 1 ? "order" : "orders"}
            {selected.size > 0 && <> · <span className="font-semibold text-[var(--adm-primary-soft)]">{selected.size} selected</span></>}
          </p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--adm-sub)]" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search orders…"
            aria-label="Search orders"
            className="adm-input w-44 !py-2 pl-9 sm:w-56"
          />
        </div>
        <UiSelect
          variant="admin"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
          options={useMemo(
            () => [
              { value: "all", label: "All statuses" },
              ...Object.keys(STATUS_BADGE).map((s) => ({ value: s, label: stageLabel(s) })),
            ],
            [],
          )}
          placeholder="All statuses"
          searchable={false}
          ariaLabel="Filter by status"
          triggerClassName="ds-trigger--compact"
        />
        <button type="button" onClick={exportCsv} className="adm-btn adm-btn-ghost" disabled={filtered.length === 0}>
          <Download size={15} />
          Export
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold text-[var(--adm-text)]">No orders found</p>
          <p className="mt-1 text-sm text-[var(--adm-sub)]">
            {q || status !== "all" ? "Try adjusting the search or filter." : "Orders will appear here as customers check out."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="adm-table w-full min-w-[820px]">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all on page" className="h-4 w-4 accent-[var(--adm-primary)]" />
                  </th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Products</th>
                  <th>
                    <button type="button" onClick={() => setSortKey("total")} className="inline-flex items-center gap-1 uppercase">
                      Amount <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>
                    <button type="button" onClick={() => setSortKey("createdAt")} className="inline-flex items-center gap-1 uppercase">
                      Date <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} aria-label={`Select ${o.orderNumber}`} className="h-4 w-4 accent-[var(--adm-primary)]" />
                    </td>
                    <td className="font-display font-bold tracking-wide text-[var(--adm-text)]">{o.orderNumber}</td>
                    <td>
                      <p className="font-medium text-[var(--adm-text)]">{o.customerName}</p>
                      <p className="text-xs text-[var(--adm-sub)]">{o.city}</p>
                    </td>
                    <td className="max-w-52 truncate text-[var(--adm-sub)]">
                      {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    </td>
                    <td className="font-semibold text-[var(--adm-text)]">{bdt(o.total)}</td>
                    <td className="text-[var(--adm-sub)]">{methodLabel(o.paymentMethod)}</td>
                    <td>
                      <span className={`adm-badge ${STATUS_BADGE[o.status] ?? "adm-badge--neutral"}`}>{stageLabel(o.status)}</span>
                    </td>
                    <td className="whitespace-nowrap text-[var(--adm-sub)]">{formatDate(o.createdAt)}</td>
                    <td>
                      <Link href={`/admin/orders`} className="text-xs font-semibold text-[var(--adm-primary-soft)] hover:underline">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[var(--adm-border)] p-4 sm:px-6">
            <p className="text-xs text-[var(--adm-sub)]">
              Page {safePage + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage === 0} className="adm-btn adm-btn-ghost !px-2.5" aria-label="Previous page">
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1} className="adm-btn adm-btn-ghost !px-2.5" aria-label="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
