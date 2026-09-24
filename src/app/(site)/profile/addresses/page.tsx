import type { Metadata } from "next";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { addresses } from "@/db/schema";
import { Badge, SectionHeading } from "@/components/ui";
import { AddressForm } from "@/components/profile/profile-forms";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/profile";
import { requireCustomer } from "@/lib/auth/customer";
import { BD_DISTRICTS } from "@/lib/bd-districts";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const customer = await requireCustomer("/profile/addresses");
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.customerId, customer.id))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Delivery"
        title="Saved addresses"
        description="One default address is enforced by a database trigger, so checkout always knows where to send your parcel."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          {rows.length === 0 ? (
            <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No saved addresses yet — add one using the form.</p>
          ) : (
            rows.map((address) => (
              <article key={address.id} className="glass space-y-2 rounded-3xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base text-[#f4faff]">
                    {address.label ?? address.fullName} {address.isDefault ? <Badge tone="success" className="ml-2">Default</Badge> : null}
                  </p>
                </div>
                <p className="text-sm text-[#ddf3ff]">{address.fullName} · {address.phone}</p>
                <p className="text-sm text-[#a8c0d5]">
                  {[address.addressLine, address.area, address.district, address.postalCode].filter(Boolean).join(", ")}
                </p>
                {address.notes ? <p className="text-xs text-[#a8c0d5]/80">{address.notes}</p> : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  {!address.isDefault ? (
                    <form action={setDefaultAddressAction}>
                      <input type="hidden" name="id" value={address.id} />
                      <button type="submit" className="rounded-full border border-[#a8c0d5]/25 px-3 py-1.5 text-xs text-[#ddf3ff] transition hover:border-[#8ccbff]">
                        Make default
                      </button>
                    </form>
                  ) : null}
                  <form action={deleteAddressAction}>
                    <input type="hidden" name="id" value={address.id} />
                    <button type="submit" className="rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-500/10">
                      Remove
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="glass h-max rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg text-[#f4faff]">Add an address</h2>
          <AddressForm districts={BD_DISTRICTS} />
        </div>
      </div>
    </div>
  );
}
