import type { ReactNode } from "react";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth/customer";
import { countUnreadNotifications } from "@/lib/data/content";

const tabs = [
  { href: "/profile", label: "Overview" },
  { href: "/profile/orders", label: "Orders" },
  { href: "/profile/addresses", label: "Addresses" },
  { href: "/profile/wishlist", label: "Wishlist" },
  { href: "/profile/reviews", label: "Reviews" },
  { href: "/profile/notifications", label: "Notifications" },
  { href: "/profile/settings", label: "Settings" },
];

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const customer = await requireCustomer();
  const unread = await countUnreadNotifications(customer.id).catch(() => 0);

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8">
      <header className="hairline-b flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <p className="meta-label">Your account</p>
          <h1 className="display-1 mt-3 text-[#f4faff]">{customer.fullName ?? customer.email}</h1>
          <p className="meta-label-muted mt-2">
            {customer.email} {customer.emailVerified ? "· verified" : "· pending verification"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#a8c0d5]">
          {unread > 0 ? (
            <Link href="/profile/notifications" className="rounded-full border border-[#8ccbff]/40 bg-[#8ccbff]/10 px-3 py-1.5 text-[#ddf3ff]">
              {unread} new notification{unread === 1 ? "" : "s"}
            </Link>
          ) : null}
        </div>
      </header>

      <nav className="no-scrollbar h-tray flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="shrink-0 rounded-xl border border-[#a8c0d5]/20 px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#ddf3ff] transition-all duration-300 hover:border-[#8ccbff]/50 hover:text-[#f4faff]"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
