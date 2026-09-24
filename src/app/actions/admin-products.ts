"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productImages, productVariants, products } from "@/db/schema";
import { getAdminSession } from "@/lib/auth/admin";
import {
  adjustVariantStock,
  deleteProduct,
  saveProduct,
  replaceProductImages,
  setProductsStatus,
  setProductStatus,
  upsertCategory,
  upsertVariants,
} from "@/lib/data/catalog";
import { deleteMediaAsset, storeUploadedFile } from "@/lib/data/media";
import { recordAdminAction } from "@/lib/admin-audit";
import { BUCKETS } from "@/lib/storage";
import { publishRealtimeEvent } from "@/lib/realtime";
import { categorySchema, productSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types";

type FormState = ActionResult<{ productId?: string }> | undefined;

const listOf = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<ActionResult<{ productId?: string }>> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired. Sign in again." };

  let sizeChart: { label: string; value: string }[] = [];
  try {
    const raw = String(formData.get("sizeChart") ?? "[]");
    const parsed = JSON.parse(raw || "[]") as { label?: string; value?: string }[];
    sizeChart = parsed
      .map((row) => ({ label: String(row.label ?? "").trim(), value: String(row.value ?? "").trim() }))
      .filter((row) => row.label && row.value);
  } catch {
    return { ok: false, error: "The size chart must be a valid JSON array of {label, value} rows." };
  }

  type VariantInput = {
    id?: string;
    sku: string;
    size: string;
    color: string;
    colorHex: string;
    price: string;
    stock: string;
    isActive: string;
  };
  let variants: VariantInput[] = [];
  try {
    const raw = String(formData.get("variants") ?? "[]");
    variants = (JSON.parse(raw || "[]") as VariantInput[]).filter((row) => row && row.sku);
  } catch {
    return { ok: false, error: "Variant rows could not be read. Save again." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const idRaw = formData.get("id");
  const slugRaw = String(formData.get("slug") ?? "").trim();

  const parsed = productSchema.safeParse({
    id: idRaw ? String(idRaw) : undefined,
    slug: slugRaw || slugify(name),
    name,
    brand: String(formData.get("brand") ?? "MKR").trim() || "MKR",
    categoryId: formData.get("categoryId") ? String(formData.get("categoryId")) : null,
    subcategory: String(formData.get("subcategory") ?? ""),
    shortDescription: String(formData.get("shortDescription") ?? ""),
    description: String(formData.get("description") ?? ""),
    richContent: String(formData.get("richContent") ?? ""),
    price: formData.get("price"),
    comparePrice: formData.get("comparePrice") ? formData.get("comparePrice") : null,
    sku: String(formData.get("sku") ?? "").trim(),
    status: formData.get("status") ?? "draft",
    visibility: formData.get("visibility") ?? "public",
    stock: formData.get("stock") ?? 0,
    lowStockThreshold: formData.get("lowStockThreshold") ?? 3,
    material: String(formData.get("material") ?? ""),
    fabric: String(formData.get("fabric") ?? ""),
    fit: String(formData.get("fit") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    sizes: listOf(formData.get("sizes")),
    colors: listOf(formData.get("colors")),
    tags: listOf(formData.get("tags")),
    keywords: listOf(formData.get("keywords")),
    sizeChart,
    careInstructions: String(formData.get("careInstructions") ?? ""),
    shippingInformation: String(formData.get("shippingInformation") ?? ""),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    isFeatured: formData.get("isFeatured") === "on",
    variants: [],
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please review the highlighted product fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const discount = parsed.data.comparePrice && parsed.data.comparePrice > parsed.data.price
    ? Math.round(((parsed.data.comparePrice - parsed.data.price) / parsed.data.comparePrice) * 100)
    : 0;

  try {
    const productId = await saveProduct({
      ...parsed.data,
      id: parsed.data.id,
      categoryId: parsed.data.categoryId ?? null,
      subcategory: parsed.data.subcategory || null,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      richContent: parsed.data.richContent || null,
      material: parsed.data.material || null,
      fabric: parsed.data.fabric || null,
      fit: parsed.data.fit || null,
      gender: parsed.data.gender || null,
      careInstructions: parsed.data.careInstructions || null,
      shippingInformation: parsed.data.shippingInformation || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      comparePrice: parsed.data.comparePrice ?? null,
      discountPercent: discount,
      isFeatured: Boolean(parsed.data.isFeatured),
      actor: `admin:${admin.subject}`,
    });

    await upsertVariants(
      productId,
      variants.map((variant) => ({
        id: variant.id || undefined,
        sku: variant.sku.trim(),
        size: variant.size?.trim() || null,
        color: variant.color?.trim() || null,
        colorHex: variant.colorHex?.trim() || null,
        price: variant.price !== "" && variant.price !== undefined ? Number(variant.price) : null,
        stock: Math.max(Number(variant.stock ?? 0) || 0, 0),
        isActive: variant.isActive !== "false",
      })),
      `admin:${admin.subject}`,
    );

    await publishRealtimeEvent("products", "product.saved", { productId, name: parsed.data.name });
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath(`/product/${parsed.data.slug}`);
    revalidatePath("/");

    await recordAdminAction({
      actor: `admin:${admin.subject}`,
      action: parsed.data.id ? "product.update" : "product.create",
      target: productId,
      metadata: { name: parsed.data.name, price: parsed.data.price },
    });
    if (!parsed.data.id) redirect(`/admin/products/${productId}`);
    return { ok: true, message: "Product saved.", data: { productId } };
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    const message = error instanceof Error ? error.message : "Could not save the product.";
    if (message.includes("products_slug_key")) return { ok: false, error: "That slug is already used by another product." };
    if (message.includes("products_sku_key")) return { ok: false, error: "That SKU is already used by another product." };
    if (message.includes("product_variants_sku_key")) return { ok: false, error: "A variant SKU is duplicated." };
    if (message.includes("product_variants_combo_key")) return { ok: false, error: "Two variants share the same size/colour combination." };
    return { ok: false, error: message };
  }
}

export async function setProductStatusAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "draft") as "draft" | "active" | "archived";
  if (!id) return;
  await setProductStatus(id, status);
  await recordAdminAction({ actor: `admin:${admin.subject}`, action: "product.status_change", target: id, metadata: { status } });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  
}

export async function bulkProductAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const action = String(formData.get("bulkAction") ?? "publish");
  if (ids.length === 0) return;
  await recordAdminAction({ actor: `admin:${admin.subject}`, action: "product.bulk", target: "multiple", metadata: { action, count: ids.length } });

  if (action === "delete") {
    for (const id of ids) await deleteProduct(id);
  } else {
    const status = action === "publish" ? "active" : action === "archive" ? "archived" : "draft";
    await setProductsStatus(ids, status);
  }
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await recordAdminAction({ actor: `admin:${admin.subject}`, action: "product.delete", target: id });
  await deleteProduct(id);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function uploadProductImageAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const productId = String(formData.get("productId") ?? "");
  const role = String(formData.get("role") ?? "gallery") as "main" | "gallery" | "variant" | "size_chart" | "promo";
  const altText = String(formData.get("altText") ?? "").trim() || null;
  const file = formData.get("file");
  if (!productId) return { ok: false, error: "Save the product before uploading images." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image or video file." };

  try {
    const productRows = await db.select({ slug: products.slug }).from(products).where(eq(products.id, productId)).limit(1);
    const media = await storeUploadedFile({
      file,
      bucket: BUCKETS.uploads,
      scope: `products/${productId}`,
      slugOrId: productRows[0]?.slug ?? productId,
      role,
      altText,
      uploadedBy: `admin:${admin.subject}`,
    });

    const existing = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, productId));

    await db.insert(productImages).values({
      productId,
      mediaId: media.id,
      role: existing.length === 0 ? "main" : role,
      sortOrder: existing.length,
      altText,
    });

    await publishRealtimeEvent("products", "product.image_added", { productId, mediaId: media.id });
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/shop");
    return { ok: true, message: "Media uploaded to Supabase Storage and linked to the product." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Upload failed." };
  }
}

export async function removeProductImageAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const imageId = String(formData.get("imageId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const mediaId = String(formData.get("mediaId") ?? "");
  if (!imageId) return;
  await db.delete(productImages).where(eq(productImages.id, imageId));
  if (mediaId) {
    try {
      await deleteMediaAsset(mediaId);
    } catch (error) {
      // Phase 23: shared media (e.g. a variant image reused elsewhere) is kept —
      // only the product_image link is removed.
      if (!(error instanceof Error && error.message === "MEDIA_IN_USE")) throw error;
    }
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  
}

export async function updateProductImageAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const productId = String(formData.get("productId") ?? "");
  const rows = await db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder));
  const orderedIds = String(formData.get("orderedIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const roleUpdates = new Map<string, string>();
  for (const [index, row] of rows.entries()) {
    roleUpdates.set(row.id, String(formData.get(`role_${row.id}`) ?? row.role));
    void index;
  }

  if (orderedIds.length > 0) {
    for (const [index, id] of orderedIds.entries()) {
      await db
        .update(productImages)
        .set({ sortOrder: index, role: (roleUpdates.get(id) ?? "gallery") as "main" | "gallery" | "variant" | "size_chart" | "promo" })
        .where(eq(productImages.id, id));
    }
  } else {
    for (const row of rows) {
      const role = roleUpdates.get(row.id) ?? row.role;
      await db.update(productImages).set({ role: role as "main" | "gallery" | "variant" | "size_chart" | "promo" }).where(eq(productImages.id, row.id));
    }
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  
}

export async function replaceProductImageAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const productId = String(formData.get("productId") ?? "");
  const imageId = String(formData.get("imageId") ?? "");
  const role = String(formData.get("role") ?? "gallery") as "main" | "gallery" | "variant" | "size_chart" | "promo";
  if (!imageId) return;
  await db.update(productImages).set({ role }).where(eq(productImages.id, imageId));
  revalidatePath(`/admin/products/${productId}`);
  
}

export async function adjustStockAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const variantId = String(formData.get("variantId") ?? "");
  const stock = Number(formData.get("stock") ?? 0);
  if (!variantId || Number.isNaN(stock) || stock < 0) return;
  await adjustVariantStock(variantId, Math.floor(stock), `admin:${admin.subject}`);
  await recordAdminAction({ actor: `admin:${admin.subject}`, action: "inventory.stock_change", target: variantId, metadata: { stock: Math.floor(stock) } });
  await publishRealtimeEvent("inventory", "inventory.updated", { variantId, stock });
  revalidatePath("/admin/inventory");
  
}

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const name = String(formData.get("name") ?? "").trim();
  const parsed = categorySchema.safeParse({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    name,
    slug: String(formData.get("slug") ?? "").trim() || slugify(name),
    description: String(formData.get("description") ?? ""),
    parentId: formData.get("parentId") ? String(formData.get("parentId")) : null,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstDetail = Object.values(fieldErrors).flat().find(Boolean);
    return {
      ok: false,
      error: firstDetail ? `Please review the category details: ${firstDetail}` : "Please review the category details.",
      fieldErrors,
    };
  }
  try {
    await upsertCategory({
      id: parsed.data.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      parentId: parsed.data.parentId ?? null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the category.";
    if (/duplicate|unique|already exists/i.test(message)) {
      return { ok: false, error: "A category with this name or slug already exists." };
    }
    return { ok: false, error: `Could not save the category: ${message.slice(0, 160)}` };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  return { ok: true, message: "Category saved." };
}

export async function getVariantProductId(variantId: string) {
  const rows = await db.select({ productId: productVariants.productId }).from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
  return rows[0]?.productId ?? null;
}

export async function replaceProductImagesAction(productId: string, mediaIds: string[]) {
  await replaceProductImages(
    productId,
    mediaIds.map((mediaId, index) => ({ mediaId, role: index === 0 ? "main" : "gallery", sortOrder: index })),
  );
}
