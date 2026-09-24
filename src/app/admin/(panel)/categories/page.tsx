import { Badge, SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { CategoryForm } from "@/components/admin/settings-forms";
import { deleteCategory } from "@/lib/data/catalog";
import { listCategories } from "@/lib/data/catalog";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listCategories(true);

  async function removeCategory(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) await deleteCategory(id);
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
  }

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Taxonomy" title="Categories" description="Storefront navigation and product grouping read directly from this table." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          {categories.length === 0 ? (
            <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No categories yet.</p>
          ) : (
            categories.map((category) => (
              <article key={category.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4">
                <div>
                  <p className="font-display text-base text-[#f4faff]">{category.name}</p>
                  <p className="text-xs text-[#a8c0d5]">/{category.slug} · {category.productCount} products</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={category.isActive ? "success" : "warn"}>{category.isActive ? "active" : "hidden"}</Badge>
                  <form action={removeCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <SubmitButton pendingLabel="Deleting…" variant="danger" className="px-3 py-1.5 text-xs">Delete</SubmitButton>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
        <div className="glass h-max rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg text-[#f4faff]">New category</h2>
          <CategoryForm />
        </div>
      </div>
    </div>
  );
}
