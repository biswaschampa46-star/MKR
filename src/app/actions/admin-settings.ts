"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productImages } from "@/db/schema";
import { getAdminSession } from "@/lib/auth/admin";
import { deleteHeroSlide, deleteAboutSection, getMediaAsset, saveAboutSection, saveHeroSlide, storeUploadedFile } from "@/lib/data/media";
import {
  getMobileHeroImage,
  getPeekAssetSettings,
  saveContactSettings,
  saveDeliverySettings,
  saveFaqSettings,
  saveMarketingSettings,
  saveMobileHeroImage,
  savePaymentSettings,
  savePeekAssetSettings,
} from "@/lib/data/content";
import { publishRealtimeEvent } from "@/lib/realtime";
import { BUCKETS } from "@/lib/storage";
import {
  contactSettingsSchema,
  deliverySettingsSchema,
  faqSettingsSchema,
  marketingSettingsSchema,
  paymentSettingsSchema,
} from "@/lib/validation";
import type { ActionResult } from "@/types";

type FormState = ActionResult | undefined;

export async function saveDeliverySettingsAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };

  const zones: { key: string; label: string; fee: number }[] = [];
  for (let index = 0; index < 12; index += 1) {
    const key = String(formData.get(`zoneKey_${index}`) ?? "").trim();
    const label = String(formData.get(`zoneLabel_${index}`) ?? "").trim();
    const fee = Number(formData.get(`zoneFee_${index}`) ?? 0);
    if (key && label) zones.push({ key, label, fee: Number.isFinite(fee) ? Math.max(0, Math.floor(fee)) : 0 });
  }

  const parsed = deliverySettingsSchema.safeParse({
    zones: zones.length > 0 ? zones : [{ key: "other", label: "Other districts", fee: 130 }],
    freeDeliveryThreshold: formData.get("freeDeliveryThreshold") ? Number(formData.get("freeDeliveryThreshold")) : null,
    codEnabled: formData.get("codEnabled") === "on",
    prepaidDeliveryEnabled: formData.get("prepaidDeliveryEnabled") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Please review the delivery zones." };

  await saveDeliverySettings({
    zones: parsed.data.zones,
    freeDeliveryThreshold: parsed.data.freeDeliveryThreshold ?? null,
    codEnabled: parsed.data.codEnabled ?? true,
    prepaidDeliveryEnabled: parsed.data.prepaidDeliveryEnabled ?? true,
  });
  revalidatePath("/admin/delivery");
  revalidatePath("/checkout");
  return { ok: true, message: "Delivery settings saved." };
}

export async function savePaymentSettingsAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const parsed = paymentSettingsSchema.safeParse({
    bkash: String(formData.get("bkash") ?? ""),
    nagad: String(formData.get("nagad") ?? ""),
    rocket: String(formData.get("rocket") ?? ""),
    instructions: String(formData.get("instructions") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Please review the payment details." };

  await savePaymentSettings({
    bkash: parsed.data.bkash || null,
    nagad: parsed.data.nagad || null,
    rocket: parsed.data.rocket || null,
    instructions: parsed.data.instructions || null,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
  return { ok: true, message: "Payment settings saved." };
}

export async function saveContactSettingsAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const parsed = contactSettingsSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    whatsappUrl: String(formData.get("whatsappUrl") ?? ""),
    address: String(formData.get("address") ?? ""),
    hours: String(formData.get("hours") ?? ""),
    facebook: String(formData.get("facebook") ?? ""),
    instagram: String(formData.get("instagram") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Please review the contact details." };

  await saveContactSettings({
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    whatsapp: parsed.data.whatsapp || null,
    whatsappUrl: parsed.data.whatsappUrl || null,
    address: parsed.data.address || null,
    hours: parsed.data.hours || null,
    facebook: parsed.data.facebook || null,
    instagram: parsed.data.instagram || null,
  });
  revalidatePath("/admin/contact-details");
  revalidatePath("/contact");
  revalidatePath("/about");
  /* The floating contact dock lives in the site layout — refresh every page. */
  revalidatePath("/", "layout");
  return { ok: true, message: "Contact details saved." };
}

export async function saveFaqSettingsAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };

  const items: { question: string; answer: string }[] = [];
  for (let index = 0; index < 30; index += 1) {
    const question = String(formData.get(`question_${index}`) ?? "").trim();
    const answer = String(formData.get(`answer_${index}`) ?? "").trim();
    if (question && answer) items.push({ question, answer });
  }

  const parsed = faqSettingsSchema.safeParse({ items });
  if (!parsed.success) return { ok: false, error: "Each FAQ needs a question (3+ chars) and an answer." };

  await saveFaqSettings(parsed.data.items);
  revalidatePath("/admin/settings");
  revalidatePath("/faq");
  return { ok: true, message: "FAQ saved." };
}

export async function saveMarketingSettingsAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const parsed = marketingSettingsSchema.safeParse({
    announcement: String(formData.get("announcement") ?? ""),
    announcementHref: String(formData.get("announcementHref") ?? ""),
    showAnnouncement: formData.get("showAnnouncement") === "on",
    heroAutoplaySeconds: formData.get("heroAutoplaySeconds") ?? 6,
    metaTitleSuffix: String(formData.get("metaTitleSuffix") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Please review the marketing settings." };

  await saveMarketingSettings({
    announcement: parsed.data.announcement || null,
    announcementHref: parsed.data.announcementHref || null,
    showAnnouncement: parsed.data.showAnnouncement ?? false,
    heroAutoplaySeconds: parsed.data.heroAutoplaySeconds ?? 6,
    metaTitleSuffix: parsed.data.metaTitleSuffix || "MKR—Casual Threads & Style",
  });
  revalidatePath("/admin/marketing");
  revalidatePath("/");
  return { ok: true, message: "Marketing settings saved." };
}

export async function saveHeroSlideAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const heading = String(formData.get("heading") ?? "").trim();
  if (heading.length < 3) return { ok: false, error: "Add a heading for this hero slide." };

  let mediaId = String(formData.get("mediaId") ?? "").trim() || null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      const media = await storeUploadedFile({
        file,
        bucket: BUCKETS.uploads,
        scope: "hero",
        slugOrId: heading,
        role: "hero",
        altText: heading,
        uploadedBy: `admin:${admin.subject}`,
      });
      mediaId = media.id;
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Hero media upload failed." };
    }
  }

  /* mediaType: new upload decides; otherwise the hidden field carries the
     existing asset's kind so keeping one viewport's media never rewrites
     the other's type. */
  let mediaType: "image" | "video" =
    file instanceof File && file.size > 0 && file.type.startsWith("video/")
      ? "video"
      : (String(formData.get("mediaType") ?? "image") === "video" ? "video" : "image");

  /* The attached asset's verified kind (media_assets.kind, magic-byte checked
     at upload) outranks the form value: media_type is legacy metadata that
     goes stale when a slot's media is replaced, and a stale type used to blank
     the storefront hero. This self-heals the row on the next save. */
  if (mediaId) {
    const asset = await getMediaAsset(mediaId);
    if (asset?.kind === "image" || asset?.kind === "video") mediaType = asset.kind;
  }

  /* Responsive hero video: phone-only media rides the same storage pipeline.
     Leave the field empty to keep the current mobile media; tick remove to
     clear it. The old asset is NOT deleted from storage (media_assets rows
     are immutable references; cleanup happens via the media library). */
  let mobileMediaId = String(formData.get("mobileMediaId") ?? "").trim() || null;
  const mobileFile = formData.get("mobileFile");
  const removeMobile = formData.get("removeMobile") === "1";
  if (removeMobile) {
    mobileMediaId = null;
  } else if (mobileFile instanceof File && mobileFile.size > 0) {
    try {
      const media = await storeUploadedFile({
        file: mobileFile,
        bucket: BUCKETS.uploads,
        scope: "hero/mobile-video",
        slugOrId: `${heading}-mobile`,
        role: "hero",
        altText: `${heading} (mobile)`,
        uploadedBy: `admin:${admin.subject}`,
      });
      mobileMediaId = media.id;
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Mobile hero media upload failed." };
    }
  }
  let mobileMediaType: "image" | "video" =
    mobileFile instanceof File && mobileFile.size > 0 && mobileFile.type.startsWith("video/")
      ? "video"
      : (String(formData.get("mobileMediaType") ?? "image") === "video" ? "video" : "image");
  /* Same authority rule as the desktop slot: the phone asset's verified kind
     wins, so switching that slot from video to image (or back) self-heals. */
  if (mobileMediaId) {
    const asset = await getMediaAsset(mobileMediaId);
    if (asset?.kind === "image" || asset?.kind === "video") mobileMediaType = asset.kind;
  }
  const RATIO_PATTERN = /^(9:16|2:3|4:5|1:1)$/;
  const mobileAspectRatioRaw = String(formData.get("mobileAspectRatio") ?? "9:16");
  const mobileAspectRatio = RATIO_PATTERN.test(mobileAspectRatioRaw) ? mobileAspectRatioRaw : "9:16";

  await saveHeroSlide({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    mediaId,
    mediaType,
    mobileMediaId,
    mobileMediaType,
    mobileAspectRatio,
    mobileIsActive: formData.get("mobileIsActive") === "on",
    eyebrow: String(formData.get("eyebrow") ?? "").trim() || null,
    heading,
    subheading: String(formData.get("subheading") ?? "").trim() || null,
    ctaLabel: String(formData.get("ctaLabel") ?? "").trim() || null,
    ctaHref: String(formData.get("ctaHref") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    isActive: formData.get("isActive") === "on",
  });

  revalidatePath("/admin/hero-videos");
  revalidatePath("/");
  return { ok: true, message: "Hero slide saved." };
}

export async function savePeekAssetsAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };

  // Keep existing URLs, replace any slot that received a new upload.
  const current = await getPeekAssetSettings();
  const next = { ...current };

  const slots = [
    { field: "leftLeadUrl" as const, formKey: "leftLeadFile", scope: "peek/left-lead", alt: "Left stack: dark jeans (lead)" },
    { field: "leftFollowUrl" as const, formKey: "leftFollowFile", scope: "peek/left-follow", alt: "Left stack: light jeans (follow)" },
    { field: "leftShirtUrl" as const, formKey: "leftShirtFile", scope: "peek/left-shirt", alt: "Left stack: black MKR shirt" },
    { field: "rightLeadUrl" as const, formKey: "rightLeadFile", scope: "peek/right-lead", alt: "Right stack: lead garment" },
    { field: "rightFollowUrl" as const, formKey: "rightFollowFile", scope: "peek/right-follow", alt: "Right stack: follow garment" },
    { field: "rightShirtUrl" as const, formKey: "rightShirtFile", scope: "peek/right-shirt", alt: "Right stack: shirt garment" },
  ];

  for (const slot of slots) {
    const file = formData.get(slot.formKey);
    if (file instanceof File && file.size > 0) {
      try {
        const media = await storeUploadedFile({
          file,
          bucket: BUCKETS.uploads,
          scope: slot.scope,
          slugOrId: slot.field,
          role: "promo",
          altText: slot.alt,
          uploadedBy: `admin:${admin.subject}`,
        });
        next[slot.field] = media.publicUrl;
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Peek image upload failed." };
      }
    }
  }

  await savePeekAssetSettings(next);
  revalidatePath("/admin/peek-assets");
  revalidatePath("/");
  return { ok: true, message: "Peek images saved — the homepage stack updates on the next visit." };
}

/* Mobile hero image — ONE admin-uploaded image used only on phones, in place
   of the desktop peek composition (which never renders on mobile). Reuses the
   existing Supabase Storage pipeline (storeUploadedFile → uploads bucket →
   media_assets); the settings row keeps only the URL reference. */
export async function saveMobileHeroImageAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };

  const file = formData.get("mobileHeroFile");
  const remove = formData.get("remove") === "1";

  if (remove) {
    await saveMobileHeroImage({ url: null, altText: null });
    revalidatePath("/admin/peek-assets");
    revalidatePath("/");
    return { ok: true, message: "Mobile hero image removed — phones show the static hero fallback." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload first." };
  }

  try {
    const media = await storeUploadedFile({
      file,
      bucket: BUCKETS.uploads,
      scope: "hero/mobile",
      slugOrId: "mobile-hero",
      role: "hero",
      altText: "MKR mobile hero garment",
      uploadedBy: `admin:${admin.subject}`,
    });
    await saveMobileHeroImage({ url: media.publicUrl, altText: "MKR mobile hero garment" });
    revalidatePath("/admin/peek-assets");
    revalidatePath("/");
    return { ok: true, message: "Mobile hero image saved — phones update on the next visit." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Mobile hero image upload failed." };
  }
}

export async function deleteHeroSlideAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  if (id) await deleteHeroSlide(id);
  revalidatePath("/admin/hero-videos");
  revalidatePath("/");
  
}

export async function saveAboutSectionAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const heading = String(formData.get("heading") ?? "").trim();
  if (heading.length < 3) return { ok: false, error: "Add a heading for this section." };

  let mediaId = String(formData.get("mediaId") ?? "").trim() || null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      const media = await storeUploadedFile({
        file,
        bucket: BUCKETS.uploads,
        scope: "about",
        slugOrId: heading,
        role: "about",
        altText: heading,
        uploadedBy: `admin:${admin.subject}`,
      });
      mediaId = media.id;
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "About media upload failed." };
    }
  }

  await saveAboutSection({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    section: String(formData.get("section") ?? "story"),
    heading,
    body: String(formData.get("body") ?? "").trim() || null,
    mediaId,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    isActive: formData.get("isActive") === "on",
  });

  revalidatePath("/admin/about-media");
  revalidatePath("/about");
  return { ok: true, message: "About section saved." };
}

export async function deleteAboutSectionAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  if (id) await deleteAboutSection(id);
  revalidatePath("/admin/about-media");
  revalidatePath("/about");
  
}

export async function attachExistingMediaAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const productId = String(formData.get("productId") ?? "");
  const mediaId = String(formData.get("mediaId") ?? "");
  if (!productId || !mediaId) return { ok: false, error: "Choose a product and an existing asset." };

  const existing = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId));
  await db.insert(productImages).values({
    productId,
    mediaId,
    role: existing.length === 0 ? "main" : "gallery",
    sortOrder: existing.length,
  });
  await publishRealtimeEvent("products", "product.image_added", { productId, mediaId });
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: "Existing asset attached." };
}
