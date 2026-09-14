import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — New Product", robots: { index: false } };

export default function NewProductPage() {
  return (
    <AdminShell active="Products">
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">New product</h1>
      <ProductForm />
    </AdminShell>
  );
}
