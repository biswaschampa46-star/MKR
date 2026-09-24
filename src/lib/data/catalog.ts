import { cache } from "react";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, guarded, rawQuery } from "@/db/client";
import {
  categories,
  inventoryMovements,
  mediaAssets,
  productImages,
  productVariants,
  products,
  reviews,
  searchQueries,
  customers,
} from "@/db/schema";
import type { MediaRef, ProductDetail, ProductImageRef, ProductSummary, Variant } from "@/types";

const mediaJson = sql`jsonb_build_object(
  'id', ma.id, 'storagePath', ma.storage_path, 'publicUrl', coalesce(ma.public_url, '/api/media/' || ma.id),
  'altText', ma.alt_text, 'kind', ma.kind, 'role', mi.role, 'sortOrder', mi.sort_order,
  'width', ma.width, 'height', ma.height
)`;

/** Same projection for queries that join product_images as `pi` (detail view). */
const mediaJsonPi = sql`jsonb_build_object(
  'id', ma.id, 'productImageId', pi.id, 'variantId', pi.variant_id,
  'storagePath', ma.storage_path, 'publicUrl', coalesce(ma.public_url, '/api/media/' || ma.id),
  'altText', ma.alt_text, 'kind', ma.kind, 'role', pi.role, 'sortOrder', pi.sort_order,
  'width', ma.width, 'height', ma.height
)`;

export type MediaRole =
  | "main"
  | "gallery"
  | "variant"
  | "size_chart"
  | "promo"
  | "hero"
  | "about"
  | "banner"
  | "avatar";

type ProductListRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  short_description: string | null;
  price: number;
  compare_price: number | null;
  discount_percent: number;
  stock: number;
  is_featured: boolean;
  created_at: string;
  category_name: string | null;
  category_slug: string | null;
  category_id: string | null;
  main_image: MediaRef | null;
  hover_image: MediaRef | null;
  sizes: string[];
  colors: string[];
  total_count?: number;
};

function toSummary(row: ProductListRow): ProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    shortDescription: row.short_description,
    price: Number(row.price),
    comparePrice: row.compare_price === null ? null : Number(row.compare_price),
    discountPercent: Number(row.discount_percent ?? 0),
    stock: Number(row.stock ?? 0),
    isFeatured: Boolean(row.is_featured),
    createdAt: new Date(row.created_at).toISOString(),
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    categoryId: row.category_id,
    mainImage: row.main_image,
    hoverImage: row.hover_image,
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
  };
}

const listSelection = sql`
  p.id, p.slug, p.name, p.brand, p.short_description, p.price, p.compare_price, p.discount_percent,
  p.stock, p.is_featured, p.created_at, p.status, p.visibility,
  c.name as category_name, c.slug as category_slug, c.id as category_id,
  (select ${mediaJson} from product_images mi
     join media_assets ma on ma.id = mi.media_id
    where mi.product_id = p.id
    order by (mi.role = 'main') desc, mi.sort_order asc
    limit 1) as main_image,
  (select ${mediaJson} from product_images mi
     join media_assets ma on ma.id = mi.media_id
    where mi.product_id = p.id
    order by (mi.role = 'main') desc, mi.sort_order asc
    offset 1 limit 1) as hover_image,
  coalesce((select array_agg(distinct pv.size) from product_variants pv
             where pv.product_id = p.id and pv.is_active and pv.size is not null), '{}') as sizes,
  coalesce((select array_agg(distinct pv.color) from product_variants pv
             where pv.product_id = p.id and pv.is_active and pv.color is not null), '{}') as colors
`;

export type ProductQuery = {
  search?: string;
  categorySlug?: string;
  categoryId?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  featuredOnly?: boolean;
  newArrivalsOnly?: boolean;
  onSaleOnly?: boolean;
  includeUnpublished?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "popular" | "discount";
  page?: number;
  perPage?: number;
};

const orderClause = (sort: ProductQuery["sort"]) => {
  switch (sort) {
    case "price-asc":
      return sql`order by p.price asc, p.created_at desc`;
    case "price-desc":
      return sql`order by p.price desc, p.created_at desc`;
    case "discount":
      return sql`order by p.discount_percent desc, p.created_at desc`;
    case "popular":
      return sql`order by (select coalesce(sum(oi.quantity), 0) from order_items oi where oi.product_id = p.id) desc,
                        p.created_at desc`;
    default:
      return sql`order by p.is_featured desc, p.created_at desc`;
  }
};

function buildWhere(query: ProductQuery) {
  const clauses = [sql`true`];
  if (!query.includeUnpublished) {
    clauses.push(sql`p.status = 'active' and p.visibility = 'public'`);
  }
  if (query.search) {
    const like = `%${query.search.trim()}%`;
    clauses.push(sql`(
      p.name ilike ${like} or p.sku ilike ${like} or p.brand ilike ${like}
      or coalesce(p.short_description, '') ilike ${like}
      or coalesce(p.description, '') ilike ${like}
      or coalesce(c.name, '') ilike ${like}
      or exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) tg where tg ilike ${like})
      or exists (select 1 from unnest(coalesce(p.keywords, '{}'::text[])) kw where kw ilike ${like})
    )`);
  }
  if (query.categorySlug) clauses.push(sql`c.slug = ${query.categorySlug}`);
  if (query.categoryId) clauses.push(sql`p.category_id = ${query.categoryId}`);
  if (typeof query.minPrice === "number") clauses.push(sql`p.price >= ${query.minPrice}`);
  if (typeof query.maxPrice === "number") clauses.push(sql`p.price <= ${query.maxPrice}`);
  if (query.featuredOnly) clauses.push(sql`p.is_featured = true`);
  if (query.onSaleOnly) clauses.push(sql`p.compare_price is not null and p.compare_price > p.price`);
  if (query.newArrivalsOnly) clauses.push(sql`p.created_at > now() - interval '45 days'`);
  if (query.size) {
    clauses.push(sql`exists (select 1 from product_variants pv where pv.product_id = p.id and pv.is_active and pv.size = ${query.size})`);
  }
  if (query.color) {
    clauses.push(sql`exists (select 1 from product_variants pv where pv.product_id = p.id and pv.is_active and pv.color = ${query.color})`);
  }
  if (query.inStockOnly) {
    clauses.push(sql`(p.stock > 0 or exists (select 1 from product_variants pv where pv.product_id = p.id and pv.is_active and pv.stock > 0))`);
  }
  return sql.join(clauses, sql` and `);
}

export async function listProducts(query: ProductQuery = {}) {
  return guarded("Loading products", async () => {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(48, Math.max(1, query.perPage ?? 12));
    const where = buildWhere(query);

    const [countRow] = await rawQuery<{ total: string }>(
      sql`select count(*)::text as total from products p
          left join categories c on c.id = p.category_id
          where ${where}`,
    );

    const rows = await rawQuery<ProductListRow>(
      sql`select ${listSelection} from products p
          left join categories c on c.id = p.category_id
          where ${where}
          ${orderClause(query.sort)}
          limit ${perPage} offset ${(page - 1) * perPage}`,
    );

    return {
      items: rows.map(toSummary),
      total: Number(countRow?.total ?? 0),
      page,
      perPage,
    };
  });
}

export async function getFeaturedProducts(limit = 8) {
  const result = await listProducts({ featuredOnly: true, perPage: limit });
  if (result.items.length > 0) return result.items;
  return (await listProducts({ perPage: limit })).items;
}

export async function listAvailableFilters() {
  return guarded("Loading filters", async () => {
    const sizes = await rawQuery<{ size: string }>(
      sql`select distinct pv.size as size from product_variants pv
           join products p on p.id = pv.product_id
          where pv.is_active and pv.size is not null and p.status = 'active'
          order by pv.size asc`,
    );
    const colors = await rawQuery<{ color: string; hex: string | null }>(
      sql`select pv.color as color, min(pv.color_hex) as hex from product_variants pv
           join products p on p.id = pv.product_id
          where pv.is_active and pv.color is not null and p.status = 'active'
          group by pv.color order by pv.color asc`,
    );
    const price = await rawQuery<{ min: string | null; max: string | null }>(
      sql`select min(price)::text as min, max(price)::text as max from products where status = 'active' and visibility = 'public'`,
    );
    return {
      sizes: sizes.map((s) => s.size),
      colors: colors.map((c) => ({ name: c.color, hex: c.hex })),
      price: { min: Number(price[0]?.min ?? 0), max: Number(price[0]?.max ?? 0) },
    };
  });
}

export async function getProductBySlug(slug: string, options: { includeUnpublished?: boolean } = {}) {
  const rows = await rawQuery<ProductDetailRow>(
    sql`select p.*, c.name as category_name, c.slug as category_slug, c.id as category_id,
          coalesce((select jsonb_agg(${mediaJsonPi} order by pi.sort_order)
                     from product_images pi join media_assets ma on ma.id = pi.media_id
                    where pi.product_id = p.id), '[]'::jsonb) as images,
          coalesce((select jsonb_agg(jsonb_build_object(
              'id', pv.id, 'productId', pv.product_id, 'sku', pv.sku, 'size', pv.size, 'color', pv.color,
              'colorHex', pv.color_hex, 'price', coalesce(pv.price, p.price), 'stock', pv.stock,
              'isActive', pv.is_active,
              'imageUrl', (select coalesce(ma2.public_url, '/api/media/' || ma2.id) from media_assets ma2 where ma2.id = pv.image_media_id)
            ) order by pv.sort_order, pv.size nulls first, pv.color nulls first)
                     from product_variants pv where pv.product_id = p.id), '[]'::jsonb) as variants,
          (select round(avg(r.rating)::numeric, 2)::float from reviews r where r.product_id = p.id and r.status = 'approved') as rating_average,
          (select count(*)::int from reviews r where r.product_id = p.id and r.status = 'approved') as rating_count
     from products p
     left join categories c on c.id = p.category_id
     where p.slug = ${slug}
     ${options.includeUnpublished ? sql`` : sql`and p.status = 'active' and p.visibility = 'public'`}
     limit 1`,
  );
  const row = rows[0];
  if (!row) return null;
  return mapProductDetail(row);
}

type ProductDetailRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  short_description: string | null;
  description: string | null;
  rich_content: string | null;
  subcategory: string | null;
  price: number;
  compare_price: number | null;
  discount_percent: number;
  sku: string;
  status: "draft" | "active" | "archived";
  visibility: "public" | "hidden";
  stock: number;
  material: string | null;
  fabric: string | null;
  fit: string | null;
  gender: string | null;
  sizes: string[] | null;
  colors: string[] | null;
  tags: string[] | null;
  keywords: string[] | null;
  size_chart: { label: string; value: string }[] | null;
  care_instructions: string | null;
  shipping_information: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_featured: boolean;
  created_at: string;
  category_name: string | null;
  category_slug: string | null;
  category_id: string | null;
  images: ProductImageRef[];
  variants: Variant[];
  rating_average: number | null;
  rating_count: number;
};

function mapProductDetail(row: ProductDetailRow): ProductDetail {
  const images = (row.images ?? []).map((image) => ({
    ...image,
    role: image.role,
    publicUrl: image.publicUrl ?? `/api/media/${image.id}`,
  }));
  const main =
    images.find((image) => image.role === "main") ?? images[0] ?? null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    shortDescription: row.short_description,
    description: row.description,
    richContent: row.rich_content,
    subcategory: row.subcategory,
    price: Number(row.price),
    comparePrice: row.compare_price === null ? null : Number(row.compare_price),
    discountPercent: Number(row.discount_percent ?? 0),
    sku: row.sku,
    status: row.status,
    visibility: row.visibility,
    stock: Number(row.stock ?? 0),
    material: row.material,
    fabric: row.fabric,
    fit: row.fit,
    gender: row.gender,
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    tags: row.tags ?? [],
    keywords: row.keywords ?? [],
    sizeChart: row.size_chart ?? [],
    careInstructions: row.care_instructions,
    shippingInformation: row.shipping_information,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    isFeatured: Boolean(row.is_featured),
    createdAt: new Date(row.created_at).toISOString(),
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    categoryId: row.category_id,
    mainImage: main,
    hoverImage: images[1] ?? null,
    images,
    variants: (row.variants ?? []).map((variant) => ({
      ...variant,
      price: Number(variant.price),
      stock: Number(variant.stock),
    })),
    ratingAverage: row.rating_average === null ? null : Number(row.rating_average),
    ratingCount: Number(row.rating_count ?? 0),
  };
}

export async function getProductById(id: string) {
  const rows = await rawQuery<{ slug: string }>(sql`select slug from products where id = ${id} limit 1`);
  if (!rows[0]) return null;
  return getProductBySlug(rows[0].slug, { includeUnpublished: true });
}

export async function listRelatedProducts(productId: string, categoryId: string | null, limit = 4) {
  return guarded("Loading related products", async () => {
    const where = categoryId
      ? sql`p.status = 'active' and p.visibility = 'public' and p.category_id = ${categoryId} and p.id <> ${productId}`
      : sql`p.status = 'active' and p.visibility = 'public' and p.id <> ${productId}`;
    const rows = await rawQuery<ProductListRow>(
      sql`select ${listSelection} from products p
          left join categories c on c.id = p.category_id
          where ${where}
          order by p.is_featured desc, p.created_at desc limit ${limit}`,
    );
    return rows.map(toSummary);
  });
}

export async function listAllProductSlugs() {
  const rows = await rawQuery<{ slug: string; updated_at: string }>(
    sql`select slug, updated_at from products where status = 'active' and visibility = 'public' order by updated_at desc`,
  );
  return rows;
}

export async function recordSearch(query: string, customerId: string | null, resultCount: number) {
  const trimmed = query.trim().slice(0, 120);
  if (!trimmed) return;
  await db.insert(searchQueries).values({ query: trimmed, customerId, resultCount });
}

export async function recentSearches(customerId: string, limit = 8) {
  const rows = await db
    .select({ query: searchQueries.query, createdAt: searchQueries.createdAt })
    .from(searchQueries)
    .where(eq(searchQueries.customerId, customerId))
    .orderBy(desc(searchQueries.createdAt))
    .limit(limit);
  return rows;
}

/* ------------------------------- categories ------------------------------ */
export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageMediaId: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  imageUrl: string | null;
};

/* Phase 28: per-request deduplication (header nav + page + sitemap all ask).
   React cache() scopes the memo to a single request — never cross-request,
   so admin edits stay immediately visible. */
export const listCategories = cache(async function listCategories(includeInactive = false) {
  return rawQuery<CategoryRow>(
    sql`select c.id, c.slug, c.name, c.description, c.image_media_id, c.parent_id, c.sort_order, c.is_active,
          (select count(*)::int from products p where p.category_id = c.id and p.status = 'active' and p.visibility = 'public') as "productCount",
          (select coalesce(ma.public_url, '/api/media/' || ma.id) from media_assets ma where ma.id = c.image_media_id) as "imageUrl"
     from categories c
     where ${includeInactive ? sql`true` : sql`c.is_active = true`}
     order by c.sort_order asc, c.name asc`,
  );
});

export async function getCategoryBySlug(slug: string) {
  const rows = await listCategories(true);
  return rows.find((row) => row.slug === slug) ?? null;
}

export async function upsertCategory(input: {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const values = {
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
    updatedAt: new Date(),
  };
  if (input.id) {
    await db.update(categories).set(values).where(eq(categories.id, input.id));
    return input.id;
  }
  const inserted = await db.insert(categories).values(values).returning({ id: categories.id });
  return inserted[0].id;
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}

/* ------------------------------ product CRUD ----------------------------- */
type ProductWriteInput = {
  id?: string;
  slug: string;
  name: string;
  brand: string;
  categoryId: string | null;
  subcategory: string | null;
  shortDescription: string | null;
  description: string | null;
  richContent: string | null;
  price: number;
  comparePrice: number | null;
  discountPercent: number;
  sku: string;
  status: "draft" | "active" | "archived";
  visibility: "public" | "hidden";
  stock: number;
  lowStockThreshold: number;
  material: string | null;
  fabric: string | null;
  fit: string | null;
  gender: string | null;
  sizes: string[];
  colors: string[];
  tags: string[];
  keywords: string[];
  sizeChart: { label: string; value: string }[];
  careInstructions: string | null;
  shippingInformation: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isFeatured: boolean;
  actor: string;
};

export async function saveProduct(input: ProductWriteInput) {
  const { actor, id, ...values } = input;
  if (id) {
    await db
      .update(products)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(products.id, id));
    return id;
  }
  const inserted = await db
    .insert(products)
    .values({ ...values, createdBy: actor })
    .returning({ id: products.id });
  return inserted[0].id;
}

export async function setProductStatus(id: string, status: "draft" | "active" | "archived") {
  await db.update(products).set({ status, updatedAt: new Date() }).where(eq(products.id, id));
}

export async function setProductsStatus(ids: string[], status: "draft" | "active" | "archived") {
  if (ids.length === 0) return;
  await db.update(products).set({ status, updatedAt: new Date() }).where(inArray(products.id, ids));
}

export async function setProductVariantPrice(input: { variantId: string; price: number | null }) {
  await db
    .update(productVariants)
    .set({ price: input.price, updatedAt: new Date() })
    .where(eq(productVariants.id, input.variantId));
}

export async function deleteProduct(id: string) {
  await db.delete(products).where(eq(products.id, id));
}

export async function replaceProductImages(
  productId: string,
  images: { mediaId: string; role: MediaRole; sortOrder: number; altText?: string | null; variantId?: string | null }[],
) {
  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (images.length === 0) return;
  await db.insert(productImages).values(
    images.map((image) => ({
      productId,
      mediaId: image.mediaId,
      role: image.role,
      sortOrder: image.sortOrder,
      altText: image.altText ?? null,
      variantId: image.variantId ?? null,
    })),
  );
}

export async function upsertVariants(
  productId: string,
  variants: {
    id?: string;
    sku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    price: number | null;
    stock: number;
    isActive: boolean;
  }[],
  actor: string,
) {
  const keptIds: string[] = [];
  for (const [index, variant] of variants.entries()) {
    if (variant.id) {
      const before = await db.select().from(productVariants).where(eq(productVariants.id, variant.id)).limit(1);
      await db
        .update(productVariants)
        .set({
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          colorHex: variant.colorHex,
          price: variant.price,
          stock: variant.stock,
          isActive: variant.isActive,
          sortOrder: index,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, variant.id));
      const previousStock = before[0]?.stock ?? 0;
      if (previousStock !== variant.stock) {
        await db.insert(inventoryMovements).values({
          productId,
          variantId: variant.id,
          delta: variant.stock - previousStock,
          stockAfter: variant.stock,
          reason: "admin_adjustment",
          actor,
        });
      }
      keptIds.push(variant.id);
    } else {
      const inserted = await db
        .insert(productVariants)
        .values({
          productId,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          colorHex: variant.colorHex,
          price: variant.price,
          stock: variant.stock,
          isActive: variant.isActive,
          sortOrder: index,
        })
        .returning({ id: productVariants.id });
      keptIds.push(inserted[0].id);
      if (variant.stock !== 0) {
        await db.insert(inventoryMovements).values({
          productId,
          variantId: inserted[0].id,
          delta: variant.stock,
          stockAfter: variant.stock,
          reason: "variant_created",
          actor,
        });
      }
    }
  }

  const existing = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.productId, productId));
  const removed = existing.filter((row) => !keptIds.includes(row.id)).map((row) => row.id);
  if (removed.length > 0) {
    await db.delete(productVariants).where(inArray(productVariants.id, removed));
  }

  const [aggregate] = await rawQuery<{ total: string }>(
    sql`select coalesce(sum(stock), 0)::text as total from product_variants where product_id = ${productId} and is_active`,
  );
  await db
    .update(products)
    .set({ stock: Number(aggregate?.total ?? 0), updatedAt: new Date() })
    .where(eq(products.id, productId));
}

export async function adjustVariantStock(variantId: string, stock: number, actor: string) {
  const rows = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
  const variant = rows[0];
  if (!variant) throw new Error("Variant not found");
  const [aggregate] = await rawQuery<{ total: string }>(
    sql`select coalesce(sum(stock), 0)::text as total from product_variants where product_id = ${variant.productId} and is_active`,
  );
  await db
    .update(productVariants)
    .set({ stock, updatedAt: new Date() })
    .where(eq(productVariants.id, variantId));
  await db.insert(inventoryMovements).values({
    productId: variant.productId,
    variantId,
    delta: stock - variant.stock,
    stockAfter: stock,
    reason: "admin_adjustment",
    actor,
  });
  await db
    .update(products)
    .set({
      stock: Number(aggregate?.total ?? 0) + (stock - variant.stock),
      updatedAt: new Date(),
    })
    .where(eq(products.id, variant.productId));
}

export async function listInventory(limit = 100, lowOnly = false) {
  return rawQuery<{
    variantId: string | null;
    productId: string;
    productName: string;
    slug: string;
    sku: string | null;
    size: string | null;
    color: string | null;
    stock: number;
    productStock: number;
    threshold: number;
    status: string;
  }>(
    sql`select pv.id as "variantId", p.id as "productId", p.name as "productName", p.slug, pv.sku, pv.size, pv.color,
               pv.stock, p.stock as "productStock", p.low_stock_threshold as threshold, p.status::text as status
          from product_variants pv
          join products p on p.id = pv.product_id
         where ${lowOnly ? sql`pv.stock <= p.low_stock_threshold` : sql`true`}
         order by pv.stock asc, p.name asc
         limit ${limit}`,
  );
}

/* -------------------------------- reviews -------------------------------- */
export async function listApprovedReviews(productId: string) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      customerName: customers.fullName,
    })
    .from(reviews)
    .innerJoin(customers, eq(customers.id, reviews.customerId))
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt))
    .limit(30);
}

export async function listCustomerReviews(customerId: string) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      status: reviews.status,
      createdAt: reviews.createdAt,
      productId: reviews.productId,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.customerId, customerId))
    .orderBy(desc(reviews.createdAt));
}

export async function upsertReview(input: {
  productId: string;
  customerId: string;
  rating: number;
  title: string | null;
  body: string;
}) {
  const existing = await db
    .select({ id: reviews.id, status: reviews.status })
    .from(reviews)
    .where(and(eq(reviews.productId, input.productId), eq(reviews.customerId, input.customerId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(reviews)
      .set({
        rating: input.rating,
        title: input.title,
        body: input.body,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, existing[0].id));
    return { id: existing[0].id, updated: true };
  }
  const inserted = await db
    .insert(reviews)
    .values({
      productId: input.productId,
      customerId: input.customerId,
      rating: input.rating,
      title: input.title,
      body: input.body,
    })
    .returning({ id: reviews.id });
  return { id: inserted[0].id, updated: false };
}

export async function deleteReview(id: string) {
  await db.delete(reviews).where(eq(reviews.id, id));
}

export async function moderateReview(id: string, status: "pending" | "approved" | "rejected", note?: string | null) {
  await db
    .update(reviews)
    .set({ status, moderationNote: note ?? null, updatedAt: new Date() })
    .where(eq(reviews.id, id));
}

export async function listReviewsForAdmin(status?: "pending" | "approved" | "rejected") {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      status: reviews.status,
      createdAt: reviews.createdAt,
      customerName: customers.fullName,
      customerEmail: customers.email,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(reviews)
    .innerJoin(customers, eq(customers.id, reviews.customerId))
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(status ? eq(reviews.status, status) : sql`true`)
    .orderBy(desc(reviews.createdAt))
    .limit(200);
}

export async function getProductOptions() {
  const rows = await db
    .select({ id: products.id, name: products.name, slug: products.slug })
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(500);
  return rows;
}

export async function listMediaForPicker(bucket?: string) {
  const rows = await db
    .select({
      id: mediaAssets.id,
      storagePath: mediaAssets.storagePath,
      publicUrl: mediaAssets.publicUrl,
      altText: mediaAssets.altText,
      kind: mediaAssets.kind,
      role: mediaAssets.role,
      bucket: mediaAssets.bucket,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .where(bucket ? eq(mediaAssets.bucket, bucket) : sql`true`)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(200);
  return rows.map((row) => ({ ...row, publicUrl: row.publicUrl ?? `/api/media/${row.id}` }));
}
