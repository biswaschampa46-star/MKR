"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, User as UserIcon, Package, MapPin, Heart,
  Star, Bell, Settings, LogOut, Menu, X, Loader2,
} from "lucide-react";
import { useAuth, useAuthSync, signOutUser } from "@/lib/auth-store";
import { useUI, useHydrated } from "@/lib/store";

const NAV = [
  { href: "/profile", label: "Overview", icon: LayoutDashboard },
  { href: "/profile/orders", label: "My Orders", icon: Package },
  { href: "/profile#information", label: "My Profile", icon: UserIcon },
  { href: "/profile/addresses", label: "Addresses", icon: MapPin },
  { href: "/profile/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile/reviews", label: "Reviews", icon: Star },
  { href: "/profile/notifications", label: "Notifications", icon: Bell },
  { href: "/profile/settings", label: "Account Settings", icon: Settings },
];

/* ───────────────────────── shared UI atoms ───────────────────────── */

export function EmptyState({ icon: Icon, title, subtitle, action }: {
  icon: typeof Package; title: string; subtitle?: string; action?: ReactNode;
}) {
  return (
    <div className="card-glass flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-line bg-deep/60">
        <Icon className="h-6 w-6 text-soft" strokeWidth={1.25} />
      </span>
      <div>
        <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-foam">{title}</p>
        {subtitle && <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mist">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-soft/10 ${className}`} />;
}

export function CardSkeletonRow() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card-glass rounded-2xl p-8 text-center">
      <p className="text-sm text-[#ff9b8a]">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn btn-line mt-5">Try again</button>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "delivered" ? "text-emerald-300 border-emerald-300/30 bg-emerald-300/10"
    : status === "cancelled" ? "text-[#ff9b8a] border-[#ff9b8a]/30 bg-[#ff9b8a]/10"
    : status === "shipped" ? "text-sky-300 border-sky-300/30 bg-sky-300/10"
    : status === "pending_payment" ? "text-amber-300 border-amber-300/30 bg-amber-300/10"
    : "text-soft border-soft/30 bg-soft/10";
  const label =
    status === "pending_payment" ? "Pending Payment"
    : status === "payment_verified" ? "Payment Verified"
    : status === "active" ? "Active"
    : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${tone}`}>
      {label}
    </span>
  );
}

export function Modal({ open, onClose, children, wide = false }: {
  open: boolean; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[rgba(5,16,27,0.7)] backdrop-blur-sm" onClick={onClose} />
      <div className={`auth-card mr-0 w-full max-h-[92dvh] overflow-y-auto ${wide ? "sm:max-w-[42rem]" : "sm:max-w-[28rem]"}`} style={{ animation: "auth-pop 0.3s var(--ease-silk) both" }}>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-mist hover:text-ice">
          <X className="h-4.5 w-4.5" strokeWidth={1.5} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string;
  busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel}>
      <p className="label !tracking-[0.2em]">Please confirm</p>
      <h3 className="display-3 mt-3 text-foam">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-mist">{message}</p>
      <div className="mt-7 flex gap-3">
        <button type="button" onClick={onCancel} className="btn btn-line flex-1">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="btn btn-solid flex-1">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Flash({ kind, text }: { kind: "ok" | "error"; text: string }) {
  if (!text) return null;
  return (
    <p role="status" className={`mt-4 rounded-xl border p-3.5 text-xs leading-relaxed ${
      kind === "ok" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-[#ff9b8a]/30 bg-[#ff9b8a]/10 text-[#ffb3a6]"
    }`}>
      {text}
    </p>
  );
}
/* ───────────────────────── shell ───────────────────────── */

function SignInGate() {
  const setAuthOpen = useUI((s) => s.setAuthOpen);
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-7 px-6 pb-32 pt-48 text-center md:px-10">
      <UserIcon className="h-9 w-9 text-mist/40" strokeWidth={1} />
      <div>
        <p className="font-display text-xl font-bold uppercase tracking-[0.14em] text-foam">Sign in to view your account</p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-mist">
          Your profile, orders, addresses and wishlist are private — sign in with Google or email to continue.
        </p>
      </div>
      <button type="button" onClick={() => setAuthOpen(true)} className="btn btn-solid">Sign in</button>
    </div>
  );
}

export function ProfileHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <p className="label">My Account</p>
      <h1 className="display-2 mt-4 text-foam">{title}</h1>
      {subtitle && <p className="mt-4 max-w-xl text-sm leading-relaxed text-mist">{subtitle}</p>}
    </header>
  );
}

export default function ProfileShell({ children }: { children: ReactNode }) {
  useAuthSync();
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const ready = useAuth((s) => s.ready);
  const hydrated = useHydrated();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [busySignOut, setBusySignOut] = useState(false);

  const authed = hydrated && ready && !!user;

  useEffect(() => setMobileNav(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileNav ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNav]);

  const doSignOut = async () => {
    setBusySignOut(true);
    await signOutUser();
    setBusySignOut(false);
    window.location.href = "/";
  };

  if (!authed) return <SignInGate />;

  const name = profile?.full_name?.trim() || user!.email?.split("@")[0] || "Customer";
  const photo = profile?.profile_photo;

  const avatar = (
    <div className="media-frame relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
      {photo ? (
        <Image src={photo} alt={name} fill sizes="64px" unoptimized className="object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-deep/80 font-display text-xl font-bold text-soft">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  const sidebar = (
    <nav aria-label="Account" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const target = href.split("#")[0];
        const active = !href.includes("#") && pathname === target;
        return (
          <Link key={label} href={href} onClick={() => setMobileNav(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${active ? "bg-soft/15 text-ice" : "text-mist hover:bg-white/5 hover:text-ice"}`}>
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={doSignOut} disabled={busySignOut}
        className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-mist transition-colors duration-300 hover:bg-[#ff9b8a]/10 hover:text-[#ffb3a6]">
        {busySignOut ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
        Sign out
      </button>
    </nav>
  );
return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-28 md:px-10 md:pt-40">
      {/* mobile account bar */}
      <div className="card-glass mb-6 flex items-center justify-between gap-4 rounded-2xl p-4 md:hidden">
        <button type="button" onClick={() => setMobileNav(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {avatar}
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-bold text-foam">{name}</span>
            <span className="block truncate text-[0.7rem] text-mist">My account · tap for menu</span>
          </span>
        </button>
        <button type="button" onClick={() => setMobileNav(true)} aria-label="Open account menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-mist hover:text-ice">
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* desktop sidebar */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="card-glass sticky top-28 rounded-2xl p-5">
            <div className="mb-5 flex items-center gap-3 border-b border-line-soft pb-5">
              {avatar}
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-foam">{name}</p>
                <p className="truncate text-[0.7rem] text-mist">{user!.email}</p>
              </div>
            </div>
            {sidebar}
          </div>
        </aside>

        {/* mobile drawer */}
        <div className={`fixed inset-0 z-[65] lg:hidden ${mobileNav ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!mobileNav}>
          <div className={`absolute inset-0 bg-[rgba(5,16,27,0.6)] backdrop-blur-sm transition-opacity duration-300 ${mobileNav ? "opacity-100" : "opacity-0"}`} onClick={() => setMobileNav(false)} />
          <div className={`absolute inset-y-0 left-0 flex w-[19rem] max-w-[85vw] flex-col overflow-y-auto bg-[rgba(7,26,43,0.96)] p-6 backdrop-blur-2xl transition-transform duration-300 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {avatar}
                <p className="truncate font-display text-sm font-bold text-foam">{name}</p>
              </div>
              <button type="button" onClick={() => setMobileNav(false)} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-full text-mist hover:text-ice">
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>

        <main className="min-w-0 lg:col-span-9">{children}</main>
      </div>
    </div>
  );
}