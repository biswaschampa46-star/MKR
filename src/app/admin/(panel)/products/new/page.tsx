import { SectionHeading } from "@/components/ui";
import { ProductForm } from "@/components/admin/product-form";
import { listCategories } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await listCategories(true);
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Create" title="New product" description="Fill the basics, then upload gallery media from the product page after saving." />
      <ProductForm product={null} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
