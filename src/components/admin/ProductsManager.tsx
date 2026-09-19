"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import UiSelect from "@/components/UiSelect";
import { bdt } from "@/lib/format";
import { useGlobalLoading } from "@/lib/loading-store";
import { CATEGORIES } from "@/lib/clothing";
import type { AdminProductRow } from "@/lib/products";

type SortKey = "newest" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc" | "name";
type StockFilter = "all" | "in" | "low" | "out";

const statusBadge = (status: string) =>
  status === "active"
    ? "adm-badge adm-badge--success"
    : status === "draft"
      ? "adm-badge adm-badge--warn"
      : "adm-badge adm-badge--neutral";

export default function ProductsManager({ products }: { products: AdminProductRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ action: string; label: string } | null>(null);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Infinity;
    let list = products.filter((p) => {
      if (t && !p.name.toLowerCase().includes(t) && !p.sku.toLowerCase().includes(t)) return false;
      if (category && p.category !== category) return false;
      if (brand && p.brand !== brand) return false;
      if (status && p.status !== status) return false;
      if (p.price < min || p.price > max) return false;
      if (stockFilter === "out" && p.stock > 0) return false;
      if (stockFilter === "in" && !(p.stock > 5)) return false;
      if (stockFilter === "low" && !(p.stock > 0 && p.stock <= 5)) return false;
      return true;
    });
    switch (sort) {
      case "price-asc": list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
      case "stock-asc": list = [...list].sort((a, b) => a.stock - b.stock); break;
      case "stock-desc": list = [...list].sort((a, b) => b.stock - a.stock); break;
      case "name": list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break;
    }
    return list;
  }, [products, q, category, brand, status, stockFilter, minPrice, maxPrice, sort]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((s) => {
      if (allVisibleSelected) {
        const next = new Set(s);
        for (const p of filtered) next.delete(p.id);
        return next;
      }
      return new Set([...s, ...filtered.map((p) => p.id)]);
    });
  };

  const runBulk = async (action: string) => {
    if (!confirm || busy) return;
    setBusy(true);
    useGlobalLoading.getState().startTask();
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids: [...selected],
          action,
          data: { category: bulkCategory, stock: bulkStock === "" ? undefined : Number(bulkStock) },
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) window.alert(data.message ?? "Bulk action failed.");
      setSelected(new Set());
      setConfirm(null);
      router.refresh();
    } finally {
      setBusy(false);
      useGlobalLoading.getState().endTask();
    }
  };

  const removeOne = async (id: string, name: string) => {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    useGlobalLoading.getState().startTask();
    try {
      await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      useGlobalLoading.getState().endTask();
    }
  };

  const duplicateOne = async (id: string) => {
    setBusy(true);
    useGlobalLoading.getState().startTask();
    try {
      await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [id], action: "duplicate" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
      useGlobalLoading.getState().endTask();
    }
  };


  return (
    <div>
      {/* toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products or SKU…"
          className="w-56 rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
        />
        <UiSelect
          variant="admin"
          triggerClassName="ds-trigger--compact"
          ariaLabel="Filter by category"
          value={category}
          onChange={setCategory}
          options={[{ value: "", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
          placeholder="All categories"
        />
        <UiSelect
          variant="admin"
          triggerClassName="ds-trigger--compact"
          ariaLabel="Filter by brand"
          value={brand}
          onChange={setBrand}
          options={[{ value: "", label: "All brands" }, ...brands.map((b) => ({ value: b, label: b }))]}
          placeholder="All brands"
        />
        <UiSelect
          variant="admin"
          searchable={false}
          triggerClassName="ds-trigger--compact"
          ariaLabel="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
            { value: "archived", label: "Archived" },
          ]}
          placeholder="All statuses"
        />
        <UiSelect
          variant="admin"
          searchable={false}
          triggerClassName="ds-trigger--compact"
          ariaLabel="Filter by stock"
          value={stockFilter}
          onChange={(val) => setStockFilter(val as StockFilter)}
          options={[
            { value: "all", label: "Any stock" },
            { value: "in", label: "In stock" },
            { value: "low", label: "Low stock" },
            { value: "out", label: "Out of stock" },
          ]}
          placeholder="Any stock"
        />
        <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" min={0} placeholder="Min ৳" aria-label="Minimum price" className="w-20 rounded-lg border border-line bg-transparent px-3 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none" />
        <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" min={0} placeholder="Max ৳" aria-label="Maximum price" className="w-20 rounded-lg border border-line bg-transparent px-3 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none" />
        <UiSelect
          variant="admin"
          searchable={false}
          triggerClassName="ds-trigger--compact"
          ariaLabel="Sort products"
          value={sort}
          onChange={(val) => setSort(val as SortKey)}
          options={[
            { value: "newest", label: "Newest" },
            { value: "price-asc", label: "Price ↑" },
            { value: "price-desc", label: "Price ↓" },
            { value: "stock-asc", label: "Stock ↑" },
            { value: "stock-desc", label: "Stock ↓" },
            { value: "name", label: "Name A–Z" },
          ]}
          placeholder="Newest"
        />
        <Link href="/admin/products/new" className="ml-auto rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-foam hover:bg-white/15">
          + New product
        </Link>
      </div>

      {/* bulk actions */}
      {selected.size > 0 && (
        <div className="adm-fade mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line-soft bg-white/[0.03] px-4 py-3 text-sm text-mist">
          <span>{selected.size} selected</span>
          <button type="button" disabled={busy} onClick={() => setConfirm({ action: "publish", label: `Publish ${selected.size} product(s)?` })} className="rounded-lg border border-line-soft px-3 py-1.5 text-xs hover:text-foam">Publish</button>
          <button type="button" disabled={busy} onClick={() => setConfirm({ action: "draft", label: `Move ${selected.size} product(s) to draft?` })} className="rounded-lg border border-line-soft px-3 py-1.5 text-xs hover:text-foam">Draft</button>
          <button type="button" disabled={busy} onClick={() => setConfirm({ action: "archive", label: `Archive ${selected.size} product(s)?` })} className="rounded-lg border border-line-soft px-3 py-1.5 text-xs hover:text-foam">Archive</button>
          <UiSelect
            variant="admin"
            searchable={false}
            triggerClassName="ds-trigger--compact"
            ariaLabel="Bulk category"
            value={bulkCategory}
            onChange={setBulkCategory}
            options={[{ value: "", label: "Set category…" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
            placeholder="Set category…"
          />
          <button type="button" disabled={busy || !bulkCategory} onClick={() => setConfirm({ action: "update-category", label: `Update category for ${selected.size} product(s)?` })} className="rounded-lg border border-line-soft px-3 py-1.5 text-xs hover:text-foam disabled:opacity-40">Apply category</button>
          <input value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} type="number" min={0} placeholder="Stock" aria-label="Bulk stock value" className="w-20 rounded-lg border border-line bg-transparent px-2 py-1.5 text-xs text-foam focus:border-soft/60 focus:outline-none" />
          <button type="button" disabled={busy || bulkStock === ""} onClick={() => setConfirm({ action: "update-stock", label: `Set stock to ${bulkStock} for ${selected.size} product(s)?` })} className="rounded-lg border border-line-soft px-3 py-1.5 text-xs hover:text-foam disabled:opacity-40">Apply stock</button>
          <button type="button" disabled={busy} onClick={() => setConfirm({ action: "delete", label: `Delete ${selected.size} product(s)? This cannot be undone.` })} className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent disabled:opacity-40">Delete</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-mist hover:text-foam">Clear selection</button>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Confirm action">
          <div className="w-full max-w-sm rounded-xl border border-line-soft bg-[#0e2f4a] p-6 text-center">
            <p className="text-sm text-foam">{confirm.label}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" onClick={() => setConfirm(null)} className="rounded-lg border border-line-soft px-4 py-2 text-xs text-mist hover:text-foam">Cancel</button>
              <button type="button" onClick={() => void runBulk(confirm.action)} disabled={busy} className="rounded-lg bg-accent/20 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/30 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}



      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-mist">No products found.</p>
      ) : (
        <ul className="divide-y divide-line-soft rounded-xl border border-line-soft">
          <li className="flex items-center gap-4 p-3 text-xs text-mist">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all visible products" className="h-4 w-4 accent-white" />
            <span>Select all ({filtered.length})</span>
          </li>
          {filtered.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 p-4">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} aria-label={`Select ${p.name}`} className="h-4 w-4 accent-white" />
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-white/5">
                {p.image ? (
                  <Image src={p.image} alt={p.name} fill sizes="56px" className="object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[10px] text-mist/50">No image</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foam">{p.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mist">
                  {bdt(p.price)} · SKU {p.sku || "—"} · Stock {p.stock}
                  {p.category && <span>· {p.category}</span>}
                  {p.brand && <span>· {p.brand}</span>}
                  {p.visibility === "hidden" && <span className="adm-badge adm-badge--neutral">Hidden</span>}
                  {p.isNew && <span>· New</span>}
                  {p.isFeatured && <span>· Featured</span>}
                </p>
              </div>
              <span className={statusBadge(p.status)}>{p.status}</span>
              <Link href={`/admin/products/${p.id}`} className="rounded-lg border border-line-soft px-3 py-1.5 text-xs text-mist hover:text-foam">
                Edit
              </Link>
              <button
                type="button"
                onClick={() => void duplicateOne(p.id)}
                disabled={busy}
                className="rounded-lg border border-line-soft px-3 py-1.5 text-xs text-mist hover:text-foam disabled:opacity-50"
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => void removeOne(p.id, p.name)}
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent/10"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
