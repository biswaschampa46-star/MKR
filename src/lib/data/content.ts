import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db, guarded, rawQuery } from "@/db/client";
import { contactMessages, notifications, settings, subscribers } from "@/db/schema";
import { env } from "@/lib/env";
import type { ContactSettings, DeliverySettings, PaymentSettings } from "@/types";

/* -------------------------------- settings ------------------------------- */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!rows[0]) return fallback;
  return rows[0].value as T;
}

export async function setSetting(key: string, value: unknown, description?: string) {
  await db
    .insert(settings)
    .values({ key, value: value as Record<string, unknown>, description: description ?? null })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: value as Record<string, unknown>, description: description ?? null, updatedAt: new Date() },
    });
}

export const DEFAULT_DELIVERY: DeliverySettings = {
  zones: [
    { key: "chittagong", label: "Chattogram", fee: 70 },
    { key: "other", label: "Other districts", fee: 130 },
  ],
  freeDeliveryThreshold: null,
  codEnabled: true,
  prepaidDeliveryEnabled: true,
};

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const value = await getSetting<Partial<DeliverySettings>>("delivery", {});
  const zones = Array.isArray(value.zones) && value.zones.length > 0 ? value.zones : DEFAULT_DELIVERY.zones;
  return {
    zones: zones
      .map((zone) => ({ key: String(zone.key), label: String(zone.label), fee: Number(zone.fee) || 0 }))
      .filter((zone) => zone.key.length > 0),
    freeDeliveryThreshold:
      typeof value.freeDeliveryThreshold === "number" && value.freeDeliveryThreshold > 0
        ? value.freeDeliveryThreshold
        : null,
    codEnabled: value.codEnabled ?? true,
    prepaidDeliveryEnabled: value.prepaidDeliveryEnabled ?? true,
  };
}

export async function saveDeliverySettings(value: DeliverySettings) {
  await setSetting("delivery", value, "Delivery zones and fees (Bangladesh)");
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const stored = await getSetting<Partial<PaymentSettings>>("payments", {});
  const envNumbers = env.paymentNumbers;
  const bkash = stored.bkash || envNumbers.bkash || null;
  const nagad = stored.nagad || envNumbers.nagad || null;
  const rocket = stored.rocket || envNumbers.rocket || null;
  const configuredSource: PaymentSettings["configuredSource"] =
    stored.bkash || stored.nagad || stored.rocket
      ? "database"
      : envNumbers.bkash || envNumbers.nagad || envNumbers.rocket
        ? "environment"
        : "none";
  return {
    bkash,
    nagad,
    rocket,
    instructions: stored.instructions ?? null,
    configuredSource,
  };
}

export async function savePaymentSettings(value: {
  bkash: string | null;
  nagad: string | null;
  rocket: string | null;
  instructions: string | null;
}) {
  await setSetting("payments", value, "Manual mobile payment numbers and instructions");
}

export type PeekAssetSettings = {
  /* Left-edge stack (desktop/tablet). */
  leftLeadUrl: string | null;
  leftFollowUrl: string | null;
  leftShirtUrl: string | null;
  /* Right-edge stack (desktop/tablet) — independent images. */
  rightLeadUrl: string | null;
  rightFollowUrl: string | null;
  rightShirtUrl: string | null;
};

const PEEK_FALLBACK = {
  leftLeadUrl: null,
  leftFollowUrl: null,
  leftShirtUrl: null,
  rightLeadUrl: null,
  rightFollowUrl: null,
  rightShirtUrl: null,
} as const;

export async function getPeekAssetSettings(): Promise<PeekAssetSettings> {
  const value = await getSetting<Partial<PeekAssetSettings>>("peek_assets", {});
  return {
    leftLeadUrl: value.leftLeadUrl || PEEK_FALLBACK.leftLeadUrl,
    leftFollowUrl: value.leftFollowUrl || PEEK_FALLBACK.leftFollowUrl,
    leftShirtUrl: value.leftShirtUrl || PEEK_FALLBACK.leftShirtUrl,
    rightLeadUrl: value.rightLeadUrl || PEEK_FALLBACK.rightLeadUrl,
    rightFollowUrl: value.rightFollowUrl || PEEK_FALLBACK.rightFollowUrl,
    rightShirtUrl: value.rightShirtUrl || PEEK_FALLBACK.rightShirtUrl,
  };
}

export async function savePeekAssetSettings(value: PeekAssetSettings) {
  await setSetting("peek_assets", value, "Floating product peek images on the homepage (jeans lead/follow + shirt)");
}

/* Mobile hero: ONE admin-uploaded garment image shown on phones in place of
   the floating desktop peek composition (which never renders on mobile).
   Stored in the same settings namespace architecture as peek assets — no
   schema duplication. null → graceful static hero fallback on phones. */
export type MobileHeroImage = { url: string | null; altText: string | null };

export async function getMobileHeroImage(): Promise<MobileHeroImage> {
  const value = await getSetting<Partial<MobileHeroImage>>("mobile_hero_image", {});
  return {
    url: value.url ?? null,
    altText: value.altText ?? null,
  };
}

export async function saveMobileHeroImage(value: MobileHeroImage) {
  await setSetting("mobile_hero_image", value, "Single hero image shown on mobile in place of the desktop peek composition");
}

/* Contact details + the social URLs that power the floating contact dock.
   Explicit field mapping (same pattern as getMarketingSettings) so rows saved
   before a field existed still resolve to null instead of undefined. */
export async function getContactSettings(): Promise<ContactSettings> {
  const value = await getSetting<Partial<ContactSettings>>("contact", {});
  return {
    email: value.email ?? null,
    phone: value.phone ?? null,
    whatsapp: value.whatsapp ?? null,
    whatsappUrl: value.whatsappUrl ?? null,
    address: value.address ?? null,
    hours: value.hours ?? null,
    facebook: value.facebook ?? null,
    instagram: value.instagram ?? null,
  };
}

export async function saveContactSettings(value: ContactSettings) {
  await setSetting("contact", value, "Store contact details shown on the website");
}

export type FaqItem = { question: string; answer: string };

export async function getFaqSettings(): Promise<{ items: FaqItem[] }> {
  const value = await getSetting<{ items?: FaqItem[] }>("faq", { items: [] });
  return { items: Array.isArray(value.items) ? value.items : [] };
}

export async function saveFaqSettings(items: FaqItem[]) {
  await setSetting("faq", { items }, "FAQ entries (also used for FAQ structured data)");
}

export type MarketingSettings = {
  announcement: string | null;
  announcementHref: string | null;
  showAnnouncement: boolean;
  heroAutoplaySeconds: number;
  metaTitleSuffix: string;
};

export async function getMarketingSettings(): Promise<MarketingSettings> {
  const value = await getSetting<Partial<MarketingSettings>>("marketing", {});
  return {
    announcement: value.announcement ?? null,
    announcementHref: value.announcementHref ?? null,
    showAnnouncement: value.showAnnouncement ?? false,
    heroAutoplaySeconds: value.heroAutoplaySeconds ?? 6,
    metaTitleSuffix: value.metaTitleSuffix ?? "MKR—Casual Threads & Style",
  };
}

export async function saveMarketingSettings(value: MarketingSettings) {
  await setSetting("marketing", value, "Storefront announcement + marketing preferences");
}

/* ----------------------------- notifications ------------------------------ */
export async function listCustomerNotifications(customerId: string, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(or(eq(notifications.customerId, customerId), and(isNull(notifications.customerId), eq(notifications.audience, "all"))))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(customerId: string) {
  const rows = await rawQuery<{ total: string }>(
    sql`select count(*)::text as total from notifications
         where is_read = false and (customer_id = ${customerId} or (customer_id is null and audience = 'all'))`,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function markNotificationRead(customerId: string, id: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), or(eq(notifications.customerId, customerId), isNull(notifications.customerId))));
}

export async function markAllNotificationsRead(customerId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.customerId, customerId), eq(notifications.isRead, false)));
}

export async function listAllNotifications(limit = 100) {
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function createNotification(input: {
  customerId: string | null;
  audience: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
}) {
  const inserted = await db.insert(notifications).values(input).returning({ id: notifications.id });
  return inserted[0].id;
}

export async function deleteNotification(id: string) {
  await db.delete(notifications).where(eq(notifications.id, id));
}

/* -------------------------------- messages -------------------------------- */
export async function createContactMessage(input: {
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  customerId: string | null;
}) {
  const inserted = await db.insert(contactMessages).values(input).returning({ id: contactMessages.id });
  return inserted[0].id;
}

export async function listMessages(status?: "new" | "read" | "archived") {
  return db
    .select()
    .from(contactMessages)
    .where(status ? eq(contactMessages.status, status) : sql`true`)
    .orderBy(desc(contactMessages.createdAt))
    .limit(200);
}

export async function setMessageStatus(id: string, status: "new" | "read" | "archived") {
  await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, id));
}

export async function deleteMessage(id: string) {
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
}

/* ------------------------------- subscribers ------------------------------ */
export async function subscribeEmail(email: string, source = "footer") {
  await db
    .insert(subscribers)
    .values({ email: email.trim().toLowerCase(), source })
    .onConflictDoUpdate({ target: subscribers.email, set: { status: "subscribed" } });
}

export async function listSubscribers() {
  return db.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(500);
}

export async function deleteSubscriber(id: string) {
  await db.delete(subscribers).where(eq(subscribers.id, id));
}
