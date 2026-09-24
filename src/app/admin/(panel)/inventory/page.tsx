import { SectionHeading } from "@/components/ui";
import { adjustStockAction } from "@/app/actions/admin-products";
import { listInventory } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ low?: string }> }) {
  const params = await searchParams;
  const rows = await listInventory(200, params.low === "1");

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Warehouse"
        title="Inventory"
        description="Variant stock is authoritative at checkout. Every manual change writes an inventory_movements audit row."
        action={
          <a href={params.low === "1" ? "/admin/inventory" : "/admin/inventory?low=1"} className="rounded-full border border-[#a8c0d5]/25 px-4 py-2 text-xs text-[#ddf3ff]">
            {params.low === "1" ? "Show all" : "Show low stock"}
          </a>
        }
      />

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No variants yet — add variants on a product to track stock.</p>
        ) : (
          rows.map((row) => (
            <form key={row.variantId ?? row.productId} action={adjustStockAction} className="glass flex flex-wrap items-center gap-3 rounded-3xl p-4 text-sm">
              <input type="hidden" name="variantId" value={row.variantId ?? ""} />
              <div className="min-w-48 flex-1">
                <p className="text-[#f4faff]">{row.productName}</p>
                <p className="text-xs text-[#a8c0d5]">
                  {[row.size, row.color].filter(Boolean).join(" · ")} · SKU {row.sku ?? "—"} · product stock {row.productStock}
                </p>
              </div>
              <span className={`text-xs ${row.stock <= row.threshold ? "text-rose-200" : "text-[#a8c0d5]"}`}>
                {row.stock <= row.threshold ? `Low (≤ ${row.threshold})` : "Healthy"}
              </span>
              <input name="stock" type="number" min={0} defaultValue={row.stock} className="w-24 rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-3 py-2 text-sm" />
              <button type="submit" className="rounded-full border border-[#8ccbff]/40 bg-[#8ccbff]/10 px-4 py-2 text-xs text-[#f4faff]">Update</button>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
