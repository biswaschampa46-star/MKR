"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StoreSettings } from "@/lib/settings";
import { useGlobalLoading } from "@/lib/loading-store";

export default function SettingsForm({ initial }: { initial: StoreSettings }) {
  const router = useRouter();
  const [v, setV] = useState<StoreSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    useGlobalLoading.getState().startTask();
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storeName: v.storeName,
          siteTitle: v.siteTitle,
          siteTagline: v.siteTagline,
          deliveryFeeInside: String(v.deliveryFeeInside),
          deliveryFeeOutside: String(v.deliveryFeeOutside),
          bkashNumber: v.bkashNumber,
          nagadNumber: v.nagadNumber,
          rocketNumber: v.rocketNumber,
          aiBaseUrl: v.aiBaseUrl,
          aiApiKey: v.aiApiKey,
          aiModels: v.aiModels,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) setError(data.message ?? "Save failed.");
      else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Save failed.");
    } finally {
      setBusy(false);
      useGlobalLoading.getState().endTask();
    }
  };

  const inputCls = "mt-2 w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam focus:border-soft/60 focus:outline-none";

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5">
      <p className="label !text-mist/60">Website identity</p>
      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        Store name (shown in the nav, footer and browser-tab template)
        <input value={v.storeName} onChange={(e) => setV({ ...v, storeName: e.target.value })} placeholder="MKR" className={inputCls} />
      </label>
      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        Website title (browser-tab title of the home page)
        <input value={v.siteTitle} onChange={(e) => setV({ ...v, siteTitle: e.target.value })} placeholder="MKR — Everyday style, elevated." className={inputCls} />
      </label>
      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        Website tagline (footer lead &amp; search-engine description)
        <input value={v.siteTagline} onChange={(e) => setV({ ...v, siteTagline: e.target.value })} placeholder="Everyday style, elevated." className={inputCls} />
      </label>

      <p className="label pt-4 !text-mist/60">Delivery &amp; advance payment</p>
      <div className="grid grid-cols-2 gap-5">
        <label className="block text-xs uppercase tracking-[0.18em] text-mist">
          Delivery fee — inside Chattogram (৳, prepaid)
          <input type="number" min={0} value={v.deliveryFeeInside} onChange={(e) => setV({ ...v, deliveryFeeInside: Number(e.target.value) })} className={inputCls} />
        </label>
        <label className="block text-xs uppercase tracking-[0.18em] text-mist">
          Delivery fee — outside Chattogram (৳, prepaid)
          <input type="number" min={0} value={v.deliveryFeeOutside} onChange={(e) => setV({ ...v, deliveryFeeOutside: Number(e.target.value) })} className={inputCls} />
        </label>
      </div>
      <p className="text-xs leading-relaxed text-mist/60">
        Products are paid <span className="text-foam">cash on delivery</span>. Only the delivery
        charge is paid in advance via bKash / Nagad / Rocket.
      </p>

      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        bKash number (shown to customers for the prepaid delivery charge)
        <input value={v.bkashNumber} onChange={(e) => setV({ ...v, bkashNumber: e.target.value })} placeholder="01XXXXXXXXX" className={inputCls} />
      </label>
      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        Nagad number
        <input value={v.nagadNumber} onChange={(e) => setV({ ...v, nagadNumber: e.target.value })} placeholder="01XXXXXXXXX" className={inputCls} />
      </label>
      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        Rocket number
        <input value={v.rocketNumber} onChange={(e) => setV({ ...v, rocketNumber: e.target.value })} placeholder="01XXXXXXXXX" className={inputCls} />
      </label>

      <p className="label pt-4 !text-mist/60">AI shop assistant</p>
      <p className="text-xs leading-relaxed text-mist/60">
        The assistant works with any OpenRouter-compatible chat-completions API.
        Values saved here override the AI_BASE_URL / AI_MODELS / OPENROUTER_API_KEY
        environment variables.
      </p>
      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        AI base URL (chat-completions endpoint)
        <input value={v.aiBaseUrl} onChange={(e) => setV({ ...v, aiBaseUrl: e.target.value })} placeholder="https://openrouter.ai/api/v1/chat/completions" className={inputCls} />
      </label>
      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        AI API key (stored server-side only; leave empty to keep the current env key)
        <input type="password" value={v.aiApiKey} onChange={(e) => setV({ ...v, aiApiKey: e.target.value })} placeholder="sk-or-v1-…" className={inputCls} autoComplete="off" />
      </label>
      <label className="block text-xs uppercase tracking-[0.18em] text-mist">
        AI model names (comma-separated, tried in order as fallbacks)
        <input value={v.aiModels} onChange={(e) => setV({ ...v, aiModels: e.target.value })} placeholder="nvidia/nemotron-3.5-lightning:free, …" className={inputCls} />
      </label>

      {error && <p className="text-sm text-accent">{error}</p>}
      {saved && <p className="text-sm text-foam">Settings saved.</p>}

      <button type="submit" disabled={busy} aria-busy={busy} className="rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-foam hover:bg-white/15 disabled:opacity-50">
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
