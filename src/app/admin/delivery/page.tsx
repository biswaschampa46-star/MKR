import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { Truck } from "lucide-react";

export const metadata: Metadata = { title: "Admin — Delivery", robots: { index: false } };

export default function DeliveryPage() {
  return (
    <AdminShell>
      <AdminPlaceholder
        title="Delivery"
        description="Track shipments and update delivery stages per order."
        icon={Truck}
        actions={[{ href: "/admin/orders", label: "Manage shipments" }]}
      />
    </AdminShell>
  );
}
