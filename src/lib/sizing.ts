/**
 * "Find My Size" — centralized sizing domain logic.
 *
 * Pure functions only: safe to import from client components, server routes,
 * and the AI layer. All magic numbers live here so UI components stay dumb.
 *
 * The fallback engine is the single source of truth for local estimates; the
 * AI route reuses the same primitives (ordering, validation) so both paths
 * obey the same rule: recommend ONLY a size that is actually available.
 */

/* ------------------------------------------------------------------ */
/*  Eligibility — which variant groups count as clothing sizes         */
/* ------------------------------------------------------------------ */

/**
 * Variant-group names that represent a clothing size selection. "Waist Size"
 * and similar descriptive names count — what matters is that the options are
 * real clothing sizes, not that the label is exactly "Size".
 */
const SIZE_GROUP_NAMES = ["size", "sizes", "waist size", "waist", "shirt size"];

/** True for tokens that look like meaningful clothing sizes (S, M, XL, 40, 42, …). */
export function looksLikeClothingSize(value: string): boolean {
  const t = value.trim().toLowerCase();
  if (!t || t.length > 12) return false;
  // "free size" / "one size" / "os" — a single universal size is meaningful
  if (/^(free size|one size|freesize|os|u|universal)$/.test(t)) return true;
  // alpha sizes incl. multi-word (x l, extra large)
  if (/^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|x l|extra small|small|medium|large|extra large)$/.test(t)) return true;
  // numeric apparel sizes (denim/shirt numbers, halves)
  if (/^\d{2}(\.\d)?$/.test(t)) {
    const n = Number(t);
    return n >= 24 && n <= 60; // typical numeric clothing range
  }
  return false;
}

/**
 * A product is eligible for size recommendation when a variant group whose
 * name clearly represents sizing exists AND most of its options are
 * meaningful clothing sizes (including a single "Free Size" option).
 * Pure color/finish groups (or groups with no real sizes) are never eligible.
 */
export function findSizeGroup(
  variants: { name: string; options: string[] }[] | null | undefined,
): { name: string; options: string[] } | null {
  if (!variants) return null;
  for (const group of variants) {
    if (!group || !group.name || !Array.isArray(group.options)) continue;
    if (!SIZE_GROUP_NAMES.includes(group.name.trim().toLowerCase())) continue;
    const sizes = group.options.filter(Boolean);
    if (sizes.length === 0) continue;
    const meaningful = sizes.filter(looksLikeClothingSize).length;
    if (meaningful / sizes.length >= 0.6) return { name: group.name, options: sizes };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Size ordering — robust against unusual size lists                  */
/* ------------------------------------------------------------------ */

const ALPHA_RANK: Record<string, number> = {
  xxs: 1, xs: 2, s: 3, m: 4, l: 5, xl: 6, xxl: 7, xxxl: 8,
  "2xl": 7, "3xl": 8, "4xl": 9,
  "x s": 2, "x l": 6,
  small: 3, medium: 4, large: 5,
  "extra small": 2, "extra large": 6,
};

/** Rank a size token; numeric apparel sizes (e.g. 38–46) rank by number. */
export function sizeRank(size: string): number {
  const t = size.trim().toLowerCase();
  const numeric = Number(t);
  if (Number.isFinite(numeric) && /^\d+(\.\d)?$/.test(t)) return 100 + numeric;
  return ALPHA_RANK[t] ?? 0;
}

/** Available sizes sorted smallest → largest (stable for unrecognised labels). */
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b));
}

/* ------------------------------------------------------------------ */
/*  Unit normalization                                                 */
/* ------------------------------------------------------------------ */

export const CM_PER_FT = 30.48;
export const CM_PER_IN = 2.54;
export const KG_PER_LB = 0.45359237;

export function feetInchesToCm(feet: number, inches: number): number {
  return feet * CM_PER_FT + inches * CM_PER_IN;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/* ------------------------------------------------------------------ */
/*  Body type (customer-friendly, non-judgmental)                      */
/* ------------------------------------------------------------------ */

export const BODY_TYPES = ["Slim", "Regular", "Broad", "Fuller"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export function isBodyType(v: unknown): v is BodyType {
  return typeof v === "string" && (BODY_TYPES as readonly string[]).includes(v);
}

/** Body-type nudge applied only near a boundary: −1 slim, 0 regular, +1 broad/fuller. */
export function bodyTypeBias(bodyType: BodyType): number {
  switch (bodyType) {
    case "Slim":
      return -1;
    case "Broad":
    case "Fuller":
      return 1;
    default:
      return 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Customer input — normalization + validation (shared both sides)    */
/* ------------------------------------------------------------------ */

export type SizeCustomerInput = {
  age: number;
  heightCm: number;
  weightKg: number;
  bodyType: BodyType;
};

export const AGE_MIN = 10;
export const AGE_MAX = 100;
export const HEIGHT_CM_MIN = 120;
export const HEIGHT_CM_MAX = 220;
export const WEIGHT_KG_MIN = 30;
export const WEIGHT_KG_MAX = 200;

export type NormalizedInput =
  | { ok: true; value: SizeCustomerInput }
  | { ok: false; message: string };

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Validate + clamp raw customer input. `age`/`weightKg` may arrive as strings
 * from the form; height must already be normalized to cm, weight to kg.
 */
export function normalizeCustomerInput(raw: {
  age?: unknown;
  heightCm?: unknown;
  weightKg?: unknown;
  bodyType?: unknown;
}): NormalizedInput {
  const age = Number(raw.age);
  if (!Number.isFinite(age) || !Number.isInteger(age)) {
    return { ok: false, message: "Please enter your age as a whole number." };
  }
  if (age < AGE_MIN || age > AGE_MAX) {
    return { ok: false, message: `Age must be between ${AGE_MIN} and ${AGE_MAX}.` };
  }

  const heightCm = Number(raw.heightCm);
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    return { ok: false, message: "Please enter your height." };
  }
  if (heightCm < HEIGHT_CM_MIN || heightCm > HEIGHT_CM_MAX) {
    return { ok: false, message: `Height must be between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm.` };
  }

  const weightKg = Number(raw.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return { ok: false, message: "Please enter your weight." };
  }
  if (weightKg < WEIGHT_KG_MIN || weightKg > WEIGHT_KG_MAX) {
    return { ok: false, message: `Weight must be between ${WEIGHT_KG_MIN} and ${WEIGHT_KG_MAX} kg.` };
  }

  if (!isBodyType(raw.bodyType)) {
    return { ok: false, message: "Please choose the body type that feels closest to yours." };
  }

  return {
    ok: true,
    value: { age: Math.floor(age), heightCm: Math.round(heightCm), weightKg: Math.round(weightKg), bodyType: raw.bodyType },
  };
}

/* ------------------------------------------------------------------ */
/*  Fallback recommendation engine                                     */
/* ------------------------------------------------------------------ */

/**
 * Rough baseline weight (kg) for the middle of the alpha size ladder,
 * used to anchor the height+weight estimate. These are heuristic anchors,
 * not clinical numbers — the engine only ever produces an estimate and
 * never a guarantee.
 */
const WEIGHT_ANCHORS: [number, number][] = [
  // [alpha rank, baseline weight for a ~170 cm person]
  [2, 50], // XS
  [3, 58], // S
  [4, 68], // M
  [5, 78], // L
  [6, 90], // XL
  [7, 103], // XXL
  [8, 116], // 3XL
];

const BASELINE_HEIGHT = 170;

/**
 * Local, dependency-free estimate.
 *
 * Method (deliberately simple, never presented as precise):
 * 1. Map weight → a fractional position on the size ladder (BMI-free;
 *    weight anchors are adjusted proportionally for height).
 * 2. Height shifts the position slightly (taller → next size sooner).
 * 3. Body type nudges the result only when genuinely near a boundary.
 * 4. Age is intentionally a very low-weight signal (±0.15 max) so it can
 *    never dominate height + weight + build.
 * 5. Clamp hard to the product's actual available sizes.
 *
 * Always resolves; single-size products return that size immediately.
 */
export function recommendSize(input: SizeCustomerInput & { availableSizes: string[] }): string | null {
  const available = sortSizes(input.availableSizes.map((s) => (s ?? "").trim()).filter(Boolean));
  if (available.length === 0) return null;
  // Single size (or Free Size / One Size): there is nothing to choose.
  if (available.length === 1) return available[0];

  const ranks = available.map(sizeRank);
  const minRank = Math.min(...ranks);

  // Body-type bias near boundaries only; age is a very low-weight signal.
  const bias = bodyTypeBias(input.bodyType) * 0.45;
  const ageNudge = input.age >= 45 ? 0.15 : input.age <= 18 ? -0.15 : 0;

  // Fractional position (in size steps) above the smallest available size.
  let pos: number;
  const numeric = available.every((s) => sizeRank(s) > 100);
  if (numeric) {
    // Numeric apparel sizes (38/40/42…): estimate chest cm from weight +
    // height, then convert to a size number (chest ≈ size + 49).
    const chestEst = 0.5 * input.weightKg + (input.heightCm - BASELINE_HEIGHT) * 0.3 + 55;
    const estSize = chestEst - 49;
    pos = estSize - (minRank - 100) + bias * 1.1 + ageNudge;
  } else {
    // Alpha sizes: interpolate the weight-anchor ladder (~11 kg per rank),
    // adjusted ~±0.79 kg per cm of height off the 170 cm baseline.
    const slope = 11;
    const heightAdjKg = (input.heightCm - BASELINE_HEIGHT) * (slope / 14);
    const rWeight = 2 + (input.weightKg - WEIGHT_ANCHORS[0][1] - heightAdjKg) / slope;
    pos = rWeight - minRank + bias + ageNudge;
  }

  // Fractional position → nearest rank on the available ladder.
  const target = minRank + pos;
  let bestIdx = 0;
  let bestDist = Infinity;
  ranks.forEach((r, i) => {
    const d = Math.abs(r - target);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  });

  return available[bestIdx];
}
