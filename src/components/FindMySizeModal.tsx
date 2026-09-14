"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Loader2, Ruler, Check } from "lucide-react";
import { trackTask } from "@/lib/loading-store";
import {
  BODY_TYPES,
  feetInchesToCm,
  lbToKg,
  type BodyType,
} from "@/lib/sizing";

/**
 * "Find My Size" — premium modal (desktop card / mobile bottom sheet).
 *
 * Talks ONLY to the project's own /api/size-recommendation endpoint; no keys,
 * no third-party calls from the browser. On success it hands the recommended
 * size to the parent (existing size/variant selector) via onSelect.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  sizeGroupLabel: string;
  availableSizes: string[];
  onSelect: (size: string) => void;
};

type Result = {
  recommendedSize: string;
  confidence: "high" | "good" | "moderate";
  reason: string;
  source: "ai" | "fallback";
};

const AGE_MIN = 10;
const AGE_MAX = 100;

const HEIGHT_CM_MIN = 120;
const HEIGHT_CM_MAX = 220;
const WEIGHT_KG_MIN = 30;
const WEIGHT_KG_MAX = 200;

const DISCLAIMER =
  "Size recommendations are estimates based on the information provided. For the best fit, please also check the product's size guide.";

export default function FindMySizeModal({
  open,
  onClose,
  productId,
  productName,
  sizeGroupLabel,
  availableSizes,
  onSelect,
}: Props) {
  /* hydration-safe portal guard (no setState-in-effect) */
  const emptySubscribe = () => () => {};
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  /* form state */
  const [age, setAge] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [weight, setWeight] = useState("");
  const [bodyType, setBodyType] = useState<BodyType | "">("");

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  /* scroll lock + ESC while open (parent unmounts us when closed, so state
     resets naturally on every open — no reset effect needed) */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  /* simple focus trap */
  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    if (!node) return;
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = node.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", onTab);
    return () => node.removeEventListener("keydown", onTab);
  }, [open]);

  /* ---- derived, normalized values (no AI call until submit) ---- */
  const heightCmValue = useMemo(() => {
    if (heightUnit === "cm") return Number(heightCm);
    const ft = Number(heightFt);
    const inch = Number(heightIn) || 0;
    if (!Number.isFinite(ft) || ft <= 0) return NaN;
    return feetInchesToCm(ft, inch);
  }, [heightUnit, heightCm, heightFt, heightIn]);

  const weightKgValue = useMemo(
    () => (weightUnit === "kg" ? Number(weight) : lbToKg(Number(weight))),
    [weightUnit, weight],
  );

  const canSubmit =
    age !== "" &&
    heightCmValue > 0 &&
    Number.isFinite(weightKgValue) &&
    weight !== "" &&
    bodyType !== "" &&
    phase === "form";

  /* client-side sanity validation mirrors the server */
  const validate = (): string | null => {
    const a = Number(age);
    if (!Number.isInteger(a) || a < AGE_MIN || a > AGE_MAX) {
      return `Please enter an age between ${AGE_MIN} and ${AGE_MAX}.`;
    }
    if (heightCmValue < HEIGHT_CM_MIN || heightCmValue > HEIGHT_CM_MAX) {
      if (heightUnit === "cm") return `Height must be between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm.`;
      return "Please enter a realistic height in feet and inches.";
    }
    if (weightKgValue < WEIGHT_KG_MIN || weightKgValue > WEIGHT_KG_MAX) {
      if (weightUnit === "kg") return `Weight must be between ${WEIGHT_KG_MIN} and ${WEIGHT_KG_MAX} kg.`;
      return "Please enter a realistic weight in pounds.";
    }
    if (!bodyType) return "Please choose the body type that feels closest to yours.";
    return null;
  };

  const submit = useCallback(async () => {
    if (phase !== "form") return; // no duplicate submissions
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPhase("loading");

    try {
      const res = await trackTask(fetch("/api/size-recommendation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          sizeGroup: sizeGroupLabel,
          customer: {
            age: Number(age),
            heightCm: heightCmValue,
            weightKg: weightKgValue,
            bodyType,
          },
        }),
      }));
      const data = (await res.json()) as {
        ok: boolean;
        source?: "ai" | "fallback";
        recommendedSize?: string;
        confidence?: Result["confidence"];
        reason?: string;
        message?: string;
      };

      if (data.ok && data.recommendedSize && availableSizes.includes(data.recommendedSize)) {
        if (data.source === "fallback") {
          setNotice("We couldn't reach the recommendation service right now. We'll use a quick estimate instead.");
        }
        setResult({
          recommendedSize: data.recommendedSize,
          confidence: data.confidence ?? "moderate",
          reason: data.reason ?? "",
          source: data.source ?? "fallback",
        });
        setPhase("result");
        return;
      }

      /* endpoint refused (disabled product, bad input, rate limit, …) */
      setError(data.message || "Something went wrong. Please try again.");
      setPhase("form");
    } catch {
      /* network failure → local estimate, same rule as the server fallback */
      setError("We couldn't reach the recommendation service right now. We'll use a quick estimate instead.");
      setPhase("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, age, heightCmValue, heightUnit, weightKgValue, weightUnit, weight, bodyType, productId, sizeGroupLabel, availableSizes]);

  const handleSelect = () => {
    if (!result) return;
    onSelect(result.recommendedSize);
    onClose();
  };

  const reset = () => {
    setPhase("form");
    setNotice(null);
    setResult(null);
  };

  if (!mounted) return null;

  const fieldCls =
    "w-full rounded-xl border border-line bg-transparent px-4 py-3 text-sm text-foam placeholder:text-mist/40 transition-colors focus:border-soft/60 focus:outline-none";

  const unitBtn = (active: boolean) =>
    `rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition-colors ${
      active ? "bg-soft/20 text-ice" : "text-mist/60 hover:text-foam"
    }`;

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fms-title"
      className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* scrim */}
      <div className="scrim absolute inset-0 bg-abyss/85 backdrop-blur-sm" aria-hidden="true" />

      <div
        ref={dialogRef}
        className="review-modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-3xl border border-line bg-deep/95 shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line-soft bg-deep/95 px-6 pb-4 pt-6 backdrop-blur-md sm:rounded-t-3xl">
          <div>
            <p className="label label--bright flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />
              Find My Size
            </p>
            <h2 id="fms-title" className="font-display mt-2 text-lg font-bold text-foam">
              Find Your Recommended Size
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-mist/80">
              Tell us a few details and we&apos;ll suggest the best available size for you.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close size recommendation"
            autoFocus
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-mist transition-colors hover:bg-white/5 hover:text-foam"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          {phase === "loading" ? (
            /* loading — honest, no fake progress */
            <div className="flex flex-col items-center py-14 text-center" aria-live="polite">
              <span className="relative grid h-16 w-16 place-items-center">
                <span className="absolute inset-0 rounded-full border border-soft/25" />
                <Loader2 className="h-7 w-7 animate-spin text-soft" strokeWidth={1.4} />
              </span>
              <p className="font-display mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-ice">
                Finding your best available size…
              </p>
              <p className="mt-2 text-xs text-mist/70">This usually takes a few seconds.</p>
            </div>
          ) : phase === "result" && result ? (
            /* result */
            <div aria-live="polite">
              <div className="text-center">
                <p className="label label--bright flex items-center justify-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />
                  Your Recommended Size
                </p>
                <p className="font-display mt-4 text-6xl font-bold tracking-tight text-foam" aria-label={`Recommended size ${result.recommendedSize}`}>
                  {result.recommendedSize}
                </p>
                <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-mist">
                  {result.reason ||
                    `Based on the information you provided, ${result.recommendedSize} is the recommended size for this product.`}
                </p>
              </div>

              <button type="button" onClick={handleSelect} className="btn btn-solid mt-8 w-full">
                <Check className="h-4 w-4" strokeWidth={2} />
                Select {result.recommendedSize}
              </button>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[0.7rem] text-mist/60">
                <span className="rounded-full border border-line-soft px-2.5 py-1 capitalize">
                  {result.confidence} confidence
                </span>
                <span className="rounded-full border border-line-soft px-2.5 py-1">
                  {result.source === "ai" ? "Good match based on your details" : "Quick estimate"}
                </span>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={reset} className="btn btn-line flex-1 !px-4 !py-3">
                  Recalculate
                </button>
                <button type="button" onClick={onClose} className="btn btn-line flex-1 !px-4 !py-3">
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* form */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="space-y-5"
            >
              <p className="sr-only">Product: {productName}. Available sizes: {availableSizes.join(", ")}.</p>

              {/* age */}
              <label className="block">
                <span className="label">Age *</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={AGE_MIN}
                  max={AGE_MAX}
                  step={1}
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                  className={`field mt-2 ${error ? "border-accent/60" : ""}`}
                />
              </label>

              {/* height */}
              <fieldset>
                <div className="flex items-center justify-between">
                  <legend className="label">Height *</legend>
                  <div className="flex gap-1" role="group" aria-label="Height unit">
                    <button type="button" aria-pressed={heightUnit === "cm"} onClick={() => setHeightUnit("cm")} className={unitBtn(heightUnit === "cm")}>cm</button>
                    <button type="button" aria-pressed={heightUnit === "ft"} onClick={() => setHeightUnit("ft")} className={unitBtn(heightUnit === "ft")}>ft/in</button>
                  </div>
                </div>
                {heightUnit === "cm" ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={HEIGHT_CM_MIN}
                    max={HEIGHT_CM_MAX}
                    step="0.5"
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder={`e.g. 170`}
                    aria-label="Height in centimeters"
                    className={`field mt-2 ${error ? "border-accent/60" : ""}`}
                  />
                ) : (
                  <div className="mt-2 flex gap-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={3}
                      max={7}
                      step={1}
                      required
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      placeholder="ft"
                      aria-label="Height, feet"
                      className={`field ${error ? "border-accent/60" : ""}`}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={11}
                      step={0.5}
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      placeholder="in"
                      aria-label="Height, inches"
                      className={`field ${error ? "border-accent/60" : ""}`}
                    />
                  </div>
                )}
              </fieldset>

              {/* weight */}
              <fieldset>
                <div className="flex items-center justify-between">
                  <legend className="label">Weight *</legend>
                  <div className="flex gap-1" role="group" aria-label="Weight unit">
                    <button type="button" aria-pressed={weightUnit === "kg"} onClick={() => setWeightUnit("kg")} className={unitBtn(weightUnit === "kg")}>kg</button>
                    <button type="button" aria-pressed={weightUnit === "lb"} onClick={() => setWeightUnit("lb")} className={unitBtn(weightUnit === "lb")}>lb</button>
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min={weightUnit === "kg" ? WEIGHT_KG_MIN : Math.round(WEIGHT_KG_MIN / lbToKg(1))}
                  max={weightUnit === "kg" ? WEIGHT_KG_MAX : Math.round(WEIGHT_KG_MAX / lbToKg(1))}
                  step="0.5"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={weightUnit === "kg" ? "e.g. 68" : "e.g. 150"}
                  aria-label={`Weight in ${weightUnit === "kg" ? "kilograms" : "pounds"}`}
                  className={`field mt-2 ${error ? "border-accent/60" : ""}`}
                />
              </fieldset>

              {/* body type */}
              <fieldset>
                <legend className="label">Body type *</legend>
                <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Body type">
                  {BODY_TYPES.map((bt) => {
                    const active = bodyType === bt;
                    return (
                      <button
                        key={bt}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setBodyType(bt)}
                        className={`flex min-h-11 items-center justify-center rounded-xl border px-3 py-2.5 text-sm transition-all duration-300 ${
                          active
                            ? "border-soft/70 bg-soft/10 text-ice"
                            : "border-line text-mist hover:border-soft/40 hover:text-foam"
                        }`}
                      >
                        {bt}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[0.7rem] text-mist/60">
                  Choose the option that feels closest to your usual build.
                </p>
              </fieldset>

              {error && (
                <p role="alert" className="flex items-start gap-2 text-sm text-accent/90">
                  <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-accent/50 text-xs">
                    !
                  </span>
                  {error}
                </p>
              )}
              {notice && !error && (
                <p className="rounded-xl border border-line-soft bg-white/[0.03] p-3 text-xs leading-relaxed text-mist/85">
                  {notice}
                </p>
              )}

              <button type="submit" disabled={!canSubmit} className="btn btn-solid w-full">
                <Ruler className="h-4 w-4" strokeWidth={1.6} />
                Find My Size
              </button>

              {/* quiet disclaimer */}
              <p className="text-[0.68rem] leading-relaxed text-mist/50">{DISCLAIMER}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(panel, document.body) : null;
}
