"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, Loader2, Package, CreditCard, Megaphone, Settings, Info } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  deleteNotification, type CustomerNotification,
} from "@/lib/customer";
import { formatDate } from "@/lib/format";
import {
  ProfileHeader, EmptyState, Skeleton, ErrorState, ConfirmDialog,
} from "@/components/profile/ProfileShell";

function typeIcon(type: string) {
  switch (type) {
    case "order": return Package;
    case "payment": return CreditCard;
    case "promotion": return Megaphone;
    case "system": return Settings;
    default: return Info;
  }
}

export default function NotificationsPage() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<CustomerNotification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setItems(await fetchNotifications(user.id));
    } catch {
      setError("Could not load your notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (n: CustomerNotification) => {
    if (!user || n.is_read) return;
    const res = await markNotificationRead(user.id, n.id);
    if (res.ok) setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
  };

  const markAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  const remove = async () => {
    if (!user || !confirmDelete) return;
    setDeleting(true);
    const res = await deleteNotification(user.id, confirmDelete.id);
    setDeleting(false);
    if (res.ok) setItems((prev) => prev.filter((x) => x.id !== confirmDelete.id));
    setConfirmDelete(null);
  };

  return (
    <div className="min-w-0">
      <ProfileHeader title="Notifications" subtitle="Order updates, payment alerts and store announcements — just for your account." />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" subtitle="You're all caught up. Order updates and announcements will show up here." />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-line-soft pb-4">
            <p className="text-sm text-mist">{items.length} notification{items.length > 1 ? "s" : ""}</p>
            <button type="button" onClick={markAll} className="link-line label !text-[0.62rem] !text-soft hover:!text-ice">
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all as read
            </button>
          </div>
          {items.map((n) => {
            const Icon = typeIcon(n.type);
            return (
              <div
                key={n.id}
                className={`card-glass flex items-start gap-4 rounded-2xl p-5 ${
                  n.is_read ? "opacity-80" : "border-soft/25"
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.is_read ? "bg-deep/70 text-mist" : "bg-soft/15 text-ice"}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-display text-[0.8rem] font-semibold tracking-[0.05em] ${n.is_read ? "text-mist" : "text-foam"}`}>{n.title}</p>
                    <span className="text-[0.68rem] text-mist/70">{formatDate(n.created_at)}</span>
                  </div>
                  {n.message && <p className="mt-1.5 text-[0.8rem] leading-relaxed text-mist/90">{n.message}</p>}
                  <div className="mt-3 flex gap-2">
                    {!n.is_read && (
                      <button type="button" onClick={() => markRead(n)} className="link-line label !text-[0.58rem] !text-soft hover:!text-ice">Mark as read</button>
                    )}
                    <button type="button" onClick={() => setConfirmDelete(n)} className="link-line label !text-[0.58rem] !text-[#ff9b8a] hover:!text-[#ffb3a6]">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this notification?"
        message="This notification will be removed permanently from your inbox."
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}