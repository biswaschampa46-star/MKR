import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Background from "@/components/Background";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchOverlay from "@/components/SearchOverlay";
import AuthModal from "@/components/AuthModal";
import AiAssistant from "@/components/AiAssistant";
import AiChatFab from "@/components/AiChatFab";
import GlobalLoadingOverlay from "@/components/GlobalLoadingOverlay";
import StorefrontChrome from "@/components/StorefrontChrome";
import { getSettings } from "@/lib/settings";
import { getContactDetails } from "@/lib/contact";
import { getSiteUrl } from "@/lib/site";

/* The whole storefront renders per-request so admin Settings (title, tagline,
   delivery fees, AI config) take effect everywhere without a rebuild. */
export const dynamic = "force-dynamic";

/* Browser-tab titles & search-engine description come from admin Settings → Website identity. */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: s.siteTitle,
      template: `%s — ${s.storeName}`,
    },
    description: s.siteTagline,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: s.storeName,
      title: s.siteTitle,
      description: s.siteTagline,
      images: [{ url: "/images/mkr-logo-512.png", alt: `${s.storeName} logo` }],
    },
    twitter: {
      card: "summary_large_image",
      title: s.siteTitle,
      description: s.siteTagline,
      images: ["/images/mkr-logo-512.png"],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#071a2b",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const s = await getSettings();
  const contact = await getContactDetails();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&family=Manrope:wght@300..800&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" as="image" href="/images/loading-logo.png" />
      </head>
      <body className="bg-abyss font-body text-foam antialiased">
        <GlobalLoadingOverlay />
        <Background />
        <StorefrontChrome>
          <Nav storeName={s.storeName} siteTagline={s.siteTagline} contact={contact} />
        </StorefrontChrome>
        <div className="relative z-10">
          <main id="main">{children}</main>
          <StorefrontChrome>
            <Footer />
          </StorefrontChrome>
        </div>
        <StorefrontChrome>
          <CartDrawer fees={{ inside: s.deliveryFeeInside, outside: s.deliveryFeeOutside }} />
          <SearchOverlay />
          <AuthModal />
          <AiAssistant />
          <AiChatFab />
        </StorefrontChrome>
      </body>
    </html>
  );
}
