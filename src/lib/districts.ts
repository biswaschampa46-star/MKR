/* All 64 districts of Bangladesh (single-select source for checkout).
   Canonical spellings use the official names (Chattogram, Cumilla, Bogura,
   Barishal, Jashore, Chapainawabganj). */

export const BD_DISTRICTS: readonly string[] = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokati",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
];

/** Case-insensitive lookup so saved addresses / legacy values still resolve. */
export function normalizeDistrict(raw: string): string | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return null;
  return BD_DISTRICTS.find((d) => d.toLowerCase() === needle) ?? null;
}

/** Pull a known district out of a free-form saved value like "Khulshi, Chattogram". */
export function extractDistrict(raw: string): string | null {
  if (!raw) return null;
  const direct = normalizeDistrict(raw);
  if (direct) return direct;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const hit = normalizeDistrict(parts[i]);
    if (hit) return hit;
  }
  const lowered = raw.toLowerCase();
  const contains = BD_DISTRICTS.find((d) => lowered.includes(d.toLowerCase()));
  return contains ?? null;
}
