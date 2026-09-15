"use client";

import { useEffect, useRef, useState } from "react";
import { splitCountdown, remainingMs } from "@/lib/promotion-utils";

/**
 * Real-time countdown for flash sales. Ticks once per second against the
 * campaign's end instant — no database polling. Reaching zero fires
 * onExpire so the parent can stop rendering the campaign immediately.
 */
export default function Countdown({
  endAt,
  textColor,
  accentColor,
  onExpire,
  compact = false,
}: {
  endAt: string;
  textColor: string;
  accentColor: string;
  onExpire?: () => void;
  compact?: boolean;
}) {
  const [ms, setMs] = useState<number | null>(() => remainingMs(endAt, Date.now()));
  const firedRef = useRef(false);

  useEffect(() => {
    if (remainingMs(endAt, Date.now()) === null) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const left = remainingMs(endAt, Date.now());
      setMs(left);
      if (left !== null && left <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(interval);
        onExpire?.();
      }
    };
    tick();
    interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endAt, onExpire]);

  if (ms === null) return null;
  if (ms <= 0) return null;

  const { h, m, s } = splitCountdown(ms);
  const cell = {
    borderColor: `${accentColor}44`,
    background: "rgba(4, 13, 22, 0.35)",
  };

  if (compact) {
    return (
      <span
        className="font-display text-sm font-bold tabular-nums tracking-[0.14em]"
        style={{ color: textColor }}
        role="timer"
        aria-label={`Ends in ${h} hours ${m} minutes`}
      >
        {h}:{m}:{s}
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2"
      role="timer"
      aria-label={`Offer ends in ${h} hours ${m} minutes ${s} seconds`}
    >
      {[
        { v: h, l: "HRS" },
        { v: m, l: "MIN" },
        { v: s, l: "SEC" },
      ].map((u, i) => (
        <div key={u.l} className="flex items-center gap-1.5 sm:gap-2">
          {i > 0 && (
            <span
              aria-hidden="true"
              className="font-display text-base font-bold opacity-50"
              style={{ color: textColor }}
            >
              :
            </span>
          )}
          <div
            className="rounded-lg border px-2 py-1.5 text-center sm:px-3"
            style={cell}
          >
            <span
              className="font-display block text-lg font-extrabold tabular-nums leading-none sm:text-2xl"
              style={{ color: textColor }}
            >
              {u.v}
            </span>
            <span
              className="mt-1 block text-[0.5rem] font-semibold tracking-[0.22em] opacity-70"
              style={{ color: textColor }}
            >
              {u.l}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
