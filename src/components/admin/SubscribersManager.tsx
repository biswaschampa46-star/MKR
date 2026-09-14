"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import type { InferSelectModel } from "drizzle-orm";
import type { subscribers } from "@/db/schema";

type Subscriber = InferSelectModel<typeof subscribers>;

export default function SubscribersManager({ items }: { items: Subscriber[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  const remove = async (id: number) => {
    if (!confirm("Remove this subscriber?")) return;
    setBusyId(id);
    await fetch(`/api/admin/subscribers/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  };

  if (items.length === 0) return <p className="py-12 text-center text-sm text-mist">No subscribers yet.</p>;

  return (
    <ul className="divide-y divide-line-soft rounded-xl border border-line-soft">
      {items.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-foam">{s.email}</p>
            <p className="mt-1 text-xs text-mist">{formatDate(s.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={() => remove(s.id)}
            disabled={busyId === s.id}
            className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
