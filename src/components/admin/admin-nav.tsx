"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui";

const groups: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Overview",
    links: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/inventory", label: "Inventory" },
      { href: "/admin/discounts", label: "Discounts" },
    ],
  },
  {
    title: "Sales",
    links: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/admin/hero-videos", label: "Hero videos" },
      { href: "/admin/about-media", label: "About media" },
      { href: "/admin/peek-assets", label: "Peek images" },
      { href: "/admin/messages", label: "Messages" },
      { href: "/admin/subscribers", label: "Subscribers" },
      { href: "/admin/notifications", label: "Notifications" },
    ],
  },
  {
    title: "Settings",
    links: [
      { href: "/admin/delivery", label: "Delivery" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/contact-details", label: "Contact details" },
      { href: "/admin/marketing", label: "Marketing" },
      { href: "/admin/settings", label: "Platform & FAQ" },
    ],
  },
];

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ESC closes the mobile admin drawer (dropdown close-behaviour audit).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const content = (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.28em] text-[#8ccbff]">{group.title}</p>
          <ul className="space-y-1">
            {group.links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-2xl px-3 py-2 text-sm transition ${
                      active ? "bg-[#8ccbff]/15 text-[#f4faff]" : "text-[#a8c0d5] hover:bg-[#ddf3ff]/8 hover:text-[#f4faff]"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {email ? <p className="px-3 text-[11px] text-[#a8c0d5]/70">Signed in as {email}</p> : null}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex items-center gap-2 rounded-full border border-[#a8c0d5]/25 px-3 py-2 text-xs text-[#ddf3ff]"
        >
          <Menu className="h-4 w-4" /> Admin menu
        </button>
        <Logo />
      </div>

      {open ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-[#071a2b]/80" onClick={() => setOpen(false)} />
          <div className="mkr-panel absolute inset-y-0 left-0 w-[84%] max-w-xs overflow-y-auto border-r border-[#a8c0d5]/15 bg-[#0b263d] px-3 py-6">
            <div className="mb-6 flex items-center justify-between px-3">
              <Logo showTagline />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full p-2 text-[#ddf3ff]">
                <X className="h-5 w-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      ) : null}

      <div className="hidden lg:sticky lg:top-6 lg:block lg:h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:rounded-3xl lg:border lg:border-[#a8c0d5]/12 lg:bg-[#0b263d]/50 lg:px-3 lg:py-6">
        {content}
      </div>
    </>
  );
}
