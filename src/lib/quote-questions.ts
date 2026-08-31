/** Phase 5 — a small curated set of category-specific questions for the quote-request form.
 * One generic form component renders whichever list applies (or none); this is deliberately
 * not a bespoke form per category, just 1-2 extra fields where they clearly help a business
 * quote accurately. Categories with nothing genuinely category-specific to ask are omitted —
 * their requirement stays fully described by the generic description field. */
export type QuoteQuestion = { key: string; label: string; type: "date" | "number" | "text"; placeholder?: string };

export const CATEGORY_QUESTIONS: Record<string, QuoteQuestion[]> = {
  Photography: [
    { key: "event_date", label: "Event date", type: "date" },
    { key: "event_type", label: "Type of shoot", type: "text", placeholder: "Wedding, birthday, portrait…" },
  ],
  "Bakers & Patisserie": [
    { key: "needed_by", label: "Needed by", type: "date" },
    { key: "serves", label: "Serves how many", type: "number" },
  ],
  "Event Planning": [
    { key: "event_date", label: "Event date", type: "date" },
    { key: "guest_count", label: "Guest count", type: "number" },
  ],
  "Salons & Spa": [{ key: "preferred_date", label: "Preferred date", type: "date" }],
  "Fashion & Boutiques": [{ key: "occasion", label: "Occasion", type: "text" }],
  "Fitness & Wellness": [
    { key: "goal", label: "Your goal", type: "text", placeholder: "Weight loss, strength, rehab…" },
  ],
  Jewellery: [{ key: "occasion", label: "Occasion", type: "text" }],
  Entertainment: [{ key: "event_date", label: "Event date", type: "date" }],
  "Food Stalls": [
    { key: "event_date", label: "Event date", type: "date" },
    { key: "guest_count", label: "Guest count", type: "number" },
  ],
  "Services & Repair": [{ key: "preferred_date", label: "Preferred date", type: "date" }],
};
