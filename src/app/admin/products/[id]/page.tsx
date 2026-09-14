import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm, { type ProductFormValues } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Edit Product", robots: { index: false } };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const p = rows[0];
  if (!p) notFound();

  const initial: ProductFormValues & { id: string } = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    material: p.material,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    image: p.image,
    stock: p.stock,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    sku: p.sku,
    barcode: p.barcode,
    brand: p.brand,
    category: p.category,
    subcategory: p.subcategory,
    collection: p.collection,
    productType: p.productType,
    shortDescription: p.shortDescription,
    costPrice: p.costPrice,
    taxPct: p.taxPct,
    currency: p.currency,
    gender: p.gender,
    clothingType: p.clothingType,
    fabric: p.fabric,
    fabricWeight: p.fabricWeight,
    fit: p.fit,
    pattern: p.pattern,
    season: p.season,
    countryOfOrigin: p.countryOfOrigin,
    sizes: p.sizes ?? [],
    colors: p.colors ?? [],
    variantInventory: p.variantInventory ?? [],
    variants: p.variants ?? [],
    images: p.images ?? [],
    tags: p.tags ?? [],
    isBestSeller: p.isBestSeller,
    sizeRecommendationEnabled: p.sizeRecommendationEnabled ?? false,
    isOnSale: p.isOnSale,
    status: p.status,
    visibility: p.visibility,
    trackInventory: p.trackInventory,
    allowBackorders: p.allowBackorders,
    lowStockThreshold: p.lowStockThreshold,
    weightGrams: p.weightGrams,
    packageWeightGrams: p.packageWeightGrams,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    freeShipping: p.freeShipping,
    shippingClass: p.shippingClass,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    seoKeywords: p.seoKeywords,
    canonicalUrl: p.canonicalUrl,
    seoImage: p.seoImage,
    features: p.features ?? [],
    specifications: p.specifications ?? [],
    warranty: p.warranty ?? "",
    returnPolicy: p.returnPolicy ?? "",
    deliveryInfo: p.deliveryInfo ?? "",
  };

  return (
    <AdminShell active="Products">
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">Edit product</h1>
      <ProductForm initial={initial} />
    </AdminShell>
  );
}
