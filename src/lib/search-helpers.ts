import type { OperatingHours } from "@/lib/public.types";

/**
 * Rules-based keyword expansion, category name -> phrases a customer might actually type.
 * This is a plain lookup table, not semantic/AI matching — "wedding photographer" matches
 * Photography because "photographer" is listed here, not because anything infers meaning.
 * Scoped to the categories that exist in this marketplace today; extend this list by hand
 * if a new category is added and deserves search synonyms.
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Salons & Spa": ["salon", "spa", "haircut", "hair", "massage", "facial", "grooming", "barber", "makeup", "beauty"],
  "Home Décor": ["home decor", "décor", "decor", "interior", "furnishing", "curtains", "decoration", "furniture"],
  "Bakers & Patisserie": ["bakery", "baker", "cake", "birthday cake", "pastries", "patisserie", "dessert", "cupcake"],
  "Fashion & Boutiques": ["fashion", "boutique", "clothing", "tailor", "tailoring", "dress", "apparel", "stitching"],
  Photography: ["photographer", "photography", "photo", "photoshoot", "shoot", "videographer", "videography"],
  "Fitness & Wellness": ["fitness", "gym", "wellness", "yoga", "trainer", "workout", "nutrition"],
  Jewellery: ["jewellery", "jewelry", "gold", "silver", "ornaments", "jeweller"],
  "Event Planning": ["event", "wedding planner", "party planning", "decorator", "mandap", "event management"],
  Handmade: ["handmade", "handcrafted", "artisan", "craft", "crafts"],
  Gifts: ["gift", "gifting", "hamper", "present"],
  Entertainment: ["entertainment", "dj", "music", "band", "performer", "magician"],
  "Food Stalls": ["food stall", "street food", "chaat", "snacks", "food truck"],
  "Services & Repair": [
    "repair",
    "service",
    "plumber",
    "electrician",
    "mechanic",
    "ac repair",
    "appliance repair",
    "home cleaning",
    "cleaning",
  ],
};

/** Category names whose keyword list overlaps the query — used to also match businesses by intent, not just literal name/description text. */
export function matchCategoriesForQuery(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => q.includes(k) || k.includes(q)))
    .map(([name]) => name);
}

/** Pure, client-computed "is this business open right now" check — no cron, no server state. */
export function isOpenNow(hours: OperatingHours, now: Date = new Date()): boolean | null {
  if (!hours || !hours.start || !hours.end || !hours.days?.length) return null;
  const [startH, startM] = hours.start.split(":").map(Number);
  const [endH, endM] = hours.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();

  if (startMinutes <= endMinutes) {
    // Same-day hours, e.g. 09:00-18:00.
    return hours.days.includes(today) && minutesNow >= startMinutes && minutesNow < endMinutes;
  }

  // Overnight hours, e.g. 20:00-02:00: open from `start` until midnight on a listed day,
  // and still open from midnight until `end` on the following calendar day (even if that
  // following day isn't itself in `days` — the shift started the day before).
  const yesterday = (today + 6) % 7;
  const openSinceToday = hours.days.includes(today) && minutesNow >= startMinutes;
  const openSinceYesterday = hours.days.includes(yesterday) && minutesNow < endMinutes;
  return openSinceToday || openSinceYesterday;
}
