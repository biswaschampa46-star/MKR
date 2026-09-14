"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import {
  fetchAddresses, saveAddress, deleteAddress, setDefaultAddress,
  isValidBdPhone, type CustomerAddress,
} from "@/lib/customer";
import {
  ProfileHeader, EmptyState, Skeleton, Modal, ConfirmDialog, Flash, ErrorState,
} from "@/components/profile/ProfileShell";
import UiSelect from "@/components/UiSelect";

const LABELS = ["home", "work", "other"] as const;
const LABEL_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "work", label: "Work" },
  { value: "other", label: "Other" },
] as const;

type FormState = {
  full_name: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  address: string;
  postal_code: string;
  label: string;
  is_default: boolean;
};

const EMPTY: FormState = {
  full_name: "", phone: "", division: "", district: "", upazila: "",
  address: "", postal_code: "", label: "home", is_default: false,
};

export default function AddressesPage() {
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomerAddress | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setAddresses(await fetchAddresses(user.id));
    } catch {
      setError("Could not load your addresses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (address?: CustomerAddress) => {
    setEditing(address ?? null);
    setForm(
      address
        ? {
            full_name: address.full_name, phone: address.phone,
            division: address.division, district: address.district,
            upazila: address.upazila, address: address.address,
            postal_code: address.postal_code, label: address.label,
            is_default: address.is_default,
          }
        : {
            ...EMPTY,
            full_name: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
          },
    );
    setMsg(null);
    setFormOpen(true);
  };

  const set = (k: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [k]: typeof f[k] === "boolean" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.full_name.trim().length < 2) {
      setMsg({ kind: "error", text: "Please enter the full name for this address." });
      return;
    }
    if (!isValidBdPhone(form.phone)) {
      setMsg({ kind: "error", text: "Please enter a valid Bangladeshi mobile number (e.g. 01712345678)." });
      return;
    }
    if (form.address.trim().length < 4) {
      setMsg({ kind: "error", text: "Please enter the full delivery address." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await saveAddress(
      user.id,
      { ...form, full_name: form.full_name.trim(), address: form.address.trim() },
      editing?.id,
    );
    setBusy(false);
    if (res.ok) {
      setFormOpen(false);
      load();
    } else {
      setMsg({ kind: "error", text: res.message });
    }
  };

  const remove = async () => {
    if (!user || !confirmDelete) return;
    setDeleting(true);
    const res = await deleteAddress(user.id, confirmDelete.id);
    setDeleting(false);
    if (res.ok) {
      setConfirmDelete(null);
      load();
    } else {
      setMsg({ kind: "error", text: res.message });
      setConfirmDelete(null);
    }
  };

  const makeDefault = async (id: string) => {
    if (!user) return;
    await setDefaultAddress(user.id, id);
    load();
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ProfileHeader title="Address Book" subtitle="Saved delivery addresses. Your default address is loaded automatically at checkout." />
        <button type="button" onClick={() => openForm()} className="btn btn-solid mb-8 shrink-0 !px-5">
          <Plus className="h-3.5 w-3.5" /> Add address
        </button>
      </div>

      {msg && <Flash kind={msg.kind} text={msg.text} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No saved address"
          subtitle="You haven't saved any addresses yet. Add one so checkout fills in your delivery details automatically."
          action={<button type="button" onClick={() => openForm()} className="btn btn-solid mt-2"><Plus className="h-3.5 w-3.5" /> Add address</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="card-glass rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-soft/30 bg-soft/10 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-soft">
                  {a.label}
                </span>
                {a.is_default && (
                  <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ice">
                    <Star className="h-3 w-3 fill-ice" /> Default
                  </span>
                )}
              </div>
              <p className="mt-4 font-display text-[0.95rem] font-bold text-foam">{a.full_name}</p>
              <p className="mt-1 text-[0.75rem] text-mist">{a.phone}</p>
              <p className="mt-3 text-sm leading-relaxed text-mist/90">
                {a.address}
                {[a.upazila, a.district, a.division, a.postal_code].filter(Boolean).join(", ")}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                {!a.is_default && (
                  <button type="button" onClick={() => makeDefault(a.id)} className="btn btn-line !px-3.5 !py-2 text-[0.62rem]">
                    <Star className="h-3 w-3" /> Set default
                  </button>
                )}
                <button type="button" onClick={() => openForm(a)} className="btn btn-line !px-3.5 !py-2 text-[0.62rem]">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button type="button" onClick={() => setConfirmDelete(a)} className="btn !px-3.5 !py-2 text-[0.62rem] !border-[#ff9b8a]/30 !bg-[#ff9b8a]/10 !text-[#ffb3a6]">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
{/* add / edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} wide>
        <p className="label !tracking-[0.2em]">{editing ? "Edit Address" : "Add Address"}</p>
        <h3 className="display-3 mt-3 text-foam">{editing ? "Update delivery details" : "New delivery address"}</h3>
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label mb-2 block !tracking-[0.16em]">Full name</span><input className="field" value={form.full_name} onChange={set("full_name")} maxLength={120} placeholder="Recipient's name" /></label>
          <label className="block"><span className="label mb-2 block !tracking-[0.16em]">Phone</span><input className="field" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="01712345678" /></label>
          <label className="block"><span className="label mb-2 block !tracking-[0.16em]">Division</span><input className="field" value={form.division} onChange={set("division")} maxLength={60} placeholder="e.g. Chattogram" /></label>
          <label className="block"><span className="label mb-2 block !tracking-[0.16em]">District</span><input className="field" value={form.district} onChange={set("district")} maxLength={60} placeholder="e.g. Chattogram" /></label>
          <label className="block"><span className="label mb-2 block !tracking-[0.16em]">Upazila / Area</span><input className="field" value={form.upazila} onChange={set("upazila")} maxLength={60} placeholder="e.g. Khulshi" /></label>
          <label className="block"><span className="label mb-2 block !tracking-[0.16em]">Postal code</span><input className="field" inputMode="numeric" value={form.postal_code} onChange={set("postal_code")} maxLength={12} placeholder="e.g. 4217" /></label>
          <label className="block sm:col-span-2">
            <span className="label mb-2 block !tracking-[0.16em]">Full address</span>
            <textarea className="field min-h-[5rem]" value={form.address} onChange={set("address")} maxLength={500} placeholder="House, road, area — where the order should be delivered" />
          </label>
          <div className="block">
            <span className="label mb-2 block !tracking-[0.16em]">Label</span>
            <UiSelect
              value={form.label}
              onChange={(v) => setForm((f) => ({ ...f, label: v }))}
              options={LABEL_OPTIONS}
              placeholder="Select label"
              searchable={false}
              ariaLabel="Address label"
            />
          </div>
          <label className="flex items-center gap-3 self-end pb-2 text-sm text-foam">
            <input type="checkbox" checked={form.is_default} onChange={set("is_default")} className="h-4 w-4 accent-soft" />
            Set as default address
          </label>
          {msg && <div className="sm:col-span-2"><Flash kind={msg.kind} text={msg.text} /></div>}
          <div className="flex gap-3 sm:col-span-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn btn-line flex-1">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-solid flex-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Add address"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this address?"
        message="This address will be removed from your address book. You can add it again anytime."
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
      </div>
    );
  }
