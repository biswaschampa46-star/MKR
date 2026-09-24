import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db, rawQuery } from "@/db/client";
import { aboutSections, customers, heroSlides, mediaAssets, productImages } from "@/db/schema";
import { BUCKETS, buildStoragePath, deleteObject, extensionFor, storageMode, uploadObject, validateUpload, verifyMagicBytes, type BucketName } from "@/lib/storage";
import type { MediaRef } from "@/types";

export type MediaRow = {
  id: string;
  kind: "image" | "video" | "document";
  role: string;
  storageProvider: string;
  bucket: string;
  storagePath: string;
  publicUrl: string;
  altText: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  createdAt: string;
};

const mediaSelection = sql`
  id, kind, role, storage_provider as "storageProvider", bucket, storage_path as "storagePath",
  coalesce(public_url, '/api/media/' || id) as "publicUrl", alt_text as "altText",
  mime_type as "mimeType", size_bytes as "sizeBytes", width, height, sort_order as "sortOrder",
  created_at as "createdAt"
`;

export async function storeUploadedFile(input: {
  file: File;
  bucket: BucketName;
  scope: string;
  slugOrId: string;
  role: MediaRow["role"];
  altText?: string | null;
  uploadedBy: string;
}): Promise<MediaRow> {
  const validation = validateUpload(
    { type: input.file.type, size: input.file.size, name: input.file.name },
    input.bucket,
  );
  if (!validation.ok) throw new Error(validation.error);

  const id = randomUUID();
  const extension = extensionFor(input.file.type, input.file.name);
  const storagePath = buildStoragePath({
    bucket: input.bucket,
    scope: input.scope,
    slugOrId: input.slugOrId,
    extension,
    id,
  });
  const bytes = Buffer.from(await input.file.arrayBuffer());

  // Phase 24: the declared MIME type must match the file's actual content.
  const magic = verifyMagicBytes(bytes, input.file.type);
  if (!magic.ok) throw new Error(magic.error ?? "The file content could not be verified.");

  const stored = await uploadObject({
    id,
    bucket: input.bucket,
    storagePath,
    bytes,
    mimeType: input.file.type,
    kind: validation.kind,
  });
  if ("error" in stored) throw new Error(stored.error);

  const inserted = await db
    .insert(mediaAssets)
    .values({
      id,
      kind: validation.kind,
      role: input.role as MediaRow["role"] as never,
      storageProvider: stored.provider,
      bucket: stored.bucket,
      storagePath: stored.storagePath,
      publicUrl: stored.publicUrl,
      altText: input.altText ?? null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      metadata: { originalName: input.file.name, storageMode: storageMode() },
      bytes: stored.provider === "database" ? bytes : null,
      uploadedBy: input.uploadedBy,
    })
    .returning({ id: mediaAssets.id });

  const row = await getMediaAsset(inserted[0].id);
  if (!row) throw new Error("Media record could not be created.");
  return row;
}

export async function getMediaAsset(id: string): Promise<MediaRow | null> {
  const rows = await rawQuery<MediaRow>(sql`select ${mediaSelection} from media_assets where id = ${id} limit 1`);
  return rows[0] ?? null;
}

export async function getMediaBinary(id: string) {
  const rows = await db
    .select({ bytes: mediaAssets.bytes, mimeType: mediaAssets.mimeType, sizeBytes: mediaAssets.sizeBytes })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listMedia(role?: string) {
  const rows = await rawQuery<MediaRow>(
    sql`select ${mediaSelection} from media_assets
        where ${role ? sql`role = ${role}::media_role` : sql`true`}
        order by created_at desc limit 200`,
  );
  return rows;
}

export async function deleteMediaAsset(id: string) {
  const asset = await getMediaAsset(id);
  if (!asset) return;

  // Phase 23: never delete media that is still referenced anywhere.
  // (hero_slides / about_sections / customers use ON DELETE SET NULL, so those
  // references must be checked explicitly; product_images cascades.)
  const references = await rawQuery<{ count: number }>(sql`
    select (
      (select count(*) from product_images pi where pi.media_id = ${id}) +
      (select count(*) from hero_slides h  where h.media_id  = ${id}) +
      (select count(*) from about_sections a where a.media_id = ${id}) +
      (select count(*) from customers c    where c.avatar_media_id = ${id})
    )::int as count
  `);
  if ((references[0]?.count ?? 0) > 0) {
    throw new Error("MEDIA_IN_USE");
  }

  if (asset.storageProvider === "supabase") {
    await deleteObject(asset.bucket as BucketName, asset.storagePath);
  }
  await db.delete(productImages).where(eq(productImages.mediaId, id));
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
}

export async function updateMediaAltText(id: string, altText: string | null) {
  await db.update(mediaAssets).set({ altText }).where(eq(mediaAssets.id, id));
}

export async function setCustomerAvatar(customerId: string, mediaId: string) {
  await db
    .update(customers)
    .set({ avatarMediaId: mediaId, updatedAt: new Date() })
    .where(eq(customers.id, customerId));
}

export async function clearCustomerAvatar(customerId: string) {
  await db
    .update(customers)
    .set({ avatarMediaId: null, updatedAt: new Date() })
    .where(eq(customers.id, customerId));
}

/* --------------------------------- hero ---------------------------------- */
export type HeroSlideRow = {
  id: string;
  mediaId: string | null;
  mediaType: string;
  mobileMediaId: string | null;
  mobileMediaType: string;
  mobileAspectRatio: string;
  mobileIsActive: boolean;
  eyebrow: string | null;
  heading: string;
  subheading: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
  mediaUrl: string | null;
  mediaKind: string | null;
  mobileMediaUrl: string | null;
  mobileMediaKind: string | null;
};

/**
 * Authoritative kind for one hero media slot. The asset's real kind
 * (media_assets.kind — magic-byte verified at upload) wins over the legacy
 * hero_slides.media_type column, which goes stale whenever a slot's media is
 * replaced: a stale "video" type used to feed an image URL into <video> and
 * blank the hero. media_type is only the fallback for rows without an asset.
 */
export function heroMediaKind(
  kind: string | null | undefined,
  type: string | null | undefined,
): "image" | "video" {
  if (kind === "image" || kind === "video") return kind;
  return type === "video" ? "video" : "image";
}

export async function listHeroSlides(activeOnly = false) {
  return rawQuery<HeroSlideRow>(
    sql`select h.id, h.media_id as "mediaId", h.media_type as "mediaType",
               h.mobile_media_id as "mobileMediaId", h.mobile_media_type as "mobileMediaType",
               h.mobile_aspect_ratio as "mobileAspectRatio", h.mobile_is_active as "mobileIsActive",
               h.eyebrow, h.heading, h.subheading,
               h.cta_label as "ctaLabel", h.cta_href as "ctaHref", h.sort_order as "sortOrder", h.is_active as "isActive",
               (select coalesce(ma.public_url, '/api/media/' || ma.id) from media_assets ma where ma.id = h.media_id) as "mediaUrl",
               (select ma.kind::text from media_assets ma where ma.id = h.media_id) as "mediaKind",
               (select coalesce(ma.public_url, '/api/media/' || ma.id) from media_assets ma where ma.id = h.mobile_media_id) as "mobileMediaUrl",
               (select ma.kind::text from media_assets ma where ma.id = h.mobile_media_id) as "mobileMediaKind"
          from hero_slides h
         where ${activeOnly ? sql`h.is_active = true` : sql`true`}
         order by h.sort_order asc, h.created_at asc`,
  );
}

export async function saveHeroSlide(input: {
  id?: string;
  mediaId: string | null;
  mediaType: "image" | "video";
  mobileMediaId?: string | null;
  mobileMediaType?: "image" | "video";
  mobileAspectRatio?: string;
  mobileIsActive?: boolean;
  eyebrow: string | null;
  heading: string;
  subheading: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  const { id, ...values } = input;
  if (id) {
    await db.update(heroSlides).set({ ...values, updatedAt: new Date() }).where(eq(heroSlides.id, id));
    return id;
  }
  const inserted = await db.insert(heroSlides).values(values).returning({ id: heroSlides.id });
  return inserted[0].id;
}

export async function deleteHeroSlide(id: string) {
  await db.delete(heroSlides).where(eq(heroSlides.id, id));
}

/* --------------------------------- about --------------------------------- */
export async function listAboutSections(activeOnly = false) {
  return rawQuery<{
    id: string;
    section: string;
    heading: string;
    body: string | null;
    mediaId: string | null;
    sortOrder: number;
    isActive: boolean;
    mediaUrl: string | null;
  }>(
    sql`select a.id, a.section, a.heading, a.body, a.media_id as "mediaId", a.sort_order as "sortOrder",
               a.is_active as "isActive",
               (select coalesce(ma.public_url, '/api/media/' || ma.id) from media_assets ma where ma.id = a.media_id) as "mediaUrl"
          from about_sections a
         where ${activeOnly ? sql`a.is_active = true` : sql`true`}
         order by a.sort_order asc, a.created_at asc`,
  );
}

export async function saveAboutSection(input: {
  id?: string;
  section: string;
  heading: string;
  body: string | null;
  mediaId: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  const { id, ...values } = input;
  if (id) {
    await db.update(aboutSections).set({ ...values, updatedAt: new Date() }).where(eq(aboutSections.id, id));
    return id;
  }
  const inserted = await db.insert(aboutSections).values(values).returning({ id: aboutSections.id });
  return inserted[0].id;
}

export async function deleteAboutSection(id: string) {
  await db.delete(aboutSections).where(eq(aboutSections.id, id));
}

export async function listBrandingMedia(): Promise<MediaRef[]> {
  const rows = await rawQuery<MediaRef>(
    sql`select id, storage_path as "storagePath", coalesce(public_url, '/api/media/' || id) as "publicUrl",
               alt_text as "altText", kind, role, sort_order as "sortOrder", width, height
          from media_assets where role in ('hero','about','banner','promo')
          order by created_at desc limit 60`,
  );
  return rows;
}

export const UPLOAD_BUCKETS = BUCKETS;
