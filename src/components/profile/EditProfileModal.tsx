"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Save } from "lucide-react";
import {
  updateProfile, uploadProfilePhoto, removeProfilePhotoFile,
  isValidBdPhone, type CustomerProfile,
} from "@/lib/customer";
import { Modal, Flash } from "./ProfileShell";
import UiSelect from "@/components/UiSelect";

const GENDERS = ["male", "female", "other"] as const;
const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export default function EditProfileModal({ open, onClose, profile, userId, onSaved }: {
  open: boolean; onClose: () => void; userId: string; onSaved: () => void;
  profile: CustomerProfile | null;
}) {
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [dob, setDob] = useState(profile?.date_of_birth ?? "");
  const [gender, setGender] = useState(profile?.gender ?? "");
  const [photo, setPhoto] = useState(profile?.profile_photo ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setDob(profile.date_of_birth ?? "");
      setGender(profile.gender ?? "");
      setPhoto(profile.profile_photo ?? "");
      setMsg(null);
    }
  }, [open, profile]);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const old = photo;
    const res = await uploadProfilePhoto(userId, file);
    if (!res.ok) {
      setMsg({ kind: "error", text: res.message });
      setUploading(false);
      return;
    }
    setPhoto(res.url);
    if (old) await removeProfilePhotoFile(old);
    setUploading(false);
  };

  const save = async () => {
    if (name.trim().length < 2) {
      setMsg({ kind: "error", text: "Please enter your full name." });
      return;
    }
    if (phone.trim() && !isValidBdPhone(phone)) {
      setMsg({ kind: "error", text: "Enter a valid Bangladeshi mobile number (e.g. 01712345678) or leave it empty." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await updateProfile(userId, {
      full_name: name.trim().slice(0, 120),
      phone: phone.trim().replace(/[\s-]/g, "").slice(0, 24),
      date_of_birth: dob || null,
      gender: gender || null,
      profile_photo: photo,
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ kind: "ok", text: "Profile updated." });
      onSaved();
      setTimeout(onClose, 500);
    } else {
      setMsg({ kind: "error", text: res.message });
    }
  };

  return (
    <Modal open={open} onClose={onClose} wide>
      <p className="label !tracking-[0.2em]">Edit Profile</p>
      <h3 className="display-3 mt-3 text-foam">Personal information</h3>

      <div className="mt-6 flex items-center gap-5">
        <div className="media-frame relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
          {photo ? (
            <Image src={photo} alt="Profile" fill sizes="80px" unoptimized className="object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center bg-deep/80 font-display text-2xl font-bold text-soft">
              {(name || "C").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-line !px-4 !py-2 text-[0.65rem]">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {photo ? "Replace photo" : "Upload photo"}
          </button>
          <p className="mt-2 text-[0.68rem] text-mist/60">JPG, PNG or WebP · max 2 MB</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label mb-2 block !tracking-[0.16em]">Full name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Your full name" />
        </label>
        <label className="block">
          <span className="label mb-2 block !tracking-[0.16em]">Email <span className="normal-case tracking-normal text-mist/50">(read-only)</span></span>
          <input className="field opacity-60" value={profile?.email ?? ""} readOnly disabled />
        </label>
        <label className="block">
          <span className="label mb-2 block !tracking-[0.16em]">Phone number</span>
          <input className="field" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01712345678" />
        </label>
        <label className="block">
          <span className="label mb-2 block !tracking-[0.16em]">Date of birth <span className="normal-case tracking-normal text-mist/50">(optional)</span></span>
          <input type="date" className="field" value={dob ?? ""} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} />
        </label>
        <div className="block sm:col-span-2">
          <span className="label mb-2 block !tracking-[0.16em]">Gender <span className="normal-case tracking-normal text-mist/50">(optional)</span></span>
          <UiSelect
            value={gender ?? ""}
            onChange={setGender}
            options={GENDER_OPTIONS}
            placeholder="Prefer not to say"
            searchable={false}
            ariaLabel="Gender"
          />
        </div>
      </div>

      {msg && <Flash kind={msg.kind} text={msg.text} />}

      <div className="mt-7 flex gap-3">
        <button type="button" onClick={onClose} className="btn btn-line flex-1">Cancel</button>
        <button type="button" onClick={save} disabled={busy || uploading} className="btn btn-solid flex-1">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </div>
    </Modal>
  );
}