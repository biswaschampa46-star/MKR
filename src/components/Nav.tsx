"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Menu, X, CircleUserRound, Phone, Mail } from "lucide-react";
import Image from "next/image";
import { useUI, useCartTotals, useHydrated } from "@/lib/store";
import { useAuth, useAuthSync } from "@/lib/auth-store";
import { telHref, type PublicContact } from "@/lib/contact-links";
import { SOCIAL_ICONS, WhatsappIcon } from "./ContactIcons";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const MENU_LINKS = [
  { href: "/shop", label: "Shop All" },
  { href: "/shop?view=new", label: "New Arrivals" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
  { href: "/track", label: "Track Order" },
];

export default function Nav({ storeName, siteTagline, contact }: { storeName: string; siteTagline: string; contact?: PublicContact | null }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { count } = useCartTotals();
  const { menuOpen, setMenuOpen, setCartOpen, setSearchOpen, setAuthOpen } = useUI();
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  useAuthSync();
  const hydrated = useHydrated();
  const showAccount = hydrated && ready && !!user;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* lock body scroll while the overlay menu is open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [pathname, setMenuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setMenuOpen]);

  return (
    <>
      <header className={`nav-shell fixed inset-x-0 top-0 z-50 ${scrolled ? "nav-scrolled" : ""}`}>
        <nav
          aria-label="Primary"
          className="mx-auto flex h-[4.75rem] max-w-[1400px] items-center justify-between px-6 md:px-10"
        >
          <Link href="/" aria-label={`${storeName} — home`} className="flex min-w-0 flex-1 items-center gap-2.5 md:flex-none md:gap-3">
            <Image
              src="/images/mkr-logo.jpg"
              alt={`${storeName} logo`}
              width={627}
              height={627}
              priority
              className="h-9 w-9 shrink-0 rounded-lg object-cover shadow-[0_4px_16px_-6px_rgba(0,0,0,0.6)] sm:h-11 sm:w-11"
            />
            <span className="font-rose min-w-0 flex-1 truncate text-base leading-none text-foam sm:text-xl">
              {storeName.toUpperCase()}—Casual Threads & Style
            </span>
          </Link>

          {/* desktop links */}
          <div className="hidden items-center gap-9 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className="link-line label !text-mist transition-colors duration-300 hover:!text-ice"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="grid h-10 w-10 place-items-center rounded-full text-mist transition-colors duration-300 hover:bg-white/5 hover:text-ice"
            >
              <Search className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.5} />
            </button>

            {showAccount && (
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href="/profile"
                  aria-label="My account"
                  title={user!.email ?? "Account"}
                  className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[0.72rem] font-semibold tracking-[0.04em] text-soft transition-colors duration-300 hover:bg-white/5 hover:text-ice"
                >
                  <CircleUserRound className="h-4 w-4" strokeWidth={1.5} />
                  <span className="max-w-[9rem] truncate">{user!.email ?? "Account"}</span>
                </Link>
              </div>
            )}

            {/* mobile: account icon */}
            {showAccount && (
              <Link
                href="/profile"
                aria-label="My account"
                className="grid h-10 w-10 place-items-center rounded-full text-mist transition-colors duration-300 hover:bg-white/5 hover:text-ice md:hidden"
              >
                <CircleUserRound className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.5} />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
              className="relative grid h-10 w-10 place-items-center rounded-full text-mist transition-colors duration-300 hover:bg-white/5 hover:text-ice"
            >
              <ShoppingBag className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.5} />
              {count > 0 && (
                <span
                  key={count}
                  className="badge-pop absolute -right-0.5 -top-0.5 grid h-[1.05rem] min-w-[1.05rem] place-items-center rounded-full bg-ice px-1 text-[0.6rem] font-bold text-abyss"
                >
                  {count}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="grid h-10 w-10 place-items-center rounded-full text-mist transition-colors duration-300 hover:bg-white/5 hover:text-ice md:hidden"
            >
              <Menu className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </header>

      {/* ——— mobile editorial overlay menu ——— */}
      <div
        className={`fixed inset-0 z-[60] md:hidden ${menuOpen ? "menu-open" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <div
          className={`scrim absolute inset-0 bg-[rgba(5,16,27,0.6)] backdrop-blur-sm ${menuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`drawer absolute inset-0 flex flex-col bg-[rgba(7,26,43,0.92)] backdrop-blur-2xl ${
            menuOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex h-[4.75rem] min-w-0 items-center justify-between gap-3 px-6">
            <Link href="/" aria-label={`${storeName} — home`} className="flex min-w-0 flex-1 items-center gap-2.5">
              <Image
                src="/images/mkr-logo.jpg"
                alt={`${storeName} logo`}
                width={627}
                height={627}
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
              <span className="font-rose min-w-0 flex-1 truncate text-base leading-none text-foam">
                {storeName.toUpperCase()}—Casual Threads & Style
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center rounded-full text-mist hover:text-ice"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center gap-2 px-8">
            {MENU_LINKS.map((l, i) => (
              <div key={l.href} className="menu-item" style={{ "--d": `${120 + i * 70}ms` } as CSSProperties}>
                <Link
                  href={l.href}
                  className="font-display block py-2 text-[2rem] font-bold uppercase leading-tight tracking-tight text-foam/90 transition-colors duration-300 hover:text-ice"
                >
                  {l.label}
                </Link>
              </div>
            ))}
          </nav>

          <div className="menu-item px-8 pb-10" style={{ "--d": "640ms" } as CSSProperties}>
            <div className="hairline-full mb-6" />
            <p className="label !text-mist/60">bKash · Nagad · Rocket</p>
            <p className="mt-3 text-sm text-mist/70">{siteTagline}</p>
            {/* admin-managed contact shortcuts — only enabled, non-empty channels */}
            {contact && (contact.phone || contact.whatsappHref || contact.email || contact.socials.length > 0) && (
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                {contact.phone && (
                  <a
                    href={telHref(contact.phone)}
                    aria-label={`Call ${storeName} at ${contact.phone}`}
                    className="grid h-10 w-10 place-items-center rounded-full border border-line-soft text-mist transition-all duration-300 hover:scale-110 hover:text-ice"
                  >
                    <Phone className="h-4 w-4" strokeWidth={1.8} />
                  </a>
                )}
                {contact.whatsappHref && (
                  <a
                    href={contact.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Chat with ${storeName} on WhatsApp`}
                    className="grid h-10 w-10 place-items-center rounded-full border border-line-soft text-mist transition-all duration-300 hover:scale-110 hover:text-ice"
                  >
                    <WhatsappIcon size={16} />
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    aria-label={`Email ${storeName} at ${contact.email}`}
                    className="grid h-10 w-10 place-items-center rounded-full border border-line-soft text-mist transition-all duration-300 hover:scale-110 hover:text-ice"
                  >
                    <Mail className="h-4 w-4" strokeWidth={1.8} />
                  </a>
                )}
                {contact.socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.key];
                  return (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${storeName} on ${s.label}`}
                      title={s.label}
                      className="grid h-10 w-10 place-items-center rounded-full border border-line-soft text-mist transition-all duration-300 hover:scale-110 hover:text-ice"
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
