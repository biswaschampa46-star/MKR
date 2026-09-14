"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Store, Phone, Mail, MapPin, Globe, Clock, Headset, Loader2,
  CheckCircle2, AlertCircle, RotateCcw,
} from "lucide-react";
import type { StoreSettings } from "@/lib/settings";
import { isValidEmail, isValidPhone, isValidUrl } from "@/lib/contact-links";
import {
  FacebookIcon, InstagramIcon, WhatsappIcon, TiktokIcon, YoutubeIcon, XLogoIcon,
} from "@/components/ContactIcons";

type FormState = {
  storeName: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  contactSupportEmail: string;
  contactAddress: string;
  contactCity: string;
  contactCountry: string;
  contactOpeningHours: string;
  contactSupportHours: string;
  contactDescription: string;
  contactFacebook: string;
  contactInstagram: string;
  contactTiktok: string;
  contactYoutube: string;
  contactTwitter: string;
  contactPhoneEnabled: boolean;
  contactWhatsappEnabled: boolean;
  contactEmailEnabled: boolean;
  contactFacebookEnabled: boolean;
  contactInstagramEnabled: boolean;
  contactTiktokEnabled: boolean;
  contactYoutubeEnabled: boolean;
  contactTwitterEnabled: boolean;
};

const TEXT_KEYS: (keyof FormState)[] = [
  "storeName", "contactPhone", "contactWhatsapp", "contactEmail", "contactSupportEmail",
  "contactAddress", "contactCity", "contactCountry", "contactOpeningHours", "contactSupportHours",
  "contactDescription", "contactFacebook", "contactInstagram", "contactTiktok",
  "contactYoutube", "contactTwitter",
];

function fromSettings(s: StoreSettings): FormState {
  return {
    storeName: s.storeName,
    contactPhone: s.contactPhone,
    contactWhatsapp: s.contactWhatsapp,
    contactEmail: s.contactEmail,
    contactSupportEmail: s.contactSupportEmail,
    contactAddress: s.contactAddress,
    contactCity: s.contactCity,
    contactCountry: s.contactCountry,
    contactOpeningHours: s.contactOpeningHours,
    contactSupportHours: s.contactSupportHours,
    contactDescription: s.contactDescription,
    contactFacebook: s.contactFacebook,
    contactInstagram: s.contactInstagram,
    contactTiktok: s.contactTiktok,
    contactYoutube: s.contactYoutube,
    contactTwitter: s.contactTwitter,
    contactPhoneEnabled: s.contactPhoneEnabled,
    contactWhatsappEnabled: s.contactWhatsappEnabled,
    contactEmailEnabled: s.contactEmailEnabled,
    contactFacebookEnabled: s.contactFacebookEnabled,
    contactInstagramEnabled: s.contactInstagramEnabled,
    contactTiktokEnabled: s.contactTiktokEnabled,
    contactYoutubeEnabled: s.contactYoutubeEnabled,
    contactTwitterEnabled: s.contactTwitterEnabled,
  };
}

function validate(v: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.storeName.trim()) e.storeName = "Store name cannot be empty.";
  if (v.contactPhone.trim() && !isValidPhone(v.contactPhone)) e.contactPhone = "Enter a valid phone number (6–16 digits).";
  if (v.contactWhatsapp.trim() && !isValidPhone(v.contactWhatsapp)) e.contactWhatsapp = "Enter a valid WhatsApp number (6–16 digits).";
  if (v.contactEmail.trim() && !isValidEmail(v.contactEmail)) e.contactEmail = "Enter a valid email address.";
  if (v.contactSupportEmail.trim() && !isValidEmail(v.contactSupportEmail)) e.contactSupportEmail = "Enter a valid support email.";
  const urls: (keyof FormState)[] = ["contactFacebook", "contactInstagram", "contactTiktok", "contactYoutube", "contactTwitter"];
  for (const k of urls) {
    const val = String(v[k]);
    if (val.trim() && !isValidUrl(val)) e[k] = "Enter a valid URL starting with http(s)://.";
  }
  return e;
}

function Toggle({
  checked, onChange, label,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 ${
        checked ? "bg-[var(--adm-success)]" : "bg-[var(--adm-border)]"
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export default function ContactDetailsForm({ initial }: { initial: StoreSettings }) {
  const router = useRouter();
  const snapshot = useMemo(() => fromSettings(initial), [initial]);
  const [v, setV] = useState<FormState>(snapshot);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty = useMemo(() => TEXT_KEYS.some((k) => v[k] !== snapshot[k]) || [
    "contactPhoneEnabled", "contactWhatsappEnabled", "contactEmailEnabled",
    "contactFacebookEnabled", "contactInstagramEnabled", "contactTiktokEnabled",
    "contactYoutubeEnabled", "contactTwitterEnabled",
  ].some((k) => v[k as keyof FormState] !== snapshot[k as keyof FormState]), [v, snapshot]);

  const set = <K extends keyof FormState>(k: K, val: FormState[K]) => {
    setV((prev) => ({ ...prev, [k]: val }));
    setSaved(false);
    setErrors((prev) => {
      if (!prev[k as string]) return prev;
      const next = { ...prev };
      delete next[k as string];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(v);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError("Please fix the highlighted fields before saving.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/contact-details", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Save failed.");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Save failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setV(snapshot);
    setErrors({});
    setError("");
    setSaved(false);
  };

  const field = (
    key: keyof FormState,
    label: string,
    placeholder: string,
    opts?: { icon?: React.ReactNode; hint?: string; type?: string; textarea?: boolean; toggle?: { checked: boolean; onChange: (b: boolean) => void; label: string } },
  ) => (
    <div>
      <label htmlFor={`cd-${key}`} className="adm-label flex items-center gap-2">
        {opts?.icon && <span className="text-[var(--adm-primary-soft)]">{opts.icon}</span>}
        <span>{label}</span>
        {opts?.toggle && (
          <span className="ml-auto flex items-center gap-2 normal-case tracking-normal">
            <span className={`text-xs font-medium ${opts.toggle.checked ? "text-[var(--adm-success)]" : "text-[var(--adm-sub)]"}`}>
              {opts.toggle.checked ? "Visible" : "Hidden"}
            </span>
            <Toggle checked={opts.toggle.checked} onChange={opts.toggle.onChange} label={opts.toggle.label} />
          </span>
        )}
      </label>
      {opts?.textarea ? (
        <textarea
          id={`cd-${key}`}
          rows={3}
          value={String(v[key])}
          onChange={(e) => set(key, e.target.value as FormState[typeof key])}
          placeholder={placeholder}
          aria-invalid={Boolean(errors[key as string])}
          aria-describedby={errors[key as string] ? `cd-${key}-err` : undefined}
          className="adm-input mt-2 resize-none"
        />
      ) : (
        <input
          id={`cd-${key}`}
          type={opts?.type ?? "text"}
          value={String(v[key])}
          onChange={(e) => set(key, e.target.value as FormState[typeof key])}
          placeholder={placeholder}
          aria-invalid={Boolean(errors[key as string])}
          aria-describedby={errors[key as string] ? `cd-${key}-err` : undefined}
          className="adm-input mt-2"
        />
      )}
      {opts?.hint && !errors[key as string] && <p className="mt-1.5 text-xs text-[var(--adm-sub)]">{opts.hint}</p>}
      {errors[key as string] && (
        <p id={`cd-${key}-err`} role="alert" className="mt-1.5 text-xs font-medium text-[var(--adm-danger)]">
          {errors[key as string]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {/* status banners */}
      <div aria-live="polite">
        {saved && (
          <p className="adm-card flex items-center gap-2.5 border-l-4 p-4 text-sm font-medium text-[var(--adm-success)]" style={{ borderLeftColor: "var(--adm-success)" }} role="status">
            <CheckCircle2 size={18} /> Contact details saved — the public site now shows the latest information.
          </p>
        )}
        {error && (
          <p className="adm-card flex items-center gap-2.5 border-l-4 p-4 text-sm font-medium text-[var(--adm-danger)]" style={{ borderLeftColor: "var(--adm-danger)" }} role="alert">
            <AlertCircle size={18} /> {error}
          </p>
        )}
      </div>

      {/* basic info */}
      <section className="adm-card p-5 sm:p-7" aria-labelledby="cd-basic">
        <h2 id="cd-basic" className="font-display text-base font-bold">Basic contact information</h2>
        <p className="mt-1 text-sm text-[var(--adm-sub)]">Shown in the footer, contact page and mobile menu — only when enabled and non-empty.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {field("storeName", "Business / Store Name", "MKR", { icon: <Store size={15} /> })}
          {field("contactPhone", "Contact Phone Number", "+880 1XXX-XXXXXX", {
            icon: <Phone size={15} />, type: "tel", hint: "Tapping it on the site opens the dialer.",
            toggle: { checked: v.contactPhoneEnabled, onChange: (b) => set("contactPhoneEnabled", b), label: "Show phone on public site" },
          })}
          {field("contactWhatsapp", "WhatsApp Number", "+880 1XXX-XXXXXX", {
            icon: <WhatsappIcon size={15} />, type: "tel", hint: "Opens a WhatsApp chat (wa.me link).",
            toggle: { checked: v.contactWhatsappEnabled, onChange: (b) => set("contactWhatsappEnabled", b), label: "Show WhatsApp on public site" },
          })}
          {field("contactEmail", "Email Address", "hello@example.com", {
            icon: <Mail size={15} />, type: "email",
            toggle: { checked: v.contactEmailEnabled, onChange: (b) => set("contactEmailEnabled", b), label: "Show email on public site" },
          })}
          {field("contactSupportEmail", "Support Email", "support@example.com", { icon: <Headset size={15} />, type: "email", hint: "Shown alongside the main email when different." })}
          {field("contactAddress", "Business Address", "House 12, Road 5, Dhanmondi", { icon: <MapPin size={15} /> })}
          {field("contactCity", "City", "Dhaka", { icon: <MapPin size={15} /> })}
          {field("contactCountry", "Country", "Bangladesh", { icon: <Globe size={15} /> })}
        </div>
      </section>

      {/* social */}
      <section className="adm-card p-5 sm:p-7" aria-labelledby="cd-social">
        <h2 id="cd-social" className="font-display text-base font-bold">Social media</h2>
        <p className="mt-1 text-sm text-[var(--adm-sub)]">Full profile URLs. Disabled or empty networks are hidden everywhere publicly.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {field("contactFacebook", "Facebook URL", "https://facebook.com/your-page", {
            icon: <FacebookIcon size={15} />,
            toggle: { checked: v.contactFacebookEnabled, onChange: (b) => set("contactFacebookEnabled", b), label: "Show Facebook on public site" },
          })}
          {field("contactInstagram", "Instagram URL", "https://instagram.com/your-handle", {
            icon: <InstagramIcon size={15} />,
            toggle: { checked: v.contactInstagramEnabled, onChange: (b) => set("contactInstagramEnabled", b), label: "Show Instagram on public site" },
          })}
          {field("contactTiktok", "TikTok URL", "https://tiktok.com/@your-handle", {
            icon: <TiktokIcon size={15} />,
            toggle: { checked: v.contactTiktokEnabled, onChange: (b) => set("contactTiktokEnabled", b), label: "Show TikTok on public site" },
          })}
          {field("contactYoutube", "YouTube URL", "https://youtube.com/@your-channel", {
            icon: <YoutubeIcon size={15} />,
            toggle: { checked: v.contactYoutubeEnabled, onChange: (b) => set("contactYoutubeEnabled", b), label: "Show YouTube on public site" },
          })}
          {field("contactTwitter", "X / Twitter URL", "https://x.com/your-handle", {
            icon: <XLogoIcon size={15} />,
            toggle: { checked: v.contactTwitterEnabled, onChange: (b) => set("contactTwitterEnabled", b), label: "Show X (Twitter) on public site" },
          })}
        </div>
      </section>

      {/* business info */}
      <section className="adm-card p-5 sm:p-7" aria-labelledby="cd-biz">
        <h2 id="cd-biz" className="font-display text-base font-bold">Business information</h2>
        <p className="mt-1 text-sm text-[var(--adm-sub)]">Hours and the short help text shown on the contact page.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {field("contactOpeningHours", "Opening Hours", "Sat–Thu, 10am – 8pm", { icon: <Clock size={15} /> })}
          {field("contactSupportHours", "Support Hours", "Daily, 9am – 11pm", { icon: <Headset size={15} /> })}
          <div className="sm:col-span-2">
            {field("contactDescription", "Short Contact Description", "Have a question about your order? Contact our support team and we'll be happy to help.", { textarea: true })}
          </div>
        </div>
      </section>

      {/* actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={busy || !dirty} className="adm-btn adm-btn-primary min-w-44">
          {busy ? (<><Loader2 size={16} className="animate-spin" /> Saving…</>) : "Save Changes"}
        </button>
        <button type="button" onClick={reset} disabled={busy || !dirty} className="adm-btn adm-btn-ghost">
          <RotateCcw size={16} /> Reset
        </button>
        {!dirty && !saved && <p className="text-sm text-[var(--adm-sub)]">No unsaved changes.</p>}
      </div>
    </form>
  );
}
