"use client";

import Image from "next/image";

export const LOADER_STATUS = [
  "PREPARING YOUR EXPERIENCE",
  "LOADING COLLECTION",
  "CURATING THE DETAILS",
  "ALMOST READY",
  "READY",
] as const;

/**
 * Pure presentational luxury loader. No business logic, no timers —
 * driven entirely by props from GlobalLoadingOverlay so it stays
 * GPU-friendly (opacity / transform only) and testable.
 */
export default function PremiumLoader({
  progress,
  status,
  leaving,
  compact = false,
}: {
  /** 0–100 eased progress */
  progress: number;
  /** current micro-copy line */
  status: string;
  /** true once the exit transition has started */
  leaving: boolean;
  /** abbreviated variant for route transitions (shorter, same brand) */
  compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div
      className={`mkr-loader${leaving ? " is-leaving" : ""}${compact ? " is-compact" : ""}`}
      aria-hidden="true"
    >
      <div className="mkr-loader-atmo" />
      <div className="mkr-loader-grain" />

      <div className="mkr-loader-inner">
        {/* Brand mark — real MKR asset, luxury identity reveal */}
        <div className="mkr-loader-logo-wrap">
          <Image
            src="/images/loading-logo.png"
            alt=""
            width={512}
            height={512}
            priority
            className="mkr-loader-logo"
          />
          <span className="mkr-loader-sheen" />
        </div>

        {!compact && (
          <div className="mkr-loader-word">
            <p className="mkr-loader-brand">MKR</p>
            <p className="mkr-loader-sub">Casual Threads &amp; Style</p>
          </div>
        )}

        {/* Editorial loading line — thin track, revealed fill, travelling light */}
        <div
          className="mkr-loader-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="mkr-loader-fill" style={{ transform: `scaleX(${pct / 100})` }} />
          <span className="mkr-loader-dot" style={{ left: `${pct}%` }} />
        </div>

        <p key={status} className="mkr-loader-status">
          {status}
        </p>
      </div>
    </div>
  );
}
