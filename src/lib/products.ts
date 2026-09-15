import { db } from "@/db";
import { products, type Product } from "@/db/schema";
import { desc, eq, ilike, ne, or } from "drizzle-orm";

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

/* ------------------------------------------------------------------ */
/*  Error-vs-empty contract                                            */
/*                                                                     */
/*  A failed database query MUST NOT be indistinguishable from a       */
/*  successful query that returned zero rows. Callers use              */
/*  `ok === false` to render an explicit error/retry state instead of  */
/*  pretending the catalogue is empty (or, worse, that a product       */
/*  "does not exist").                                                 */
/* ------------------------------------------------------------------ */

export type ProductResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function describeDbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[products] database query failed:", msg);
  return msg;
}

export async function getAllProducts(): Promise<ProductResult<ProductCard[]>> {
  try {
    const rows = await db
      .select(cardColumns)
      .from(products)
      .orderBy(desc(products.createdAt));
    return { ok: true, data: rows };
  } catch (err) {
    return { ok: false, error: describeDbError(err) };
  }
}

/**
 * Fetch a single product by its canonical slug. Returns `null` ONLY when the
 * database was queried successfully and no row matched — a query failure is
 * reported as `{ ok: false }` so the product page can show a retry state
 * instead of a false 404.
 */
export async function getProductBySlug(
  slug: string,
): Promise<ProductResult<Product | null>> {
  try {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    return { ok: true, data: rows[0] ?? null };
  } catch (err) {
    return { ok: false, error: describeDbError(err) };
  }
}

export async function getRelatedProducts(
  product: Product,
  limit = 3,
): Promise<ProductResult<ProductCard[]>> {
  try {
    const rows = await db
      .select(cardColumns)
      .from(products)
      .where(ne(products.id, product.id))
      .limit(limit);
    return { ok: true, data: rows };
  } catch (err) {
    return { ok: false, error: describeDbError(err) };
  }
}

export async function searchProducts(
  q: string,
  limit = 6,
): Promise<ProductResult<ProductCard[]>> {
  const term = `%${q.trim()}%`;
  if (!q.trim()) return { ok: true, data: [] };
  try {
    const rows = await db
      .select(cardColumns)
      .from(products)
      .where(or(ilike(products.name, term), ilike(products.description, term)))
      .limit(limit);
    return { ok: true, data: rows };
  } catch (err) {
    return { ok: false, error: describeDbError(err) };
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
