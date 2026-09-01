/**
 * Category → photo mapping for category cards (homepage + Browse). Keyed by the canonical
 * category name from the `categories` table (same value used everywhere else — search
 * matching, routing params) so this never becomes a second competing category list, just a
 * visual lookup layered on top of the existing one.
 */
export const CATEGORY_IMAGES: Record<string, string> = {
  "Bakers & Patisserie": "/images/categories/bakers-patisserie.jpg",
  Entertainment: "/images/categories/entertainment.jpg",
  "Event Planning": "/images/categories/event-planning.jpg",
  "Fashion & Boutiques": "/images/categories/fashion-boutiques.jpg",
  "Fitness & Wellness": "/images/categories/fitness-wellness.jpg",
  "Food Stalls": "/images/categories/food-stalls.jpg",
  Gifts: "/images/categories/gifts.jpg",
  Handmade: "/images/categories/handmade.jpg",
  "Home Décor": "/images/categories/home-decor.jpg",
  Jewellery: "/images/categories/jewellery.jpg",
  Photography: "/images/categories/photography.jpg",
  "Salons & Spa": "/images/categories/salons-spa.jpg",
  "Services & Repair": "/images/categories/services-repair.jpg",
};

export function categoryImage(name: string): string | null {
  return CATEGORY_IMAGES[name] ?? null;
}
