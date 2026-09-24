import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn, formatTaka } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" && "px-3.5 py-2 text-xs",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-sm tracking-wide",
        variant === "primary" &&
          "bg-gradient-to-r from-[#4da8ff] to-[#8ccbff] text-[#071a2b] shadow-[0_18px_40px_-22px_rgba(77,168,255,0.9)] hover:-translate-y-0.5 hover:brightness-110",
        variant === "outline" && "border border-[#a8c0d5]/35 text-[#f4faff] hover:-translate-y-0.5 hover:border-[#8ccbff] hover:bg-[#8ccbff]/10",
        variant === "ghost" && "text-[#ddf3ff] hover:bg-[#ddf3ff]/10",
        variant === "danger" && "border border-rose-400/40 text-rose-200 hover:bg-rose-500/15",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" | "lg" }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 active:scale-[0.97]",
        size === "sm" && "px-3.5 py-2 text-xs",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-sm tracking-wide",
        variant === "primary" &&
          "bg-gradient-to-r from-[#4da8ff] to-[#8ccbff] text-[#071a2b] shadow-[0_18px_40px_-22px_rgba(77,168,255,0.9)] hover:-translate-y-0.5 hover:brightness-110",
        variant === "outline" && "border border-[#a8c0d5]/35 text-[#f4faff] hover:-translate-y-0.5 hover:border-[#8ccbff] hover:bg-[#8ccbff]/10",
        variant === "ghost" && "text-[#ddf3ff] hover:bg-[#ddf3ff]/10",
        variant === "danger" && "border border-rose-400/40 text-rose-200 hover:bg-rose-500/15",
        className,
      )}
      {...props}
    />
  );
}

export function GlassCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass rounded-3xl", className)}>{children}</div>;
}

export function Badge({ children, className, tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "success" | "warn" | "danger" | "info" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest",
        tone === "default" && "border-[#a8c0d5]/30 bg-[#0b263d]/60 text-[#ddf3ff]",
        tone === "success" && "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
        tone === "warn" && "border-amber-400/35 bg-amber-500/10 text-amber-200",
        tone === "danger" && "border-rose-400/35 bg-rose-500/10 text-rose-200",
        tone === "info" && "border-[#4da8ff]/40 bg-[#4da8ff]/10 text-[#ddf3ff]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#f4faff] placeholder:text-[#a8c0d5]/60 transition focus:border-[#8ccbff] focus:bg-[#071a2b]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#f4faff] placeholder:text-[#a8c0d5]/60 transition focus:border-[#8ccbff]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a8c0d5]">{label}</span>
        {hint ? <span className="text-[11px] text-[#a8c0d5]/80">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export function ProductPrice({ price, comparePrice, className }: { price: number; comparePrice?: number | null; className?: string }) {
  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span className="font-display text-lg font-semibold text-[#f4faff]">{formatTaka(price)}</span>
      {comparePrice && comparePrice > price ? (
        <span className="text-xs text-[#a8c0d5]/70 line-through">{formatTaka(comparePrice)}</span>
      ) : null}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-14 text-center">
      {icon ? <div className="mb-4 text-[#8ccbff]">{icon}</div> : null}
      <h3 className="font-display text-xl text-[#f4faff]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[#a8c0d5]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  retryHref,
  detail,
}: {
  title?: string;
  description: string;
  retryHref?: string;
  detail?: string;
}) {
  return (
    <div className="rounded-3xl border border-rose-400/30 bg-rose-500/5 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-rose-400/40 text-rose-200">!</div>
      <h3 className="font-display text-xl text-[#f4faff]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-rose-100/80">{description}</p>
      {detail ? <p className="mx-auto mt-3 max-w-xl break-words text-xs text-rose-200/60">{detail}</p> : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {retryHref ? <LinkButton href={retryHref} variant="outline" size="sm">Retry</LinkButton> : null}
        <LinkButton href="/" variant="ghost" size="sm">Back to store</LinkButton>
      </div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#66b8ff]">{eyebrow}</p> : null}
        <h2 className="font-display text-[clamp(1.6rem,3.5vw,2.1rem)] text-[#f4faff]">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-[#a8c0d5]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Loading primitives (Part 7/11) ───────────────
   Shared skeleton shapes so route loading.tsx files match real page
   structures. All pure CSS (mkr-sheen), transform/opacity only. */

export function ListRowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="glass flex items-center justify-between gap-4 rounded-3xl p-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass space-y-3 rounded-3xl p-5">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-7 w-2/3" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass space-y-3 rounded-3xl p-5">
          <Skeleton className="h-4 w-1/4" />
          <ListRowSkeleton rows={4} />
        </div>
        <div className="glass space-y-3 rounded-3xl p-5">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]" aria-hidden>
      <div className="space-y-3">
        <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-16 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-12 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-hidden>
      <div className="glass flex items-center gap-4 rounded-3xl p-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="glass space-y-4 rounded-3xl p-6">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}

export function Logo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="wordmark text-xl text-[#f4faff] sm:text-2xl">MKR</span>
      {showTagline ? (
        <span className="mt-1 text-[9px] uppercase tracking-[0.34em] text-[#8ccbff]">Casual Threads &amp; Style</span>
      ) : null}
    </span>
  );
}

export function Alert({
  tone = "info",
  children,
  role,
}: {
  tone?: "info" | "success" | "error" | "warn";
  children: ReactNode;
  /** Pass "alert" for important errors so screen readers announce them (Phase 21). */
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "info" && "border-[#4da8ff]/30 bg-[#4da8ff]/10 text-[#ddf3ff]",
        tone === "success" && "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
        tone === "error" && "border-rose-400/30 bg-rose-500/10 text-rose-100",
        tone === "warn" && "border-amber-400/30 bg-amber-500/10 text-amber-100",
      )}
    >
      {children}
    </div>
  );
}
