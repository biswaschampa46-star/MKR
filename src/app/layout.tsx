import type { Metadata, Viewport } from "next";
import { Archivo, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { LoadingCoordinator } from "@/components/loading/loading-coordinator";
import { CartProvider } from "@/components/cart/cart-provider";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { cartItemCount } from "@/lib/data/commerce";
import { readCartIdentity } from "@/lib/auth/identity";
import { env } from "@/lib/env";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "MKR — Casual Threads & Style",
    template: "%s | MKR",
  },
  description:
    "MKR — Casual Threads & Style. Premium minimal clothing crafted for everyday presence. Cash on delivery and prepaid mobile payments across Bangladesh.",
  applicationName: "MKR",
  openGraph: {
    type: "website",
    siteName: "MKR — Casual Threads & Style",
    title: "MKR — Casual Threads & Style",
    description: "Premium minimal clothing crafted for everyday presence.",
    url: env.siteUrl,
    images: [{ url: "/brand/baggy-jeans.png", width: 1200, height: 630, alt: "MKR — Casual Threads & Style" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MKR — Casual Threads & Style",
    images: ["/brand/baggy-jeans.png"],
  },
  icons: { icon: "/brand/mkr-mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#071a2b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [customer, identity] = await Promise.all([getCurrentCustomer(), readCartIdentity()]);
  const count = await cartItemCount(identity);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Phase 7 — progressive enhancement gate: adds `.js` BEFORE first paint so
            scroll-reveal targets start hidden ONLY when the motion engine is present.
            Without JS the html keeps the default and all [data-reveal] content is
            fully visible (audit: core content must never depend on client JS). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
      </head>
      <body className={`${archivo.variable} ${manrope.variable} min-h-dvh antialiased`}>
        {/* Phase 32: Organization + WebSite structured data (real brand facts only). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${env.siteUrl}#organization`,
                  name: "MKR — Casual Threads & Style",
                  url: env.siteUrl,
                  logo: `${env.siteUrl}/brand/mkr-mark.svg`,
                },
                {
                  "@type": "WebSite",
                  "@id": `${env.siteUrl}#website`,
                  url: env.siteUrl,
                  name: "MKR — Casual Threads & Style",
                  publisher: { "@id": `${env.siteUrl}#organization` },
                },
              ],
            }),
          }}
        />
        <LoadingCoordinator />
        <CartProvider initialCount={count} isAuthenticated={Boolean(customer)}>
          <div className="flex min-h-dvh flex-col">{children}</div>
        </CartProvider>
        {/* Announcement is rendered ONCE, visibly, by the site header (Phase 9):
            the former sr-only duplicate here is intentionally removed. */}
      </body>
    </html>
  );
}
