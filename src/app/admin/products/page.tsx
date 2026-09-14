import type { Metadata } from "next";
import { getAdminProducts } from "@/lib/products";
import AdminShell from "@/components/admin/AdminShell";
import ProductsManager from "@/components/admin/ProductsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Products", robots: { index: false } };

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  return (
    <AdminShell active="Products">
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">Products</h1>
      <ProductsManager products={products} />
    </AdminShell>
  );
}
