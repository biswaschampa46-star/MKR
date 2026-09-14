import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { Tags } from "lucide-react";

export const metadata: Metadata = { title: "Admin — Categories", robots: { index: false } };

export default function CategoriesPage() {
  return (
    <AdminShell>
      <AdminPlaceholder
        title="Categories"
        description="Group products into collections and manage navigation."
        icon={Tags}
        actions={[{ href: "/admin/products", label: "Manage products" }]}
      />
    </AdminShell>
  );
}
