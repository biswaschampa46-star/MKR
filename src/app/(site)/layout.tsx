import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FloatingContact } from "@/components/layout/floating-contact";
import { SmoothScroll } from "@/components/smooth-scroll";
import { getContactSettings, getPeekAssetSettings } from "@/lib/data/content";

/**
 * Public site frame. `main` reserves symmetric gutters via the --gutter CSS
 * variable so pages can pull `.full-bleed` sections edge-to-edge with
 * matching negative margins — no per-page container math.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  // Admin-configurable floating peek images (Settings → Peek images);
  // unset slots fall back to the bundled brand cutouts inside SmoothScroll.
  // The contact dock props come from the `contact` settings row written by
  // Settings → Contact details → Contact / Social Links.
  const [peekAssets, contact] = await Promise.all([getPeekAssetSettings(), getContactSettings()]);

  return (
    <>
      <SmoothScroll
        peekSources={{
          left: {
            lead: peekAssets.leftLeadUrl,
            follow: peekAssets.leftFollowUrl,
            shirt: peekAssets.leftShirtUrl,
          },
          right: {
            lead: peekAssets.rightLeadUrl,
            follow: peekAssets.rightFollowUrl,
            shirt: peekAssets.rightShirtUrl,
          },
        }}
      />
      <SiteHeader />
      {/* Phase 21: keyboard users can jump straight past the navigation. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:border focus:border-[#8ccbff]/40 focus:bg-[#0b263d] focus:px-5 focus:py-2.5 focus:text-sm focus:text-[#f4faff]"
      >
        Skip to content
      </a>
      <main id="main-content" className="w-full flex-1 px-[var(--gutter)] pb-16 pt-6">
        {children}
      </main>
      <SiteFooter />
      {/* Always-visible floating contact dock (Instagram / Facebook / WhatsApp). */}
      <FloatingContact instagram={contact.instagram} facebook={contact.facebook} whatsapp={contact.whatsappUrl} />
    </>
  );
}
