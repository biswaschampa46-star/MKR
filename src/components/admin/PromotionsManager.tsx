"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  computeStatus,
  STATUS_META,
  formatDhaka,
  type CampaignStatus,
} from "@/lib/promotion-utils";

export type CampaignRow = {
  id: string;
  campaignName: string;
  label: string;
  heading: string;
  description: string;
  campaignType: string;
  discountKind: string;
  discountValue: number;
  couponCode: string;
  ctaText: string;
  ctaUrl: string;
  bgMode: string;
  bgColor: string;
  bgColor2: string;
  textColor: string;
  accentColor: string;
  buttonColor: string;
  buttonTextColor: string;
  radius: number;
  height: string;
  layout: string;
  align: string;
  gradientEnabled: boolean;
  animationEnabled: boolean;
  imageUrl: string;
  mobileImageUrl: string;
  placement: string;
  targetType: string;
  targetId: string;
  startAt: string | null;
  endAt: string | null;
  priority: number;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const PLACEMENT_LABELS: Record<string, string> = {
  announcement: "Announcement Bar",
  home_top: "Homepage Top",
  below_hero: "Below Hero",
  above_products: "Above Products",
  between_sections: "Between Sections",
  product_page: "Product Page",
  category_page: "Category Page",
};

const TYPE_LABELS: Record<string, string> = {
  percentage: "Percentage Discount",
  flat: "Flat Discount",
  flash_sale: "Flash Sale",
  limited_time: "Limited Time",
  new_arrival: "New Arrival",
  free_delivery: "Free Delivery",
  coupon: "Coupon Campaign",
  special: "Special Offer",
  custom: "Custom",
};

type SortKey = "priority" | "newest" | "name" | "status";

export default function PromotionsManager({
  initial,
}: {
  initial: CampaignRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>("all");
  const [placementFilter, setPlacementFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  /* Draft = created but not yet configured with any visible content. */
  const statusOf = (r: CampaignRow): CampaignStatus => {
    if (
      !r.heading.trim() &&
      !r.ctaText.trim() &&
      r.discountKind === "none" &&
      !r.description.trim()
    )
      return "draft";
    return computeStatus(r);
  };

  const filtered = useMemo(() => {
    let out = rows.filter((r) => {
      const hay = `${r.campaignName} ${r.label} ${r.heading} ${r.couponCode}`.toLowerCase();
      if (q.trim() && !hay.includes(q.trim().toLowerCase())) return false;
      if (placementFilter !== "all" && r.placement !== placementFilter) return false;
      if (statusFilter !== "all" && statusOf(r) !== statusFilter) return false;
      return true;
    });
    switch (sort) {
      case "newest":
        out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "name":
        out = [...out].sort((a, b) => a.campaignName.localeCompare(b.campaignName));
        break;
      case "status":
        out = [...out].sort(
          (a, b) => statusOf(a).localeCompare(statusOf(b)),
        );
        break;
      default:
        out = [...out].sort(
          (a, b) => a.priority - b.priority || a.sortOrder - b.sortOrder,
        );
    }
    return out;
  }, [rows, q, statusFilter, placementFilter, sort]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusyId(null);
    if (!data.ok) {
      setError(data.message ?? "Operation failed.");
      return false;
    }
    return true;
  };

  const toggle = async (r: CampaignRow) => {
    const ok = await patch(r.id, { isEnabled: !r.isEnabled });
    if (ok) setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, isEnabled: !x.isEnabled } : x)));
  };

  const remove = async (r: CampaignRow) => {
    if (!confirm(`Delete “${r.campaignName}”? This cannot be undone.`)) return;
    setBusyId(r.id);
    setError("");
    const res = await fetch(`/api/admin/promotions/${r.id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusyId(null);
    if (!data.ok) {
      setError(data.message ?? "Delete failed.");
      return;
    }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  };

  const duplicate = async (r: CampaignRow) => {
    setBusyId(r.id);
    setError("");
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...r,
          campaignName: `${r.campaignName} (copy)`,
          startAtLocal: "",
          endAtLocal: "",
          isEnabled: false,
        }),
      });
      const data = (await res.json()) as { ok: boolean; id?: string; message?: string };
      if (!data.ok || !data.id) {
        setError(data.message ?? "Duplicate failed.");
        return;
      }
      setRows((rs) => [
        ...rs,
        {
          ...r,
          id: data.id!,
          campaignName: `${r.campaignName} (copy)`,
          isEnabled: false,
          startAt: null,
          endAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      router.refresh();
    } catch {
      setError("Duplicate failed.");
    } finally {
      setBusyId(null);
    }
  };

  /* drag-and-drop reorder (within the current filtered view) */
  const onDrop = async (targetId: string) => {
    const from = dragId.current;
    dragId.current = null;
    setDragOverId(null);
    if (!from || from === targetId) return;
    const list = [...filtered];
    const fromIdx = list.findIndex((r) => r.id === from);
    const toIdx = list.findIndex((r) => r.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    /* persist sort_order for ALL rows of this placement so ordering sticks */
    const placement = list[0].placement;
    const samePlacement = rows
      .filter((r) => r.placement === placement)
      .sort((a, b) => a.priority - b.priority || a.sortOrder - b.sortOrder);
    const orderedIds = list
      .filter((r) => r.placement === placement)
      .map((r) => r.id);
    const finalOrder = [
      ...orderedIds,
      ...samePlacement.map((r) => r.id).filter((id) => !orderedIds.includes(id)),
    ];

    setRows((rs) =>
      rs.map((r) => {
        const idx = finalOrder.indexOf(r.id);
        return idx >= 0 ? { ...r, sortOrder: idx } : r;
      }),
    );

    const res = await fetch("/api/admin/promotions/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: finalOrder }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    if (!data.ok) setError(data.message ?? "Reorder failed.");
  };

  const inputCls =
    "rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search campaigns…"
          className={`${inputCls} w-56`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | CampaignStatus)} className={inputCls}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="disabled">Disabled</option>
        </select>
        <select value={placementFilter} onChange={(e) => setPlacementFilter(e.target.value)} className={inputCls}>
          <option value="all">All placements</option>
          {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={inputCls}>
          <option value="priority">Sort: Priority</option>
          <option value="newest">Sort: Newest</option>
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
        </select>
        <Link
          href="/admin/marketing/new"
          className="ml-auto rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-foam hover:bg-white/15"
        >
          + New banner
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-accent">{error}</p>}

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-mist">
          No campaigns found. Create your first banner to see it on the store.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft rounded-xl border border-line-soft">
          {filtered.map((r) => {
            const st = statusOf(r);
            const meta = STATUS_META[st];
            return (
              <li
                key={r.id}
                draggable
                onDragStart={() => (dragId.current = r.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(r.id);
                }}
                onDragLeave={() => setDragOverId((x) => (x === r.id ? null : x))}
                onDrop={() => onDrop(r.id)}
                className={`flex cursor-grab flex-wrap items-center gap-4 p-4 transition-colors ${
                  dragOverId === r.id ? "bg-white/5" : ""
                }`}
              >
                {/* mini color swatch / thumbnail */}
                {r.imageUrl ? (
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-line-soft">
                    <Image src={r.imageUrl} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div
                    className="h-12 w-20 shrink-0 rounded-md border border-line-soft"
                    style={{
                      background:
                        r.bgMode === "gradient"
                          ? `linear-gradient(120deg, ${r.bgColor}, ${r.bgColor2})`
                          : r.bgColor,
                    }}
                    aria-hidden="true"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foam">{r.campaignName}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[0.65rem] uppercase tracking-wider ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="rounded-full border border-line-soft px-2 py-0.5 text-[0.65rem] text-mist">
                      {PLACEMENT_LABELS[r.placement] ?? r.placement}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-mist">
                    {TYPE_LABELS[r.campaignType] ?? r.campaignType}
                    {r.discountValue > 0 && r.discountKind === "percentage" ? ` · ${r.discountValue}% OFF` : ""}
                    {r.discountValue > 0 && r.discountKind === "fixed" ? ` · ৳${r.discountValue} OFF` : ""}
                    {r.couponCode ? ` · ${r.couponCode}` : ""}
                    {r.startAt || r.endAt
                      ? ` · ${formatDhaka(r.startAt)} → ${formatDhaka(r.endAt)}`
                      : ""}
                    {` · Priority ${r.priority}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(r)}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-line-soft px-3 py-1.5 text-xs text-mist hover:text-foam disabled:opacity-50"
                  >
                    {r.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <Link
                    href={`/admin/promotions/${r.id}`}
                    className="rounded-lg border border-line-soft px-3 py-1.5 text-xs text-mist hover:text-foam"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => duplicate(r)}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-line-soft px-3 py-1.5 text-xs text-mist hover:text-foam disabled:opacity-50"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-mist/70">
        Tip: drag rows to reorder banners within the same placement. Lower priority
        number = shown first.
      </p>
    </div>
  );
}
