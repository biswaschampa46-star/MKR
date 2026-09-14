"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { bdt } from "@/lib/format";

export type ToastData = {
  id: string;
  title: string;
  body: string;
  tone?: "success" | "info";
  href?: string;
};

let audioCtx: AudioContext | null = null;

/** Short two-tone chime. Silently no-ops when the browser blocks autoplay —
 *  the visual toast always fires regardless. */
function playChime(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => undefined);
    }
    const now = audioCtx.currentTime;
    for (const [freq, start] of [
      [880, 0],
      [1320, 0.12],
    ] as const) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.12, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.28);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.3);
    }
  } catch {
    /* audio unavailable — the toast still shows */
  }
}

const MAX_VISIBLE = 4;
const AUTO_DISMISS_MS = 8000;

export function useOrderToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((toast: Omit<ToastData, "id"> & { id?: string }) => {
    const id = toast.id ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [{ ...toast, id }, ...t].slice(0, MAX_VISIBLE));
    timers.current.set(
      id,
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
    );
    playChime();
  }, [dismiss]);

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  return { toasts, push, dismiss };
}

export function OrderToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="adm-card pointer-events-auto overflow-hidden border-l-4 p-4 shadow-xl"
          style={{ borderLeftColor: t.tone === "info" ? "var(--adm-primary)" : "var(--adm-success)" }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--adm-tint)", color: t.tone === "info" ? "var(--adm-primary)" : "var(--adm-success)" }}
            >
              {t.tone === "info" ? "ℹ" : "✓"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--adm-text)]">{t.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--adm-sub)]">{t.body}</p>
              {t.href && (
                <a href={t.href} className="mt-1 inline-block text-xs font-semibold text-[var(--adm-primary-soft)] hover:underline">
                  View orders →
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-[var(--adm-sub)] hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Convenience builder for new-order toasts. */
export function newOrderToast(o: {
  id?: string;
  orderNumber: string;
  customerName: string;
  total: number;
}): Omit<ToastData, "id"> & { id?: string } {
  return {
    id: o.id ? `order-${o.id}` : undefined,
    title: "নতুন অর্ডার এসেছে!",
    body: `${o.orderNumber} · ${o.customerName} · ${bdt(o.total)}`,
    tone: "success" as const,
    href: "/admin/orders",
  };
}
