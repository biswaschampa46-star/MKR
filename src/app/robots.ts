import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/order/", "/profile/", "/checkout/"] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
