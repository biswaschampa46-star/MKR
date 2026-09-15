"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import PromoBanner from "@/components/promo/PromoBanner";
import {
  computeStatus,
  STATUS_META,
  dhakaLocalToUtc,
  utcToDhakaLocal,
  formatDhaka,
  type PromoPublic,
} from "@/lib/promotion-utils";

export type BannerFormValues = {
  id?: string;
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
  isEnabled: boolean;
};

const EMPTY: BannerFormValues = {
  campaignName: "",
  label: "LIMITED TIME",
  heading: "",
  description: "",
  campaignType: "percentage",
  discountKind: "percentage",
  discountValue: 15,
  couponCode: "",
  ctaText: "এখনই কিনুন",
  ctaUrl: "/shop",
  bgMode: "gradient",
  bgColor: "#0b263d",
  bgColor2: "#0e2f4a",
  textColor: "#f4faff",
  accentColor: "#8ccbff",
  buttonColor: "#ddf3ff",
  buttonTextColor: "#06131f",
  radius: 20,
  height: "md",
  layout: "center",
  align: "left",
  gradientEnabled: true,
  animationEnabled: true,
  imageUrl: "",
  mobileImageUrl: "",
  placement: "below_hero",
  targetType: "all",
  targetId: "",
  startAt: null,
  endAt: null,
  priority: 5,
  isEnabled: true,
};

const PLACEMENTS: [string, string][] = [
  ["below_hero", "Below Hero"],
  ["home_top", "Homepage Top"],
  ["above_products", "Above Product Section"],
  ["between_sections", "Between Product Sections"],
  ["product_page", "Product Page"],
  ["category_page", "Category Page"],
  ["announcement", "Global Announcement Bar"],
];

const TYPES: [string, string][] = [
  ["percentage", "Percentage Discount"],
  ["flat", "Flat Discount"],
  ["flash_sale", "Flash Sale"],
  ["limited_time", "Limited Time Offer"],
  ["new_arrival", "New Arrival"],
  ["free_delivery", "Free Delivery"],
  ["coupon", "Coupon Campaign"],
  ["special", "Special Offer"],
  ["custom", "Custom"],
];

export default function BannerForm({
  initial,
}: {
  initial?: BannerFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState<BannerFormValues>(
    initial ?? EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [startLocal, setStartLocal] = useState(utcToDhakaLocal(initial?.startAt ?? null));
  const [endLocal, setEndLocal] = useState(utcToDhakaLocal(initial?.endAt ?? null));

  const set = <K extends keyof BannerFormValues>(k: K, value: BannerFormValues[K]) =>
    setV((s) => ({ ...s, [k]: value }));

  const upload = async (file: File, field: "imageUrl" | "mobileImageUrl") => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; message?: string };
      if (data.ok && data.url) set(field, data.url);
      else setError(data.message ?? "Upload failed.");
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  /* live preview object shaped exactly like the public component expects */
  const preview: PromoPublic = useMemo(
    () => ({
      id: v.id ?? "preview",
      campaignName: v.campaignName || "Campaign name",
      label: v.label,
      heading: v.heading,
      description: v.description,
      campaignType: v.campaignType,
      discountKind: v.discountKind,
      discountValue: v.discountValue,
      couponCode: v.couponCode,
      ctaText: v.ctaText,
      ctaUrl: v.ctaUrl,
      bgMode: v.bgMode,
      bgColor: v.bgColor,
      bgColor2: v.bgColor2,
      textColor: v.textColor,
      accentColor: v.accentColor,
      buttonColor: v.buttonColor,
      buttonTextColor: v.buttonTextColor,
      radius: v.radius,
      height: v.height,
      layout: v.layout,
      align: v.align,
      gradientEnabled: v.gradientEnabled,
      animationEnabled: v.animationEnabled,
      imageUrl: v.imageUrl,
      mobileImageUrl: v.mobileImageUrl,
      placement: v.placement,
      targetType: v.targetType,
      targetId: v.targetId,
      startAt: dhakaLocalToUtc(startLocal)?.toISOString() ?? null,
      endAt: dhakaLocalToUtc(endLocal)?.toISOString() ?? null,
      priority: v.priority,
      sortOrder: 0,
      isEnabled: v.isEnabled,
    }),
    [v, startLocal, endLocal],
  );

  const liveStatus = computeStatus(
    { isEnabled: v.isEnabled, startAt: preview.startAt, endAt: preview.endAt },
    new Date(),
  );
  const statusMeta = STATUS_META[liveStatus];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...v, startAtLocal: startLocal, endAtLocal: endLocal };
      const res = await fetch(
        initial?.id ? `/api/admin/promotions/${initial.id}` : "/api/admin/promotions",
        {
          method: initial?.id ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Save failed.");
        setBusy(false);
        return;
      }
      router.push("/admin/marketing");
      router.refresh();
    } catch {
      setError("Save failed. Please try again.");
      setBusy(false);
    }
  };

  const inputCls =
    "mt-2 w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none";
  const labelCls = "block text-xs uppercase tracking-[0.18em] text-mist";
  const cardCls = "rounded-xl border border-line-soft p-5 md:p-6";

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-2">
      {/* ————————————————— left column: config ————————————————— */}
      <div className="space-y-6">
        {/* content */}
        <section className={cardCls}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-soft">Content</p>
          <div className="mt-5 space-y-5">
            <label className={labelCls}>
              Campaign name *
              <input value={v.campaignName} onChange={(e) => set("campaignName", e.target.value)} required maxLength={120} placeholder="September Sale" className={inputCls} />
            </label>
            <label className={labelCls}>
              Small label
              <input value={v.label} onChange={(e) => set("label", e.target.value)} maxLength={60} placeholder="LIMITED TIME" className={inputCls} />
            </label>
            <label className={labelCls}>
              Main heading (overrides the discount badge if set)
              <input value={v.heading} onChange={(e) => set("heading", e.target.value)} maxLength={120} placeholder="e.g. 80% পর্যন্ত ছাড়" className={inputCls} />
            </label>
            <label className={labelCls}>
              Description
              <textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={300} placeholder="সীমিত সময়ের জন্য বিশেষ ছাড়" className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-5">
              <label className={labelCls}>
                Campaign type
                <select value={v.campaignType} onChange={(e) => set("campaignType", e.target.value)} className={inputCls}>
                  {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className={labelCls}>
                Placement
                <select value={v.placement} onChange={(e) => set("placement", e.target.value)} className={inputCls}>
                  {PLACEMENTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            </div>
          </div>
        </section>

        {/* discount */}
        <section className={cardCls}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-soft">Discount</p>
          <div className="mt-5 grid grid-cols-3 gap-5">
            <label className={labelCls}>
              Type
              <select value={v.discountKind} onChange={(e) => set("discountKind", e.target.value)} className={inputCls}>
                <option value="none">No discount</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </label>
            <label className={`${labelCls} col-span-2`}>
              Value
              <input
                type="number"
                min={0}
                value={v.discountValue}
                onChange={(e) => set("discountValue", Number(e.target.value))}
                disabled={v.discountKind === "none"}
                placeholder={v.discountKind === "fixed" ? "e.g. 500 (৳500 OFF)" : "e.g. 15 (% OFF)"}
                className={`${inputCls} disabled:opacity-40`}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-mist/70">
            Percentage shows “{v.discountValue}% OFF”. Fixed shows ৳{v.discountValue} OFF (Bangladeshi Taka).
          </p>
        </section>

        {/* CTA & coupon */}
        <section className={cardCls}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-soft">CTA & Coupon</p>
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <label className={labelCls}>
                Button text
                <input value={v.ctaText} onChange={(e) => set("ctaText", e.target.value)} maxLength={60} placeholder="এখনই কিনুন" className={inputCls} />
              </label>
              <label className={labelCls}>
                Coupon code (optional)
                <input value={v.couponCode} onChange={(e) => set("couponCode", e.target.value.toUpperCase())} maxLength={40} placeholder="MKR15" className={inputCls} />
              </label>
            </div>
            <label className={labelCls}>
              CTA link
              <input value={v.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} maxLength={300} placeholder="/shop or https://…" className={inputCls} />
            </label>
          </div>
        </section>

        {/* schedule & targeting */}
        <section className={cardCls}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-soft">Schedule & Targeting</p>
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <label className={labelCls}>
                Start (Dhaka time)
                <input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} className={inputCls} />
              </label>
              <label className={labelCls}>
                End (Dhaka time)
                <input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} className={inputCls} />
              </label>
            </div>
            <p className="text-xs text-mist/70">
              {startLocal || endLocal ? (
                <>
                  {startLocal && <>Starts {formatDhaka(dhakaLocalToUtc(startLocal))}. </>}
                  {endLocal && <>Ends {formatDhaka(dhakaLocalToUtc(endLocal))}. </>}
                  Leave empty for “always on”.
                </>
              ) : (
                "Leave empty for an always-on campaign."
              )}
            </p>
            <div className="grid grid-cols-3 gap-5">
              <label className={labelCls}>
                Target
                <select value={v.targetType} onChange={(e) => set("targetType", e.target.value)} className={inputCls}>
                  <option value="all">All products</option>
                  <option value="product">Specific products</option>
                  <option value="category">Specific category</option>
                  <option value="collection">Specific collection</option>
                </select>
              </label>
              <label className={`${labelCls} col-span-2`}>
                {v.targetType === "product" ? "Product ID(s), comma separated" : v.targetType === "category" ? "Category name(s), comma separated" : "Collection name(s), comma separated"}
                <input
                  value={v.targetId}
                  onChange={(e) => set("targetId", e.target.value)}
                  disabled={v.targetType === "all"}
                  placeholder={v.targetType === "product" ? "paste product UUID(s)" : "e.g. fashion, mugs"}
                  className={`${inputCls} disabled:opacity-40`}
                />
              </label>
            </div>
            <label className={`${labelCls} max-w-[8rem]`}>
              Priority (1 = first)
              <input type="number" min={1} max={99} value={v.priority} onChange={(e) => set("priority", Number(e.target.value))} className={inputCls} />
            </label>
          </div>
        </section>

        {/* design */}
        <section className={cardCls}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-soft">Design</p>
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-3 gap-5">
              <label className={labelCls}>
                Background
                <select value={v.bgMode} onChange={(e) => set("bgMode", e.target.value)} className={inputCls}>
                  <option value="solid">Solid color</option>
                  <option value="gradient">Gradient</option>
                  <option value="image">Image</option>
                </select>
              </label>
              <label className={labelCls}>
                Layout
                <select value={v.layout} onChange={(e) => set("layout", e.target.value)} className={inputCls}>
                  <option value="center">Stacked</option>
                  <option value="split">Split (CTA right)</option>
                </select>
              </label>
              <label className={labelCls}>
                Text alignment
                <select value={v.align} onChange={(e) => set("align", e.target.value)} className={inputCls}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-5">
              <ColorField label="Background" value={v.bgColor} onChange={(x) => set("bgColor", x)} />
              {v.bgMode === "gradient" && <ColorField label="Gradient to" value={v.bgColor2} onChange={(x) => set("bgColor2", x)} />}
              <ColorField label="Text" value={v.textColor} onChange={(x) => set("textColor", x)} />
              <ColorField label="Accent" value={v.accentColor} onChange={(x) => set("accentColor", x)} />
              <ColorField label="Button" value={v.buttonColor} onChange={(x) => set("buttonColor", x)} />
              <ColorField label="Button text" value={v.buttonTextColor} onChange={(x) => set("buttonTextColor", x)} />
            </div>

            <div className="grid grid-cols-3 gap-5">
              <label className={labelCls}>
                Border radius (px)
                <input type="number" min={0} max={40} value={v.radius} onChange={(e) => set("radius", Number(e.target.value))} className={inputCls} />
              </label>
              <label className={labelCls}>
                Banner height
                <select value={v.height} onChange={(e) => set("height", e.target.value)} className={inputCls}>
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-8">
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.gradientEnabled} onChange={(e) => set("gradientEnabled", e.target.checked)} className="h-4 w-4 accent-white" />
                Gradient overlay
              </label>
              <label className="flex items-center gap-3 text-sm text-mist">
                <input type="checkbox" checked={v.animationEnabled} onChange={(e) => set("animationEnabled", e.target.checked)} className="h-4 w-4 accent-white" />
                Entrance animation
              </label>
            </div>

            {/* images */}
            <div className="space-y-4">
              <ImageField
                label="Banner image (desktop)"
                value={v.imageUrl}
                uploading={uploading}
                onPick={(f) => upload(f, "imageUrl")}
                onClear={() => set("imageUrl", "")}
                onChange={(u) => set("imageUrl", u)}
              />
              <ImageField
                label="Mobile image (optional)"
                value={v.mobileImageUrl}
                uploading={uploading}
                onPick={(f) => upload(f, "mobileImageUrl")}
                onClear={() => set("mobileImageUrl", "")}
                onChange={(u) => set("mobileImageUrl", u)}
              />
            </div>
          </div>
        </section>

        {/* status */}
        <section className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-sm text-mist">
              <input type="checkbox" checked={v.isEnabled} onChange={(e) => set("isEnabled", e.target.checked)} className="h-4 w-4 accent-white" />
              Enabled
            </label>
            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${statusMeta.cls}`}>
              {statusMeta.label}
            </span>
          </div>
        </section>

        {error && <p className="text-sm text-accent">{error}</p>}

        <div className="flex gap-4">
          <button type="submit" disabled={busy} className="rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-foam hover:bg-white/15 disabled:opacity-50">
            {busy ? "Saving…" : initial?.id ? "Save changes" : "Create campaign"}
          </button>
          <button type="button" onClick={() => router.push("/admin/marketing")} className="rounded-lg border border-line-soft px-6 py-3 text-sm text-mist hover:text-foam">
            Cancel
          </button>
        </div>
      </div>

      {/* ————————————————— right column: live preview ————————————————— */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-soft">Live preview</p>
          <div className="flex rounded-lg border border-line-soft p-1">
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPreviewDevice(d)}
                className={`rounded-md px-3 py-1.5 text-xs capitalize ${
                  previewDevice === d ? "bg-white/10 font-semibold text-foam" : "text-mist"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div
          className="overflow-x-hidden rounded-xl border border-line-soft bg-[#04101c] p-4"
          style={previewDevice === "mobile" ? { maxWidth: 390 } : undefined}
        >
          {previewDevice === "desktop" ? (
            <PromoBanner campaign={preview} />
          ) : (
            /* real mobile framing: scaled viewport so overflow issues surface early */
            <div className="mx-auto" style={{ width: 375 }}>
              <PromoBanner campaign={preview} />
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-mist/70">
          This is exactly how the banner renders on the public site.
        </p>
      </div>
    </form>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs uppercase tracking-[0.18em] text-mist">
      {label}
      <span className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border border-line bg-transparent p-0.5"
          aria-label={`${label} color`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded-lg border border-line bg-transparent px-2 py-2 text-xs text-foam focus:border-soft/60 focus:outline-none"
          aria-label={`${label} hex`}
        />
      </span>
    </label>
  );
}

function ImageField({
  label,
  value,
  uploading,
  onPick,
  onClear,
  onChange,
}: {
  label: string;
  value: string;
  uploading: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
  onChange: (url: string) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-mist">{label}</p>
      <div className="mt-2 flex items-start gap-4">
        {value && (
          <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md border border-line-soft">
            <Image src={value} alt="" fill sizes="112px" className="object-cover" unoptimized />
          </div>
        )}
        <div className="flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/uploads/banner.jpg or https://…"
            className="w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
          />
          <div className="mt-2 flex gap-3">
            <label className="inline-block cursor-pointer rounded-lg border border-line-soft px-3 py-2 text-xs text-mist hover:text-foam">
              {uploading ? "Uploading…" : "Upload"}
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
            </label>
            {value && (
              <button type="button" onClick={onClear} className="rounded-lg border border-accent/40 px-3 py-2 text-xs text-accent">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
