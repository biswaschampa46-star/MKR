import type { MetadataRoute } from "next";
import { listAllProductSlugs, listCategories } from "@/lib/data/catalog";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl.replace(/\/$/, "");
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/track`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const [products, categories] = await Promise.all([listAllProductSlugs(), listCategories()]);
    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: `${base}/shop?category=${category.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...products.map((product) => ({
        url: `${base}/product/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // A database outage must not break the sitemap response.
    return staticRoutes;
  }
}
