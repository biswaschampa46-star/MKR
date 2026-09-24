import { Badge, SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { setCustomerStatusAction } from "@/app/actions/admin-community";
import { listCustomersForAdmin } from "@/lib/data/commerce";
import { formatDate, formatTaka } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const customers = await listCustomersForAdmin(params.q);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="CRM" title="Customers" description="Customer profiles live in PostgreSQL; auth sessions are httpOnly cookies (Supabase Auth when configured)." />
      <form className="glass flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search email, name, phone" className="min-w-56 flex-1 rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-2.5 text-sm" />
        <button type="submit" className="rounded-full border border-[#a8c0d5]/25 px-4 py-2 text-xs text-[#ddf3ff]">Search</button>
      </form>
      <div className="space-y-3">
        {customers.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No customers yet.</p>
        ) : (
          customers.map((customer) => (
            <article key={customer.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4 text-sm">
              <div>
                <p className="text-[#f4faff]">{customer.fullName ?? "Unnamed customer"}</p>
                <p className="text-xs text-[#a8c0d5]">{customer.email} · {customer.phone ?? "no phone"} · joined {formatDate(customer.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="default">{customer.provider}</Badge>
                <Badge tone={customer.status === "active" ? "success" : "danger"}>{customer.status}</Badge>
                <span className="text-xs text-[#a8c0d5]">{customer.orderCount} orders · {formatTaka(customer.spend)}</span>
                <form action={setCustomerStatusAction}>
                  <input type="hidden" name="id" value={customer.id} />
                  <input type="hidden" name="status" value={customer.status === "active" ? "blocked" : "active"} />
                  <SubmitButton pendingLabel="Updating…" className="px-3 py-1.5 text-xs">{customer.status === "active" ? "Block" : "Reactivate"}</SubmitButton>
                </form>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
