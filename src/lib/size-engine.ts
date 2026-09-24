/**
 * Deterministic size recommendation engine (Phases 14–15).
 *
 * A store sizing HELPER — not a medical or body assessment. Rules are
 * intentionally transparent and conservative: when inputs are ambiguous the
 * engine sizes UP for tops and reports pants waist separately.
 *
 * Units: height cm, weight kg, age years, body type self-reported.
 * Outputs: top sizes S–XXL, optional pants waist (28–35) and leg opening
 * (15–22 in) when the product is pants-eligible.
 *
 * Pure functions only — unit-testable, no DB, no AI. The AI path may explain
 * or refine the wording but the returned size always comes from here unless
 * the admin has disabled the deterministic engine (see settings key below).
 */

export type BodyType = "slim" | "regular" | "fat";
export type TopSize = "S" | "M" | "L" | "XL" | "XXL";

export type SizeInput = {
  age: number;
  heightCm: number;
  weightKg: number;
  bodyType: BodyType;
};

export type PantsInput = {
  waistInches?: number;
  legOpeningInches?: number;
};

export type SizeRecommendation = {
  top: TopSize;
  /** Confidence hint — "low" means inputs sat between sizes. */
  confidence: "high" | "low";
  /** Between-size note, e.g. "between M and L". */
  betweenSizes: TopSize[] | null;
  /** Pants recommendation, present only for pants-eligible products. */
  pants: { waist: number; legOpening: number } | null;
  notes: string[];
};

export const SETTINGS_KEY = "size_recommendation";
export type SizeRecommendationSettings = {
  enabled: boolean;
};

/** BMI = kg / m². Used only as a sanity band with the self-reported body type. */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/**
 * Base top size from weight + height via a simple transparent band table.
 * Height nudges the band: taller frames size up at the band edges.
 */
function baseTopSize(input: SizeInput): { size: TopSize; between: TopSize[] | null } {
  const { weightKg, heightCm } = input;
  // Mid-band weights (kg) — deliberately conservative.
  const bands: { max: number; size: TopSize }[] = [
    { max: 55, size: "S" },
    { max: 65, size: "M" },
    { max: 78, size: "L" },
    { max: 90, size: "XL" },
    { max: Infinity, size: "XXL" },
  ];

  let index = bands.findIndex((band) => weightKg <= band.max);
  if (index < 0) index = bands.length - 1;

  // Between-size detection: within 3kg of a band edge.
  const lowerEdge = index === 0 ? -Infinity : bands[index - 1].max;
  const upperEdge = bands[index].max;
  const nearLower = weightKg - lowerEdge <= 3;
  const nearUpper = upperEdge - weightKg <= 3;
  let between: TopSize[] | null = null;
  if (nearLower && index > 0) between = [bands[index - 1].size, bands[index].size];
  else if (nearUpper && index < bands.length - 1) between = [bands[index].size, bands[index + 1].size];

  // Height adjustment: ≥180cm sizes up once at M/L boundary territory;
  // ≤155cm sizes down once unless already S.
  let size = bands[index].size;
  if (heightCm >= 180 && (size === "M" || size === "L") && !between) {
    size = index + 1 < bands.length ? bands[index + 1].size : size;
  } else if (heightCm <= 155 && size !== "S" && !between) {
    size = bands[Math.max(0, index - 1)].size;
  }

  return { size, between };
}

function applyBodyType(size: TopSize, bodyType: BodyType): TopSize {
  const order: TopSize[] = ["S", "M", "L", "XL", "XXL"];
  let index = order.indexOf(size);
  if (bodyType === "fat") index = Math.min(order.length - 1, index + 1);
  if (bodyType === "slim") index = Math.max(0, index - 1);
  return order[index];
}

/**
 * Pants waist recommendation (inches, 28–35). Derived from the top band so
 * top and bottom stay coherent; explicit customer waist input wins when given.
 */
function recommendWaist(input: SizeInput, top: TopSize): number {
  const waistByTop: Record<TopSize, number> = { S: 28, M: 30, L: 32, XL: 34, XXL: 35 };
  const base = waistByTop[top];
  // bodyType "fat" already pushed the top size up, which lifts the waist band.
  return Math.min(35, Math.max(28, base));
}

/** Leg opening (inches, 15–22) scales gently with height. */
function recommendLegOpening(heightCm: number): number {
  const opening = Math.round(15 + ((heightCm - 150) / (190 - 150)) * (22 - 15));
  return Math.min(22, Math.max(15, opening));
}

/** Main entry — deterministic, no side effects. */
export function recommendSize(
  input: SizeInput,
  options: { pantsEligible: boolean; pants?: PantsInput } = { pantsEligible: false },
): SizeRecommendation {
  const notes: string[] = [];
  const base = baseTopSize(input);
  let top = applyBodyType(base.size, input.bodyType);

  // Body-type shift can collide with the between band; recompute the hint.
  let between = base.between;
  if (base.between && !base.between.includes(top)) {
    notes.push(`Your preferred fit moves the recommendation to ${top}.`);
    between = null;
  }

  if (input.bodyType === "fat") notes.push("Relaxed through the chest and waist for a comfortable regular fit.");
  if (input.bodyType === "slim") notes.push("Trimmed suggestion for a closer fit.");

  let pants: SizeRecommendation["pants"] = null;
  if (options.pantsEligible) {
    const waist = options.pants?.waistInches
      ? Math.min(35, Math.max(28, Math.round(options.pants.waistInches)))
      : recommendWaist(input, top);
    const legOpening = options.pants?.legOpeningInches
      ? Math.min(22, Math.max(15, Math.round(options.pants.legOpeningInches)))
      : recommendLegOpening(input.heightCm);
    pants = { waist, legOpening };
    if (!options.pants?.waistInches) notes.push(`Suggested waist: ${waist} inches.`);
    if (!options.pants?.legOpeningInches) notes.push(`Suggested leg opening: ${legOpening} inches.`);
  }

  return {
    top,
    confidence: between ? "low" : "high",
    betweenSizes: between,
    pants,
    notes,
  };
}

/** Products are pants-eligible by category slug or name signal. */
export function isPantsProduct(input: { categoryName?: string | null; name: string }): boolean {
  const haystack = `${input.categoryName ?? ""} ${input.name}`.toLowerCase();
  return /\b(pants|jeans|trousers|denim)\b/.test(haystack);
}
