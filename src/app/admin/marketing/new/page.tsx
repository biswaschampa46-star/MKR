import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import BannerForm from "@/components/admin/BannerForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — New Campaign", robots: { index: false } };

export default function NewPromotionPage() {
  return (
    <AdminShell>
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">New Campaign</h1>
      <BannerForm />
    </AdminShell>
  );
}
