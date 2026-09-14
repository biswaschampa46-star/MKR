import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = { title: "Admin — Payments", robots: { index: false } };

export default function PaymentsPage() {
  return (
    <AdminShell>
      <AdminPlaceholder
        title="Payments"
        description="bKash, Nagad and Rocket transaction verification lives with each order."
        icon={CreditCard}
        actions={[{ href: "/admin/orders", label: "Verify payments" }]}
      />
    </AdminShell>
  );
}
