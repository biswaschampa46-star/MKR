import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Admin — Analytics", robots: { index: false } };

export default function AnalyticsPage() {
  return (
    <AdminShell>
      <AdminPlaceholder
        title="Analytics"
        description="Sales trends, cohorts and revenue reports — the dashboard already shows live sales charts."
        icon={BarChart3}
        actions={[{ href: "/admin/dashboard", label: "Open dashboard" }]}
      />
    </AdminShell>
  );
}
