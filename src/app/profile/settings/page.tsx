"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Shield, Trash2, Loader2, LogOut, Save } from "lucide-react";
import { useAuth, signOutUser } from "@/lib/auth-store";
import { fetchProfile, updateProfile, type CustomerProfile } from "@/lib/customer";
import { supabase } from "@/lib/supabase";
import {
  ProfileHeader, Skeleton, ConfirmDialog, Flash,
} from "@/components/profile/ProfileShell";
import UiSelect from "@/components/UiSelect";

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private — only visible to you" },
  { value: "public", label: "Public — name & photo shown on reviews" },
] as const;

export default function SettingsPage() {
  const user = useAuth((s) => s.user);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({ orderUpdates: true, promotions: true, email: true });
  const [visibility, setVisibility] = useState("private");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busySignOut, setBusySignOut] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const p = await fetchProfile(user.id);
      setProfile(p);
      if (p) {
        setPrefs(p.notification_prefs ?? { orderUpdates: true, promotions: true, email: true });
        setVisibility(p.profile_visibility ?? "private");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    setMsg(null);
    const res = await updateProfile(user.id, { notification_prefs: prefs, profile_visibility: visibility });
    setBusy(false);
    setMsg(res.ok ? { kind: "ok", text: "Settings saved." } : { kind: "error", text: res.message });
  };

  const requestDeletion = async () => {
    if (!user || !supabase) return;
    setDeleting(true);
    const { error } = await supabase.from("customer_notifications").insert({
      user_id: user.id,
      title: "Account deletion requested",
      message: "This customer requested to close their account. Review before taking action.",
      type: "system",
    });
    if (!error) await updateProfile(user.id, { account_status: "pending_deletion" });
    setDeleting(false);
    setConfirmDelete(false);
    setMsg(error
      ? { kind: "error", text: "Could not submit the request. Please try again." }
      : { kind: "ok", text: "Your account deletion request has been sent to the store team." });
  };

  const doSignOut = async () => {
    setBusySignOut(true);
    await signOutUser();
    setBusySignOut(false);
    window.location.href = "/";
  };

  const dv = (k: "orderUpdates" | "promotions" | "email") => (v: boolean) =>
    setPrefs((p) => ({ ...p, [k]: v }));
return (
    <div className="min-w-0">
      <ProfileHeader title="Account Settings" subtitle="Manage your preferences, privacy and account." />

      {loading ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : (
        <div className="space-y-6">
          {msg && <Flash kind={msg.kind} text={msg.text} />}

          <section className="card-glass rounded-2xl p-6 sm:p-8">
            <p className="font-display flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-foam"><Bell className="h-4 w-4 text-soft" /> Notification preferences</p>
            <div className="mt-6 space-y-5">
              {([
                ["orderUpdates", "Order updates", "Order confirmed, shipped, delivered or cancelled."],
                ["promotions", "Promotions & offers", "Sales, new arrivals and store announcements."],
                ["email", "Email notifications", "Also receive important updates by email."],
              ] as const).map(([key, title, sub]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line-soft p-4">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foam">{title}</span>
                    <span className="block mt-1 text-[0.72rem] text-mist">{sub}</span>
                  </span>
                  <input type="checkbox" checked={prefs[key]} onChange={(e) => dv(key)(e.target.checked)} className="h-5 w-9 cursor-pointer accent-soft" />
                </label>
              ))}
            </div>
          </section>

          <section className="card-glass rounded-2xl p-6 sm:p-8">
            <p className="font-display flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-foam"><Shield className="h-4 w-4 text-soft" /> Privacy</p>
            <div className="mt-5 block">
              <span className="label mb-2 block !tracking-[0.16em]">Profile visibility</span>
              <UiSelect
                value={visibility}
                onChange={setVisibility}
                options={VISIBILITY_OPTIONS}
                placeholder="Select visibility"
                searchable={false}
                ariaLabel="Profile visibility"
              />
            </div>
          </section>

          <button type="button" onClick={save} disabled={busy} className="btn btn-solid">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </button>
          <section className="card-glass rounded-2xl border-[#ff9b8a]/25 p-6 sm:p-8">
            <p className="label !tracking-[0.2em] !text-[#ffb3a6]">Danger zone</p>
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foam">Sign out of this device</p>
                  <p className="mt-1 text-[0.72rem] text-mist">End your current session. You can sign back in anytime.</p>
                </div>
                <button type="button" onClick={doSignOut} disabled={busySignOut} className="btn btn-line shrink-0 !px-4 !py-2 text-[0.62rem]">
                  {busySignOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />} Sign out
                </button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foam">Request account deletion</p>
                  <p className="mt-1 text-[0.72rem] text-mist">Sends a request to the store team. Nothing is deleted automatically.</p>
                </div>
                <button type="button" onClick={() => setConfirmDelete(true)} className="btn shrink-0 !px-4 !py-2 text-[0.62rem] !border-[#ff9b8a]/30 !bg-[#ff9b8a]/10 !text-[#ffb3a6]">
                  <Trash2 className="h-3.5 w-3.5" /> Request deletion
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Request account deletion?"
        message="This sends a request to our store team who will handle it securely. No data is removed immediately. Are you sure?"
        confirmLabel="Request deletion"
        busy={deleting}
        onConfirm={requestDeletion}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}