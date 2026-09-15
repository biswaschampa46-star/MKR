"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import Countdown from "./Countdown";
import CouponCopy from "./CouponCopy";
import type { PromoPublic } from "@/lib/promotion-utils";

/**
 * localStorage-backed dismissals exposed as an external store so the
 * component can read them without a setState-in-effect pattern.
 */
const DISMISS_KEY = "mkr_announcement_closed";

let cachedIds: string[] = [];
let version = 0;
const listeners = new Set<() => void>();

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function init() {
  cachedIds = readFromStorage();
  return () => {};
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): number {
  return version;
}

function dismissId(id: string) {
  if (cachedIds.includes(id)) return;
  cachedIds = [...cachedIds, id].slice(-30);
  version++;
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(cachedIds));
  } catch {
    /* private mode — still dismiss for this session */
  }
  listeners.forEach((l) => l());
}

/**
 * Slim top announcement bar. Content, colors and schedule come entirely
 * from the Admin Panel. Dismissal is remembered locally per campaign id.
 */
export default function AnnouncementBar({
  campaigns,
}: {
  campaigns: PromoPublic[];
}) {
  const pathname = usePathname();
  useSyncExternalStore(subscribe, init, init);
  const version_ = useSyncExternalStore(subscribe, getSnapshot, () => 0);

  const onDismiss = useCallback((id: string) => dismissId(id), []);

  if (pathname?.startsWith("/admin")) return null;
  if (version_ < 0) return null; // unreachable; keeps version_ referenced

  const open = campaigns.filter((c) => c.campaignName && !cachedIds.includes(c.id));
  if (open.length === 0) return null;

  const c = open[0];
  const style: React.CSSProperties = {
    background: c.bgColor,
    color: c.textColor,
  };
  if (c.bgMode === "gradient" && c.gradientEnabled) {
    style.background = `linear-gradient(90deg, ${c.bgColor} 0%, ${c.bgColor2} 100%)`;
  }

  return (
    <div
      className="relative z-[55] text-center"
      style={style}
      role="region"
      aria-label="Announcement"
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-center gap-3 px-10 py-2.5 text-xs font-medium tracking-wide sm:text-sm">
        <span className="truncate">
          {c.description || c.heading || c.campaignName}
        </span>
        {c.endAt &&
          (c.campaignType === "flash_sale" || c.campaignType === "limited_time") && (
            <Countdown
              endAt={c.endAt}
              textColor={c.textColor}
              accentColor={c.accentColor}
              compact
            />
          )}
        {c.ctaUrl && (
          <Link
            href={c.ctaUrl}
            className="hidden shrink-0 items-center gap-1 underline underline-offset-4 opacity-80 transition-opacity hover:opacity-100 sm:inline-flex"
          >
            {c.ctaText || "Shop"}
          </Link>
        )}
      </div>
      {c.couponCode && (
        <div className="pb-2">
          <CouponCopy
            code={c.couponCode}
            accentColor={c.accentColor}
            textColor={c.textColor}
            small
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => onDismiss(c.id)}
        aria-label="Close announcement"
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
