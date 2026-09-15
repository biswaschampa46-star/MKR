/**
 * Promotion helpers — campaign status, Asia/Dhaka time handling and
 * discount formatting. Pure functions, usable on server and client.
 *
 * All campaign start/end instants are stored as absolute UTC timestamps
 * (Postgres timestamptz). Asia/Dhaka is used only for admin entry and
 * display, which keeps behaviour identical on Vercel and locally.
 */

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "expired"
  | "disabled";

export type PromoPublic = {
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
};

/** Reference "now" the caller can pin (tests, preview). */
export function computeStatus(
  c: { isEnabled: boolean; startAt: string | null; endAt: string | null },
  now: Date = new Date(),
): CampaignStatus {
  if (!c.isEnabled) return "disabled";
  if (c.startAt && now < new Date(c.startAt)) return "scheduled";
  if (c.endAt && now > new Date(c.endAt)) return "expired";
  return "active";
}

export const STATUS_META: Record<
  CampaignStatus,
  { label: string; cls: string }
> = {
  draft: { label: "Draft", cls: "text-mist border-line-soft" },
  scheduled: { label: "Scheduled", cls: "text-soft border-soft/40" },
  active: {
    label: "Active",
    cls: "text-emerald-300 border-emerald-300/40",
  },
  expired: { label: "Expired", cls: "text-red-300 border-red-300/40" },
  disabled: { label: "Disabled", cls: "text-mist border-line-soft" },
};

/** `2026-09-15T18:00` in Asia/Dhaka → absolute UTC Date. */
export function dhakaLocalToUtc(local: string): Date | null {
  if (!local) return null;
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  // Bangladesh is UTC+6 year-round (no DST).
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 6, +m[5]);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/** Absolute UTC instant → `YYYY-MM-DDTHH:mm` as seen in Asia/Dhaka. */
export function utcToDhakaLocal(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const dhaka = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return dhaka.toISOString().slice(0, 16);
}

/** Human-friendly Dhaka display, e.g. "15 Sep 2026, 6:00 PM". */
export function formatDhaka(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date) + " (Dhaka)"
  );
}

export type DiscountParts = {
  badge: string;
  detail: string;
};

/**
 * Build the visual discount badge/detail from discount kind + value.
 * ৳ (Bangladeshi Taka) for fixed amounts, % for percentage.
 */
export function discountParts(
  kind: string,
  value: number,
  heading?: string,
): DiscountParts {
  if (heading && heading.trim()) {
    return { badge: heading.trim(), detail: "" };
  }
  if (kind === "percentage" && value > 0) {
    return { badge: `${value}% OFF`, detail: "" };
  }
  if (kind === "fixed" && value > 0) {
    return {
      badge: `৳${new Intl.NumberFormat("en-IN").format(value)} OFF`,
      detail: "",
    };
  }
  return { badge: "", detail: "" };
}

/** Remaining ms until `end`, or null when no end time / already past. */
export function remainingMs(endAt: string | null, now: number): number | null {
  if (!endAt) return null;
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(end)) return null;
  return end - now;
}

export function splitCountdown(ms: number): {
  h: string;
  m: string;
  s: string;
} {
  const clamped = Math.max(0, ms);
  const h = Math.floor(clamped / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  const s = Math.floor((clamped % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { h: pad(Math.min(h, 99)), m: pad(m), s: pad(s) };
}

/** Does this campaign target the given context (product / category)? */
export function matchesTarget(
  c: Pick<PromoPublic, "targetType" | "targetId">,
  ctx: { productId?: string; category?: string } = {},
): boolean {
  if (c.targetType === "all" || !c.targetId) return true;
  const ids = c.targetId.split(",").map((s) => s.trim().toLowerCase());
  if (c.targetType === "product") {
    return !!ctx.productId && ids.includes(ctx.productId.toLowerCase());
  }
  if (c.targetType === "category" || c.targetType === "collection") {
    return !!ctx.category && ids.includes(ctx.category.toLowerCase());
  }
  return true;
}
