"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package, CheckCircle2, Clock, Heart, Wallet, User as UserIcon, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import {
  fetchMyOrders, fetchWishlistIds, fetchUnreadCount, fetchMyReviews,
  fetchProfile, fetchAddresses, type CustomerOrder, type CustomerAddress,
  type CustomerReview, type CustomerProfile,
} from "@/lib/customer";
import { bdt, formatDate } from "@/lib/format";
import { EmptyState, Skeleton, StatusBadge } from "@/components/profile/ProfileShell";
import EditProfileModal from "@/components/profile/EditProfileModal";

export default function ProfileOverviewPage() {
  const user = useAuth((s) => s.user);
  const authProfile = useAuth((s) => s.profile);

  const [profile, setProfile] = useState<CustomerProfile | null>(authProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [wishCount, setWishCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [p, o, a, w, n, r] = await Promise.all([
        fetchProfile(user.id),
        fetchMyOrders(user.id),
        fetchAddresses(user.id),
        fetchWishlistIds(user.id),
        fetchUnreadCount(user.id),
        fetchMyReviews(user.id),
      ]);
      setProfile(p);
      setOrders(o);
      setAddresses(a);
      setWishCount(w.size);
      setUnread(n);
      setReviews(r);
    } catch {
      setError("Could not load your account data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const totalOrders = orders.length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const pending = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const totalSpent = orders
    .filter((o) => o.status === "delivered")
    .reduce((n, o) => n + (o.product_payment_status === "paid" ? o.total : o.amount_paid), 0);

  const cards = [
    { label: "Total Orders", value: String(totalOrders), icon: Package, tone: "text-soft" },
    { label: "Completed Orders", value: String(delivered), icon: CheckCircle2, tone: "text-emerald-300" },
    { label: "Pending Orders", value: String(pending), icon: Clock, tone: "text-amber-300" },
    { label: "Wishlist Items", value: String(wishCount), icon: Heart, tone: "text-[#ffb3d1]" },
    { label: "Total Spent", value: bdt(totalSpent), icon: Wallet, tone: "text-ice" },
  ];

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Customer";
  const memberSince = profile?.created_at ? formatDate(profile.created_at) : "";
const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  return (
    <div className="min-w-0">
      {/* header */}
      <section className="card-glass rounded-2xl p-6 sm:p-8" id="information">
        <div className="flex flex-wrap items-center gap-5">
          <div className="media-frame relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
            {profile?.profile_photo ? (
              <Image src={profile.profile_photo} alt={displayName} fill sizes="96px" unoptimized className="object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center bg-deep/80 font-display text-3xl font-bold text-soft">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-xl font-bold text-foam sm:text-2xl">{displayName}</h1>
            <p className="mt-1 truncate text-sm text-mist">{profile?.email || user?.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.7rem] text-mist/80">
              {memberSince && <span>Member since {memberSince}</span>}
              <StatusBadge status={profile?.account_status ?? "active"} />
            </div>
          </div>
          <button type="button" onClick={() => setEditOpen(true)} className="btn btn-line shrink-0 !px-5">
            <UserIcon className="h-3.5 w-3.5" /> Edit Profile
          </button>
        </div>
      </section>

      {/* summary cards */}
      <section aria-label="Account summary" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card-glass rounded-2xl p-5">
            <Icon className={`h-5 w-5 ${tone}`} strokeWidth={1.5} />
            {loading ? (
              <Skeleton className="mt-4 h-7 w-14" />
            ) : (
              <p className="font-display mt-3 text-2xl font-bold text-ice">{value}</p>
            )}
            <p className="label mt-2 !text-[0.58rem] !text-mist/70">{label}</p>
          </div>
        ))}
      </section>
{error && (
        <div className="mt-6 card-glass rounded-2xl p-6 text-center">
          <p className="text-sm text-[#ff9b8a]">{error}</p>
          <button type="button" onClick={load} className="btn btn-line mt-4">Try again</button>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card-glass rounded-2xl p-6 sm:p-8" aria-label="Recent orders">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-foam">Recent Orders</h2>
            <Link href="/profile/orders" className="link-line label !text-[0.6rem] !text-soft hover:!text-ice">View all</Link>
          </div>
          <div className="mt-6 space-y-4">
            {loading ? (
              <><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></>
            ) : orders.length === 0 ? (
              <EmptyState icon={Package} title="No orders yet" subtitle="When you place an order it will appear here." />
            ) : (
              orders.slice(0, 4).map((o) => (
                <Link key={o.id} href={`/profile/orders?open=${o.id}`} className="block rounded-xl border border-line-soft p-4 transition-colors hover:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-[0.78rem] font-bold tracking-[0.1em] text-ice">{o.order_number}</p>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[0.72rem] text-mist">
                    <span>{formatDate(o.created_at)} · {o.items.length} item{o.items.length > 1 ? "s" : ""}</span>
                    <span className="text-foam">{bdt(o.total)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="card-glass rounded-2xl p-6 sm:p-8" aria-label="Account activity">
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-foam">Account Activity</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-mist">Account created</dt><dd className="text-foam">{profile?.created_at ? formatDate(profile.created_at) : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-mist">Last login</dt><dd className="text-foam">{profile?.last_login_at ? formatDate(profile.last_login_at) : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-mist">Recent orders</dt><dd className="text-foam">{totalOrders}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-mist">Recent reviews</dt><dd className="text-foam">{reviews.length}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-mist">Wishlist items</dt><dd className="text-foam">{wishCount}</dd></div>
            <div className="flex justify-between gap-4">
              <dt className="text-mist">Default address</dt>
              <dd className="max-w-[60%] truncate text-right text-foam">
                {defaultAddress ? `${defaultAddress.upazila || defaultAddress.district || defaultAddress.division} · ${defaultAddress.label}` : "Not saved yet"}
              </dd>
            </div>
            <div className="flex justify-between gap-4"><dt className="text-mist">Unread notifications</dt><dd className="text-foam">{unread}</dd></div>
          </dl>
          <Link href="/profile/notifications" className="btn btn-line mt-7 w-full justify-center !px-5">
            Notifications <ArrowRight className="btn-arrow h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} userId={user?.id ?? ""} onSaved={load} />
    </div>
  );
}