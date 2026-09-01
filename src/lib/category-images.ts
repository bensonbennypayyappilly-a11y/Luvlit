/**
 * Category → photo mapping for category cards (homepage + Browse). Keyed by the canonical
 * category name from the `categories` table (same value used everywhere else — search
 * matching, routing params) so this never becomes a second competing category list, just a
 * visual lookup layered on top of the existing one.
 */
export const CATEGORY_IMAGES: Record<string, string> = {
  "Bakers & Patisserie": "/images/categories/bakers-patisserie.webp",
  Entertainment: "/images/categories/entertainment.webp",
  "Event Planning": "/images/categories/event-planning.webp",
  "Fashion & Boutiques": "/images/categories/fashion-boutiques.webp",
  "Fitness & Wellness": "/images/categories/fitness-wellness.webp",
  "Food Stalls": "/images/categories/food-stalls.webp",
  Gifts: "/images/categories/gifts.webp",
  Handmade: "/images/categories/handmade.webp",
  "Home Décor": "/images/categories/home-decor.webp",
  Jewellery: "/images/categories/jewellery.webp",
  Photography: "/images/categories/photography.webp",
  "Salons & Spa": "/images/categories/salons-spa.webp",
  "Services & Repair": "/images/categories/services-repair.webp",
};

export function categoryImage(name: string): string | null {
  return CATEGORY_IMAGES[name] ?? null;
}
