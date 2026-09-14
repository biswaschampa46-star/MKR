"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, TicketPercent, X } from "lucide-react";
import { bdt, formatDate } from "@/lib/format";
import type { Coupon } from "@/db/schema";
import UiSelect from "@/components/UiSelect";

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percent", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed (৳)" },
] as const;

type FormState = {
  id: string | null;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  expiresAt: string;
  usageLimit: string;
  perUserLimit: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  id: null,
  code: "",
  discountType: "percent",
  discountValue: "",
  minOrderAmount: "0",
  maxDiscountAmount: "",
  expiresAt: "",
  usageLimit: "",
  perUserLimit: "",
  isActive: true,
};

export default function CouponsManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const openCreate = () => setForm({ ...EMPTY });
  const openEdit = (c: Coupon) =>
    setForm({
      id: c.id,
      code: c.code,
      discountType: c.discountType as "percent" | "fixed",
      discountValue: String(c.discountValue),
      minOrderAmount: String(c.minOrderAmount),
      maxDiscountAmount: c.maxDiscountAmount ? String(c.maxDiscountAmount) : "",
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
      usageLimit: c.usageLimit ? String(c.usageLimit) : "",
      perUserLimit: c.perUserLimit ? String(c.perUserLimit) : "",
      isActive: c.isActive,
    });

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setMsg("");
    const payload = {
      code: form.code,
      discountType: form.discountType,
      discountValue: form.discountValue,
      minOrderAmount: form.minOrderAmount,
      maxDiscountAmount: form.maxDiscountAmount,
      expiresAt: form.expiresAt,
      usageLimit: form.usageLimit,
      perUserLimit: form.perUserLimit,
      isActive: form.isActive,
    };
    const res = await fetch(form.id ? `/api/admin/coupons/${form.id}` : "/api/admin/coupons", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (!data.ok) {
      setMsg(data.message ?? "Could not save the coupon.");
      return;
    }
    setForm(null);
    router.refresh();
  };

  const toggle = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    router.refresh();
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    router.refresh();
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-mist">
          {coupons.length} coupon{coupons.length === 1 ? "" : "s"}
        </p>
        <button type="button" onClick={openCreate} className="adm-btn adm-btn-primary">
          <Plus size={16} /> New coupon
        </button>
      </div>

      {coupons.length === 0 && !form ? (
        <div className="adm-card flex flex-col items-center gap-3 p-12 text-center">
          <TicketPercent className="h-8 w-8 text-[var(--adm-sub)]" strokeWidth={1.2} />
          <p className="font-display text-sm font-bold text-[var(--adm-text)]">No coupons yet</p>
          <p className="max-w-xs text-xs leading-relaxed text-[var(--adm-sub)]">
            Create your first coupon code — percentage or fixed discount, with optional
            expiry, minimum order and usage limits.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {coupons.map((c) => (
            <li key={c.id} className="adm-card flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
              <div className="min-w-36">
                <p className="font-display text-sm font-bold tracking-[0.1em] text-[var(--adm-text)]">{c.code}</p>
                <p className="mt-1 text-xs text-[var(--adm-sub)]">
                  {c.discountType === "percent" ? `${c.discountValue}% off` : `${bdt(c.discountValue)} off`}
                  {c.maxDiscountAmount ? ` (max ${bdt(c.maxDiscountAmount)})` : ""}
                </p>
              </div>
              <div className="min-w-40 text-xs text-[var(--adm-sub)]">
                <p>Min order: {bdt(c.minOrderAmount)}</p>
                <p className="mt-1">
                  {c.expiresAt ? `Expires ${formatDate(c.expiresAt)}` : "No expiry"}
                  {c.usageLimit ? ` · ${c.usedCount}/${c.usageLimit} used` : ` · ${c.usedCount} used`}
                  {c.perUserLimit ? ` · ${c.perUserLimit}/user` : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${
                  c.isActive
                    ? "bg-[var(--adm-success-bg)] text-[var(--adm-success)]"
                    : "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]"
                }`}
              >
                {c.isActive ? "Active" : "Inactive"}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => toggle(c)} className="adm-btn adm-btn-ghost">
                  {c.isActive ? "Disable" : "Enable"}
                </button>
                <button type="button" onClick={() => openEdit(c)} className="adm-btn adm-btn-ghost">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  className="adm-btn adm-btn-ghost !text-[var(--adm-danger)]"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* create / edit drawer */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="adm-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-bold text-[var(--adm-text)]">
                {form.id ? `Edit ${form.code || "coupon"}` : "New coupon"}
              </p>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="adm-btn adm-btn-ghost !px-2">
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--adm-sub)]">Code *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="MARKORA10"
                  className="adm-field w-full uppercase tracking-wider"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--adm-sub)]">Discount type</label>
                <UiSelect
                  variant="admin"
                  value={form.discountType}
                  onChange={(v) => setForm({ ...form, discountType: v as "percent" | "fixed" })}
                  options={DISCOUNT_TYPE_OPTIONS}
                  placeholder="Discount type"
                  searchable={false}
                  ariaLabel="Discount type"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--adm-sub)]">
                  {form.discountType === "percent" ? "Percent off *" : "Amount off (৳) *"}
                </label>
                <input
                  value={form.discountValue}
                  onChange={set("discountValue")}
                  inputMode="numeric"
                  placeholder={form.discountType === "percent" ? "10" : "50"}
                  className="adm-field w-full"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--adm-sub)]">Max discount (৳)</label>
                <input
                  value={form.maxDiscountAmount}
                  onChange={set("maxDiscountAmount")}
                  inputMode="numeric"
                  placeholder="Only for % coupons"
                  className="adm-field w-full"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--adm-sub)]">Min order (৳)</label>
                <input value={form.minOrderAmount} onChange={set("minOrderAmount")} inputMode="numeric" className="adm-field w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--adm-sub)]">Expiry date</label>
                <input type="date" value={form.expiresAt} onChange={set("expiresAt")} className="adm-field w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--adm-sub)]">Total usage limit</label>
                <input value={form.usageLimit} onChange={set("usageLimit")} inputMode="numeric" placeholder="Unlimited" className="adm-field w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--adm-sub)]">Per-customer limit</label>
                <input value={form.perUserLimit} onChange={set("perUserLimit")} inputMode="numeric" placeholder="Unlimited" className="adm-field w-full" />
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-[var(--adm-text)]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 accent-[var(--adm-primary)]"
              />
              Active (customers can use this code)
            </label>

            {msg && (
              <p className="mt-4 rounded-lg bg-[var(--adm-danger-bg)] p-3 text-xs text-[var(--adm-danger)]">{msg}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setForm(null)} className="adm-btn adm-btn-ghost">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={busy} className="adm-btn adm-btn-primary">
                {busy ? <Loader2 size={15} className="animate-spin" /> : form.id ? "Save changes" : "Create coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
