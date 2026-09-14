import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { Megaphone } from "lucide-react";

export const metadata: Metadata = { title: "Admin — Marketing", robots: { index: false } };

export default function MarketingPage() {
  return (
    <AdminShell>
      <AdminPlaceholder
        title="Marketing"
        description="Campaigns and customer outreach — your newsletter subscribers are already collected."
        icon={Megaphone}
        actions={[{ href: "/admin/subscribers", label: "View subscribers" }]}
      />
    </AdminShell>
  );
}
