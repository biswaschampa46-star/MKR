"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import { useGlobalLoading } from "@/lib/loading-store";
import type { InferSelectModel } from "drizzle-orm";
import type { messages } from "@/db/schema";

type Message = InferSelectModel<typeof messages>;

export default function MessagesManager({ items }: { items: Message[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  const remove = async (id: number) => {
    if (!confirm("Delete this message?")) return;
    setBusyId(id);
    useGlobalLoading.getState().startTask();
    try {
      await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
      useGlobalLoading.getState().endTask();
    }
  };

  if (items.length === 0) return <p className="py-12 text-center text-sm text-mist">No messages yet.</p>;

  return (
    <ul className="space-y-4">
      {items.map((m) => (
        <li key={m.id} className="rounded-xl border border-line-soft p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foam">{m.name}</p>
              <p className="text-xs text-mist">{m.email} · {formatDate(m.createdAt)}</p>
            </div>
            <button
              type="button"
              onClick={() => remove(m.id)}
              disabled={busyId === m.id}
              aria-busy={busyId === m.id}
              className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-mist">{m.message}</p>
        </li>
      ))}
    </ul>
  );
}
