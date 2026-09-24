"use client";

import { useState } from "react";
import { Alert, Button, Field, Input, SectionHeading } from "@/components/ui";
import { formatDateTime, formatTaka, ORDER_STATUS_LABELS } from "@/lib/utils";

type TrackedOrder = {
  orderNumber: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  createdAt: string;
  total: number;
  items: { productName: string; size: string | null; color: string | null; quantity: number; lineTotal: number }[];
  events: { status: string; message: string | null; createdAt: string }[];
};

export default function TrackPage() {
  const [state, setState] = useState<{ pending: boolean; error: string | null; order: TrackedOrder | null }>({
    pending: false,
    error: null,
    order: null,
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState({ pending: true, error: null, order: null });
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: String(formData.get("orderNumber") ?? ""),
          identifier: String(formData.get("identifier") ?? ""),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; order?: TrackedOrder; error?: string };
      if (!payload.ok || !payload.order) throw new Error(payload.error ?? "Order not found.");
      setState({ pending: false, error: null, order: payload.order });
    } catch (cause) {
      setState({ pending: false, error: cause instanceof Error ? cause.message : "Order not found.", order: null });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <SectionHeading
        eyebrow="Order tracking"
        title="Track your MKR parcel"
        description="Enter your MK order number plus the email or phone used at checkout."
      />

      <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Order number">
            <Input name="orderNumber" placeholder="MK-001001" required />
          </Field>
          <Field label="Email or phone used at checkout">
            <Input name="identifier" placeholder="you@email.com / 01712345678" required />
          </Field>
        </div>
        <Button type="submit" disabled={state.pending}>
          {state.pending ? "Checking…" : "Track order"}
        </Button>
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      </form>

      {state.order ? (
        <section className="glass space-y-4 rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-[#f4faff]">{state.order.orderNumber}</h2>
            <span className="rounded-full border border-[#8ccbff]/40 bg-[#8ccbff]/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#ddf3ff]">
              {state.order.statusLabel ?? ORDER_STATUS_LABELS[state.order.status]}
            </span>
          </div>
          <p className="text-xs text-[#a8c0d5]">
            Placed {formatDateTime(state.order.createdAt)} · Total {formatTaka(state.order.total)}
          </p>
          <ul className="space-y-2 text-sm text-[#ddf3ff]">
            {state.order.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-3">
                <span>
                  {item.productName} {item.size ? `· ${item.size}` : ""} ×{item.quantity}
                </span>
                <span>{formatTaka(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <ol className="space-y-3 border-t border-[#a8c0d5]/15 pt-4">
            {state.order.events.map((event, index) => (
              <li key={index} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-[#8ccbff]" />
                <div>
                  <p className="text-[#f4faff]">{ORDER_STATUS_LABELS[event.status] ?? event.status}</p>
                  {event.message ? <p className="text-xs text-[#a8c0d5]">{event.message}</p> : null}
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#a8c0d5]/70">{formatDateTime(event.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
