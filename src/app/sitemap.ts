import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (process.env.SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const staticRoutes = ["", "/shop", "/about", "/contact", "/faq", "/track", "/cart", "/checkout"];
  return staticRoutes.map((path) => ({
    url: `${siteUrl}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.6,
  }));
}
