import { cache } from "react";
import { db } from "@/db";
import { products, type Product } from "@/db/schema";
import { and, desc, eq, ilike, ne, or } from "drizzle-orm";

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  isNew: boolean;
  isFeatured: boolean;
};

const cardColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  price: products.price,
  compareAtPrice: products.compareAtPrice,
  image: products.image,
  isNew: products.isNew,
  isFeatured: products.isFeatured,
} as const;

/** Admin product list row — includes status/stock/organization fields for filters & bulk actions. */
export type AdminProductRow = ProductCard & {
  sku: string;
  category: string;
  brand: string;
  stock: number;
  status: string;
  visibility: string;
  createdAt: Date;
};

export async function getAllProducts(): Promise<ProductCard[]> {
  try {
    return await db
      .select(cardColumns)
      .from(products)
      .where(and(eq(products.status, "active"), eq(products.visibility, "online")))
      .orderBy(desc(products.createdAt));
  } catch {
    return [];
  }
}

/** Full admin list (all statuses) for the admin Products page. */
export async function getAdminProducts(): Promise<AdminProductRow[]> {
  try {
    return await db
      .select({
        ...cardColumns,
        sku: products.sku,
        category: products.category,
        brand: products.brand,
        stock: products.stock,
        status: products.status,
        visibility: products.visibility,
        createdAt: products.createdAt,
      })
      .from(products)
      .orderBy(desc(products.createdAt));
  } catch {
    return [];
  }
}

/** Request-memoized: metadata + page share one DB lookup per render. Admin list stays uncached. */
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  try {
    const rows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.slug, slug),
          eq(products.status, "active"),
          eq(products.visibility, "online"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    console.error("getProductBySlug failed", err);
    return null;
  }
});

export async function getRelatedProducts(product: Product, limit = 3): Promise<ProductCard[]> {
  try {
    return await db
      .select(cardColumns)
      .from(products)
      .where(
        and(
          ne(products.id, product.id),
          eq(products.status, "active"),
          eq(products.visibility, "online"),
        ),
      )
      .limit(limit);
  } catch {
    return [];
  }
}

export async function searchProducts(q: string, limit = 6): Promise<ProductCard[]> {
  const term = `%${q.trim()}%`;
  if (!q.trim()) return [];
  try {
    return await db
      .select(cardColumns)
      .from(products)
      .where(and(
        eq(products.status, "active"),
        eq(products.visibility, "online"),
        or(ilike(products.name, term), ilike(products.description, term)),
      ))
      .limit(limit);
  } catch {
    return [];
  }
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "name";

export function sortProducts(list: ProductCard[], sort: SortKey): ProductCard[] {
  const arr = [...list];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price-desc":
      return arr.sort((a, b) => b.price - a.price);
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "featured":
      return arr.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    case "newest":
    default:
      return arr;
  }
}

export function filterProducts(
  list: ProductCard[],
  opts: { view?: string; q?: string },
): ProductCard[] {
  let out = list;
  if (opts.view === "new") out = out.filter((p) => p.isNew);
  if (opts.q) {
    const t = opts.q.toLowerCase();
    out = out.filter((p) => p.name.toLowerCase().includes(t));
  }
  return out;
}
