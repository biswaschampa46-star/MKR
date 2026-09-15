/**
 * Server-side promotion queries. Mirrors the error-swallowing pattern of
 * src/lib/products.ts / settings.ts: if the database is unreachable the
 * public site simply renders no banners instead of crashing.
 */

import { db } from "@/db";
import { promoCampaigns, type PromoCampaign } from "@/db/schema";
import { and, asc, eq, inArray, or, isNull, gte, lte } from "drizzle-orm";
import type { PromoPublic } from "./promotion-utils";

/** All campaigns, newest first — admin list. */
export async function getAllCampaigns(): Promise<PromoCampaign[]> {
  try {
    return await db
      .select()
      .from(promoCampaigns)
      .orderBy(asc(promoCampaigns.placement), asc(promoCampaigns.priority), asc(promoCampaigns.sortOrder), asc(promoCampaigns.createdAt));
  } catch {
    return [];
  }
}

export async function getCampaignById(
  id: string,
): Promise<PromoCampaign | null> {
  try {
    const rows = await db
      .select()
      .from(promoCampaigns)
      .where(eq(promoCampaigns.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function toPublic(c: PromoCampaign): PromoPublic {
  return {
    id: c.id,
    campaignName: c.campaignName,
    label: c.label,
    heading: c.heading,
    description: c.description,
    campaignType: c.campaignType,
    discountKind: c.discountKind,
    discountValue: c.discountValue,
    couponCode: c.couponCode,
    ctaText: c.ctaText,
    ctaUrl: c.ctaUrl,
    bgMode: c.bgMode,
    bgColor: c.bgColor,
    bgColor2: c.bgColor2,
    textColor: c.textColor,
    accentColor: c.accentColor,
    buttonColor: c.buttonColor,
    buttonTextColor: c.buttonTextColor,
    radius: c.radius,
    height: c.height,
    layout: c.layout,
    align: c.align,
    gradientEnabled: c.gradientEnabled,
    animationEnabled: c.animationEnabled,
    imageUrl: c.imageUrl,
    mobileImageUrl: c.mobileImageUrl,
    placement: c.placement,
    targetType: c.targetType,
    targetId: c.targetId,
    startAt: c.startAt ? c.startAt.toISOString() : null,
    endAt: c.endAt ? c.endAt.toISOString() : null,
    priority: c.priority,
    sortOrder: c.sortOrder,
    isEnabled: c.isEnabled,
  };
}

/**
 * Campaigns the public site may show right now: enabled and inside their
 * schedule window. The window filter runs in SQL so no polling or extra
 * rows travel over the wire. A campaign with no window is always shown.
 */
export async function getActivePromotions(
  placements: string[],
  ctx: { productId?: string; category?: string } = {},
): Promise<PromoPublic[]> {
  if (placements.length === 0) return [];
  try {
    const rows = await db
      .select()
      .from(promoCampaigns)
      .where(
        and(
          eq(promoCampaigns.isEnabled, true),
          inArray(promoCampaigns.placement, placements),
          or(
            isNull(promoCampaigns.startAt),
            lte(promoCampaigns.startAt, new Date()),
          ),
          or(
            isNull(promoCampaigns.endAt),
            gte(promoCampaigns.endAt, new Date()),
          ),
        ),
      )
      .orderBy(
        asc(promoCampaigns.priority),
        asc(promoCampaigns.sortOrder),
        asc(promoCampaigns.createdAt),
      );

    return rows
      .map(toPublic)
      .filter((c) => matchesCtx(c, ctx));
  } catch {
    return [];
  }
}

function matchesCtx(
  c: PromoPublic,
  ctx: { productId?: string; category?: string },
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

/** Announcement-bar rows only (placement = announcement). */
export async function getAnnouncements(): Promise<PromoPublic[]> {
  return getActivePromotions(["announcement"]);
}
