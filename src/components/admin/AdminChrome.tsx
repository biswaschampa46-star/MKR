"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeOrderEvents } from "@/lib/realtime-bus";
import { OrderToastStack, useOrderToasts } from "./OrderToasts";
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Users, Boxes, CreditCard, Truck,
  TicketPercent, Star, BarChart3, Megaphone, Bell, Settings, Search, Plus, Menu,
  X, Sun, Moon, LogOut, Store, ChevronDown, PanelLeftClose, PanelLeftOpen,
  FileText, MessageSquare, ArrowRight, Film, Phone, Image as ImageIcon,
} from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/hero-videos", label: "Hero Videos", icon: Film },
  { href: "/admin/about-media", label: "About Media", icon: ImageIcon },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/discounts", label: "Discounts & Coupons", icon: TicketPercent },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/contact-details", label: "Contact Details", icon: Phone },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const QUICK_ACTIONS = [
  { href: "/admin/products/new", label: "Add Product", icon: Package },
  { href: "/admin/orders", label: "Create Order", icon: ShoppingCart },
  { href: "/admin/marketing", label: "Add Subscriber", icon: Megaphone },
  { href: "/admin/discounts", label: "Create Coupon", icon: TicketPercent },
  { href: "/admin/analytics", label: "View Reports", icon: FileText },
];

export type UnreadCounts = { messages: number; reviews: number };

export default function AdminChrome({
  children,
  unread,
  initialPendingOrders = 0,
}: {
  children: React.ReactNode;
  unread: UnreadCounts;
  initialPendingOrders?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [openMenu, setOpenMenu] = useState<"quick" | "bell" | "user" | null>(null);
  const [query, setQuery] = useState("");

  /* ——— realtime order badge + toasts ——— */
  const { toasts, push, dismiss } = useOrderToasts();
  const [pendingOrders, setPendingOrders] = useState<number | null>(initialPendingOrders);
  const knownOrders = useRef(new Set<string>());
  const pathnameRef = useRef(pathname);

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders/count", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { ok: boolean; pending: number };
      if (data.ok) setPendingOrders(data.pending);
    } catch (err) {
      console.error("admin: order count fetch failed", err);
    }
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const off = subscribeOrderEvents((ev) => {
      if (ev.op === "INSERT" && !knownOrders.current.has(ev.id)) {
        /* de-dupe across events & tabs: only toast ids we have not seen */
        knownOrders.current.add(ev.id);
        void (async () => {
          let body = "An order was just placed.";
          try {
            const res = await fetch(`/api/admin/orders/${ev.id}`, { cache: "no-store" });
            if (res.ok) {
              const { order } = (await res.json()) as {
                order: { orderNumber: string; customerName: string; total: number };
              };
              body = `${order.orderNumber} · ${order.customerName} · ৳${order.total.toLocaleString("en-IN")}`;
            }
          } catch {
            /* keep generic body */
          }
          push({
            id: `order-${ev.id}`,
            title: "নতুন অর্ডার এসেছে!",
            body,
            tone: "success" as const,
            href: "/admin/orders",
          });
        })();
      }
      void loadPending();
      /* order views refetch on this window event */
      if (pathnameRef.current.startsWith("/admin/orders") || pathnameRef.current.startsWith("/admin/dashboard")) {
        window.dispatchEvent(new CustomEvent("mkr:orders-changed", { detail: ev }));
      }
    });
    return off;
  }, [loadPending, push]);

  const shellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* persisted preferences */
  useEffect(() => {
    setCollapsed(localStorage.getItem("mkr-admin-collapsed") === "1");
    setDark(localStorage.getItem("mkr-admin-theme") === "dark");
    setHydrated(true);
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("mkr-admin-collapsed", c ? "0" : "1");
      return !c;
    });
  };
  const toggleDark = () => {
    setDark((d) => {
      localStorage.setItem("mkr-admin-theme", d ? "light" : "dark");
      return !d;
    });
  };

  /* close menus on outside click / escape */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu]")) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
      if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* close mobile drawer on navigation */
  useEffect(() => setDrawer(false), [pathname]);

  const active = NAV.find((n) => pathname.startsWith(n.href)) ?? NAV[0];
  const matches = query.trim()
    ? NAV.filter((n) => n.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];
  const unreadTotal = unread.messages + unread.reviews;

  const go = useCallback(
    (href: string) => {
      setQuery("");
      (document.activeElement as HTMLElement)?.blur();
      router.push(href);
    },
    [router],
  );

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const sidebar = (mobile = false) => (
    <div className="flex h-full flex-col">
      {/* logo */}
      <div className={`flex h-16 items-center border-b border-[var(--adm-border)] ${collapsed && !mobile ? "justify-center px-0" : "px-5"}`}>
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--adm-primary)] font-display text-sm font-extrabold tracking-tight text-white">
            M
          </span>
          {(!collapsed || mobile) && (
            <span className="whitespace-nowrap font-display text-sm font-bold tracking-[0.18em] text-[var(--adm-text)]">
              MKR ADMIN
            </span>
          )}
        </Link>
      </div>

      {/* nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label="Admin">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed && !mobile ? label : undefined}
              className={`adm-nav-item ${collapsed && !mobile ? "justify-center px-0" : ""}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
              {(!collapsed || mobile) && <span className="truncate">{label}</span>}
              {label === "Orders" && (pendingOrders ?? 0) > 0 && (
                <span
                  className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-bold text-white ${collapsed && !mobile ? "absolute right-1.5 top-1" : ""}`}
                  style={{ background: "var(--adm-danger)" }}
                >
                  {pendingOrders}
                </span>
              )}
              {label === "Orders" && (pendingOrders ?? 0) > 0 && (
                <span
                  className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--adm-danger)] px-1.5 text-[0.65rem] font-bold text-white ${collapsed && !mobile ? "absolute right-1.5 top-1/2 -translate-y-1/2" : ""}`}
                >
                  {pendingOrders}
                </span>
              )}
              {(!collapsed || mobile) && label === "Notifications" && unreadTotal > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--adm-danger)] px-1.5 text-[0.65rem] font-bold text-white">
                  {unreadTotal}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* footer */}
      <div className={`space-y-1 border-t border-[var(--adm-border)] p-3 ${collapsed && !mobile ? "px-2" : ""}`}>
        <Link
          href="/"
          title={collapsed && !mobile ? "View store" : undefined}
          className={`adm-nav-item ${collapsed && !mobile ? "justify-center px-0" : ""}`}
        >
          <Store size={18} strokeWidth={1.8} className="shrink-0" />
          {(!collapsed || mobile) && <span>View store</span>}
        </Link>
        <button
          type="button"
          onClick={logout}
          title={collapsed && !mobile ? "Sign out" : undefined}
          className={`adm-nav-item w-full ${collapsed && !mobile ? "justify-center px-0" : ""}`}
        >
          <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
          {(!collapsed || mobile) && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={shellRef}
      className={`admin-root flex min-h-screen font-body ${dark ? "admin-dark" : ""}`}
      data-theme={dark ? "dark" : "light"}
    >
      {/* desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-[var(--adm-border)] bg-[var(--adm-surface)] transition-[width] duration-300 md:block ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {sidebar()}
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className="absolute inset-0 bg-[#0a1a2c]/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-[var(--adm-surface)] shadow-2xl">{sidebar(true)}</div>
        </div>
      )}

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-40 border-b border-[var(--adm-border)] bg-[var(--adm-surface)]/90 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="adm-btn adm-btn-ghost !px-2.5 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="adm-btn adm-btn-ghost !hidden !px-2.5 md:!inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            {/* breadcrumb */}
            <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm lg:flex">
              <span className="text-[var(--adm-sub)]">Admin</span>
              <span className="text-[var(--adm-sub)]">/</span>
              <span className="font-semibold text-[var(--adm-text)]">{active.label}</span>
            </nav>

            {/* global search */}
            <div className="relative ml-auto w-full max-w-xs" data-menu>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--adm-sub)]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && matches[0]) go(matches[0].href);
                }}
                placeholder="Search admin…"
                aria-label="Search admin"
                className="adm-input !py-2 pl-9 pr-10"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[var(--adm-border)] px-1.5 py-0.5 text-[0.65rem] font-medium text-[var(--adm-sub)]">
                /
              </kbd>
              {query.trim() && (
                <div className="adm-card absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden p-1.5">
                  {matches.length === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-[var(--adm-sub)]">No matches for “{query}”</p>
                  ) : (
                    matches.map((m) => (
                      <button
                        key={m.href}
                        type="button"
                        onClick={() => go(m.href)}
                        className="adm-nav-item w-full"
                      >
                        <m.icon size={16} />
                        <span>{m.label}</span>
                        <ArrowRight size={14} className="ml-auto opacity-50" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* quick actions */}
            <div className="relative hidden sm:block" data-menu>
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === "quick" ? null : "quick")}
                className="adm-btn adm-btn-primary"
                aria-expanded={openMenu === "quick"}
              >
                <Plus size={16} />
                <span className="hidden md:inline">Quick actions</span>
              </button>
              {openMenu === "quick" && (
                <div className="adm-card absolute right-0 top-full z-50 mt-2 w-56 p-1.5">
                  {QUICK_ACTIONS.map((a) => (
                    <Link key={a.label} href={a.href} onClick={() => setOpenMenu(null)} className="adm-nav-item w-full">
                      <a.icon size={16} />
                      <span>{a.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* store status */}
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--adm-border)] px-3 py-1.5 text-xs font-medium text-[var(--adm-sub)] xl:inline-flex">
              <span className="h-2 w-2 rounded-full bg-[var(--adm-success)]" />
              Store live
            </span>

            {/* notifications */}
            <div className="relative" data-menu>
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === "bell" ? null : "bell")}
                className="adm-btn adm-btn-ghost relative !px-2.5"
                aria-label={`Notifications${unreadTotal ? `, ${unreadTotal} unread` : ""}`}
                aria-expanded={openMenu === "bell"}
              >
                <Bell size={18} />
                {unreadTotal > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--adm-danger)] px-1 text-[0.6rem] font-bold text-white">
                    {unreadTotal}
                  </span>
                )}
              </button>
              {openMenu === "bell" && (
                <div className="adm-card absolute right-0 top-full z-50 mt-2 w-72 p-1.5">
                  {unreadTotal === 0 ? (
                    <p className="px-3 py-3 text-sm text-[var(--adm-sub)]">You’re all caught up.</p>
                  ) : (
                    <>
                      {unread.messages > 0 && (
                        <Link href="/admin/notifications" onClick={() => setOpenMenu(null)} className="adm-nav-item">
                          <MessageSquare size={16} />
                          <span className="flex-1">
                            {unread.messages} new customer {unread.messages === 1 ? "message" : "messages"}
                          </span>
                        </Link>
                      )}
                      {unread.reviews > 0 && (
                        <Link href="/admin/reviews" onClick={() => setOpenMenu(null)} className="adm-nav-item">
                          <Star size={16} />
                          <span className="flex-1">{unread.reviews} hidden {unread.reviews === 1 ? "review" : "reviews"}</span>
                        </Link>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* theme toggle */}
            <button
              type="button"
              onClick={toggleDark}
              className="adm-btn adm-btn-ghost !px-2.5"
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* user */}
            <div className="relative" data-menu>
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}
                className="flex items-center gap-2 rounded-full border border-[var(--adm-border)] py-1 pl-1 pr-1 transition-colors hover:bg-[var(--adm-hover)] sm:pr-2.5"
                aria-expanded={openMenu === "user"}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--adm-primary)] text-xs font-bold text-white">
                  AD
                </span>
                <span className="hidden text-sm font-semibold text-[var(--adm-text)] sm:inline">Admin</span>
                <ChevronDown size={14} className="hidden text-[var(--adm-sub)] sm:inline" />
              </button>
              {openMenu === "user" && (
                <div className="adm-card absolute right-0 top-full z-50 mt-2 w-52 p-1.5">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-[var(--adm-text)]">Admin</p>
                    <p className="text-xs text-[var(--adm-sub)]">Store administrator</p>
                  </div>
                  <div className="my-1 h-px bg-[var(--adm-border)]" />
                  <Link href="/" className="adm-nav-item">
                    <Store size={16} />
                    <span>View store</span>
                  </Link>
                  <button type="button" onClick={logout} className="adm-nav-item w-full">
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* page */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>

        <footer className="border-t border-[var(--adm-border)] px-6 py-4 text-xs text-[var(--adm-sub)]">
          MKR Admin · {new Date().getFullYear()} — {active.label}
        </footer>

        <OrderToastStack toasts={toasts} onDismiss={dismiss} />
      </div>
    </div>
  );
}
