import { NextResponse } from "next/server";
import { db } from "@/db";
import { promoCampaigns } from "@/db/schema";
import { isAdmin, unauthorized } from "@/lib/auth";
import { dhakaLocalToUtc } from "@/lib/promotion-utils";

export type CampaignInput = {
  campaignName?: string;
  label?: string;
  heading?: string;
  description?: string;
  campaignType?: string;
  discountKind?: string;
  discountValue?: number;
  couponCode?: string;
  ctaText?: string;
  ctaUrl?: string;
  bgMode?: string;
  bgColor?: string;
  bgColor2?: string;
  textColor?: string;
  accentColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  radius?: number;
  height?: string;
  layout?: string;
  align?: string;
  gradientEnabled?: boolean;
  animationEnabled?: boolean;
  imageUrl?: string;
  mobileImageUrl?: string;
  placement?: string;
  targetType?: string;
  targetId?: string;
  startAtLocal?: string; // "YYYY-MM-DDTHH:mm" in Asia/Dhaka
  endAtLocal?: string;
  priority?: number;
  isEnabled?: boolean;
};

const TYPES = new Set([
  "percentage", "flat", "flash_sale", "limited_time", "new_arrival",
  "free_delivery", "coupon", "special", "custom",
]);
const PLACEMENTS = new Set([
  "announcement", "home_top", "below_hero", "above_products",
  "between_sections", "product_page", "category_page",
]);
const HEIGHTS = new Set(["sm", "md", "lg"]);
const ALIGNS = new Set(["left", "center", "right"]);
const TARGETS = new Set(["all", "product", "category", "collection"]);
const DISCOUNTS = new Set(["none", "percentage", "fixed"]);

const HEX = /^#[0-9a-fA-F]{6}$/;

function hex(v: unknown, fallback: string): string {
  return typeof v === "string" && HEX.test(v) ? v : fallback;
}

function cleanUrl(v: unknown, max = 300): string {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  // allow relative paths and http(s) URLs only
  if (!s || s.startsWith("/") || /^https?:\/\//i.test(s)) return s;
  return "";
}

export function normalize(body: CampaignInput) {
  const name = (body.campaignName ?? "").trim().slice(0, 120);
  const campaignType = TYPES.has(body.campaignType ?? "") ? body.campaignType! : "custom";
  const discountKind = DISCOUNTS.has(body.discountKind ?? "") ? body.discountKind! : "none";
  const discountValue =
    Number.isFinite(Number(body.discountValue)) && Number(body.discountValue) > 0
      ? Math.floor(Number(body.discountValue))
      : 0;

  const errors: string[] = [];
  if (name.length < 2) errors.push("Campaign name is required.");
  if (discountKind === "percentage" && (discountValue < 1 || discountValue > 90))
    errors.push("Percentage discount must be between 1 and 90.");
  if (discountKind === "fixed" && discountValue < 1)
    errors.push("Fixed discount amount is required.");

  return {
    errors,
    values: {
      campaignName: name,
      label: (body.label ?? "").trim().slice(0, 60),
      heading: (body.heading ?? "").trim().slice(0, 120),
      description: (body.description ?? "").trim().slice(0, 300),
      campaignType,
      discountKind,
      discountValue,
      couponCode: (body.couponCode ?? "").trim().toUpperCase().slice(0, 40),
      ctaText: (body.ctaText ?? "").trim().slice(0, 60),
      ctaUrl: cleanUrl(body.ctaUrl),
      bgMode: body.bgMode === "gradient" || body.bgMode === "image" ? body.bgMode : "solid",
      bgColor: hex(body.bgColor, "#0b263d"),
      bgColor2: hex(body.bgColor2, "#4da8ff"),
      textColor: hex(body.textColor, "#f4faff"),
      accentColor: hex(body.accentColor, "#8ccbff"),
      buttonColor: hex(body.buttonColor, "#ddf3ff"),
      buttonTextColor: hex(body.buttonTextColor, "#06131f"),
      radius: Math.min(40, Math.max(0, Math.floor(Number(body.radius)) || 0)),
      height: HEIGHTS.has(body.height ?? "") ? body.height! : "md",
      layout: body.layout === "split" ? "split" : "center",
      align: ALIGNS.has(body.align ?? "") ? body.align! : "left",
      gradientEnabled: body.gradientEnabled !== false,
      animationEnabled: body.animationEnabled !== false,
      imageUrl: cleanUrl(body.imageUrl),
      mobileImageUrl: cleanUrl(body.mobileImageUrl),
      placement: PLACEMENTS.has(body.placement ?? "") ? body.placement! : "below_hero",
      targetType: TARGETS.has(body.targetType ?? "") ? body.targetType! : "all",
      targetId: (body.targetId ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30)
        .join(","),
      startAt: dhakaLocalToUtc((body.startAtLocal ?? "").trim()),
      endAt: dhakaLocalToUtc((body.endAtLocal ?? "").trim()),
      priority: Math.min(99, Math.max(1, Math.floor(Number(body.priority)) || 5)),
      isEnabled: body.isEnabled !== false,
    },
  };
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await request.json()) as CampaignInput;
    const { errors, values } = normalize(body);
    if (errors.length > 0)
      return NextResponse.json({ ok: false, message: errors.join(" ") }, { status: 400 });
    if (values.startAt && values.endAt && values.endAt <= values.startAt)
      return NextResponse.json(
        { ok: false, message: "End time must be after the start time." },
        { status: 400 },
      );

    const [created] = await db
      .insert(promoCampaigns)
      .values(values)
      .returning({ id: promoCampaigns.id });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("admin campaign create failed", err);
    return NextResponse.json({ ok: false, message: "Could not save the campaign." }, { status: 500 });
  }
}
