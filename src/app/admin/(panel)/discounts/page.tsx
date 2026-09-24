import { Badge, SectionHeading } from "@/components/ui";
import { CouponForm } from "@/components/admin/settings-forms";
import { deleteCouponAction } from "@/app/actions/admin-community";
import { SubmitButton } from "@/components/ui/submit-button";
import { listCoupons, listRedemptions } from "@/lib/data/commerce";
import { formatDate, formatTaka } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const [coupons, redemptions] = await Promise.all([listCoupons(), listRedemptions(50)]);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Promotions"
        title="Coupons"
        description="Coupon rules are enforced inside the place_order RPC — usage limits, per-user limits and expiry are all server-side."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {coupons.length === 0 ? (
            <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No coupons yet.</p>
          ) : (
            coupons.map((coupon) => (
              <article key={coupon.id} className="glass space-y-2 rounded-3xl p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-lg text-[#f4faff]">{coupon.code}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={coupon.isActive ? "success" : "warn"}>{coupon.isActive ? "active" : "paused"}</Badge>
                    <span className="text-[#8ccbff]">
                      {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatTaka(coupon.discountValue)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#a8c0d5]">
                  min {formatTaka(coupon.minOrderAmount)} · used {coupon.usedCount}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""} · per user {coupon.perUserLimit}
                  {coupon.expiresAt ? ` · expires ${formatDate(coupon.expiresAt)}` : ""}
                </p>
                {coupon.description ? <p className="text-xs text-[#a8c0d5]">{coupon.description}</p> : null}
                <form action={deleteCouponAction}>
                  <input type="hidden" name="id" value={coupon.id} />
                  <SubmitButton pendingLabel="Deleting…" variant="danger" className="px-3 py-1.5 text-xs">Delete</SubmitButton>
                </form>
              </article>
            ))
          )}
        </div>
        <div className="glass h-max rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg text-[#f4faff]">Create coupon</h2>
          <CouponForm />
        </div>
      </div>

      <section className="glass space-y-3 rounded-3xl p-6">
        <h2 className="font-display text-lg text-[#f4faff]">Redemption history</h2>
        {redemptions.length === 0 ? (
          <p className="text-sm text-[#a8c0d5]">No redemptions recorded yet.</p>
        ) : (
          redemptions.map((redemption) => (
            <div key={redemption.id} className="flex flex-wrap justify-between gap-2 text-sm text-[#ddf3ff]">
              <span>{redemption.code} · {redemption.email ?? "guest"}</span>
              <span className="text-[#a8c0d5]">−{formatTaka(redemption.amount)} · {formatDate(redemption.createdAt)}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
