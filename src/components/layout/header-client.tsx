"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, ShoppingBag, User, X, Heart, Sparkles } from "lucide-react";
import { Logo, Button } from "@/components/ui";
import { useCart } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { AssistantPanel } from "@/components/assistant-panel";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?sort=newest", label: "New in" },
  { href: "/track", label: "Track order" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

export function HeaderClient({
  categories,
  customer,
  announcement,
  announcementHref,
}: {
  categories: { slug: string; name: string; count: number }[];
  customer: { fullName: string | null; email: string; avatarUrl: string | null } | null;
  announcement: string | null;
  announcementHref?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { count, openDrawer, isAuthenticated } = useCart();
  const headerRef = useRef<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Close overlays when the route changes (state adjusted during render,
  // the documented React alternative to an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMobileOpen(false);
    setAssistantOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Navbar scroll state: compact + elevated after the first scroll pixels.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ESC closes the mobile menu / assistant panel (dropdown close-behaviour audit).
  useEffect(() => {
    if (!mobileOpen && !assistantOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAssistantOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, assistantOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : "/shop");
  };

  return (
    <header ref={headerRef} className="site-header sticky top-0 z-50">
      {announcement ? (
        <Link
          href={announcementHref || "/shop"}
          className="block bg-gradient-to-r from-[#0e2f4a] via-[#4da8ff]/25 to-[#0e2f4a] px-4 py-2 text-center text-[11px] uppercase tracking-[0.22em] text-[#ddf3ff]"
        >
          {announcement}
        </Link>
      ) : null}

      <div className="mx-auto flex w-full max-w-[88rem] items-center gap-3 px-[var(--gutter)] py-4 sm:gap-5">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="rounded-full p-2 text-[#ddf3ff] transition hover:bg-[#ddf3ff]/10 lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="shrink-0" aria-label="MKR home">
          <Logo showTagline className="hidden sm:flex" />
          <Logo className="sm:hidden" />
        </Link>

        <nav className="hidden flex-1 items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-[11px] font-medium uppercase tracking-[0.22em] text-[#ddf3ff]/80 transition-colors duration-300 hover:text-[#f4faff] after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-[#8ccbff] after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="hidden flex-1 md:block lg:max-w-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8c0d5]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, SKU, fabric…"
              aria-label="Search products"
              className="w-full rounded-full border border-[#a8c0d5]/20 bg-[#071522]/60 py-2.5 pl-10 pr-4 text-sm text-[#f4faff] backdrop-blur transition-all duration-300 placeholder:text-[#a8c0d5]/55 focus:border-[#8ccbff]/60 focus:bg-[#071522] focus:outline-none"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/shop?assistant=1"
            onClick={(event) => {
              event.preventDefault();
              setAssistantOpen(true);
            }}
            aria-label="MKR assistant"
            className="hidden rounded-full p-2 text-[#ddf3ff] transition hover:bg-[#ddf3ff]/10 sm:block"
          >
            <Sparkles className="h-5 w-5" />
          </Link>
          <Link
            href={isAuthenticated ? "/profile/wishlist" : "/login?next=/profile/wishlist"}
            aria-label="Wishlist"
            className="rounded-full p-2 text-[#ddf3ff] transition hover:bg-[#ddf3ff]/10"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href={customer ? "/profile" : "/login"}
            aria-label="Account"
            className="flex items-center gap-2 rounded-full p-1.5 pr-3 text-[#ddf3ff] transition hover:bg-[#ddf3ff]/10"
          >
            {customer?.avatarUrl ? (
              <Image
                src={customer.avatarUrl}
                alt={customer.fullName ?? "Profile"}
                width={26}
                height={26}
                className="h-6.5 w-6.5 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
            <span className="hidden text-xs lg:inline">{customer ? (customer.fullName ?? "Account").split(" ")[0] : "Sign in"}</span>
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            aria-label="Open cart"
            className="relative rounded-full p-2 text-[#ddf3ff] transition hover:bg-[#ddf3ff]/10"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 ? (
              <span
                key={count}
                className="animate-badge-pop absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#4da8ff] to-[#8ccbff] px-1 text-[10px] font-semibold text-[#071a2b]"
              >
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-[#071a2b]/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="mkr-panel absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col gap-6 overflow-y-auto border-r border-[#a8c0d5]/15 bg-[#071522] px-6 py-6">
            <div className="flex items-center justify-between">
              <Logo showTagline />
              <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="rounded-full p-2 text-[#ddf3ff]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitSearch} className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8c0d5]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search MKR"
                className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 py-3 pl-10 pr-4 text-sm"
              />
            </form>

            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl px-3 py-3 text-sm uppercase tracking-[0.18em] text-[#f4faff] transition hover:bg-[#ddf3ff]/10">
                  {item.label}
                </Link>
              ))}
            </nav>

            {categories.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#8ccbff]">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/shop?category=${category.slug}`}
                      className="rounded-full border border-[#a8c0d5]/25 px-3 py-1.5 text-xs text-[#ddf3ff]"
                    >
                      {category.name} · {category.count}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-auto space-y-3">
              <Button type="button" variant="outline" className="w-full" onClick={() => setAssistantOpen(true)}>
                <Sparkles className="h-4 w-4" /> Ask MKR assistant
              </Button>
              <Link href={customer ? "/profile" : "/login"} className="block">
                <Button variant="primary" className="w-full">
                  {customer ? "My account" : "Sign in / Create account"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <CartDrawer />
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </header>
  );
}
