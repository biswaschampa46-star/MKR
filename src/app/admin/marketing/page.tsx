import type { Metadata } from "next";
import { getAllCampaigns } from "@/lib/promotions";
import AdminShell from "@/components/admin/AdminShell";
import PromotionsManager from "@/components/admin/PromotionsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Promotional Banners", robots: { index: false } };

export default async function AdminPromotionsPage() {
  const campaigns = await getAllCampaigns();
  return (
    <AdminShell active="Marketing">
      <h1 className="font-display mb-2 text-2xl font-bold text-foam">Promotional Banners</h1>
      <p className="mb-8 text-sm text-mist">
        Create discount banners, flash sales and announcements — they appear on the
        public site automatically while active.
      </p>
      <PromotionsManager
        initial={campaigns.map((c) => ({
          ...c,
          startAt: c.startAt ? c.startAt.toISOString() : null,
          endAt: c.endAt ? c.endAt.toISOString() : null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        }))}
      />
    </AdminShell>
  );
}
