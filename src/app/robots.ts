import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/product/", "/about", "/contact", "/faq", "/track"],
        disallow: ["/admin", "/profile", "/api/", "/checkout", "/cart", "/order/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
