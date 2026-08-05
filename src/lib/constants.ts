/** Fallback list — the live list lives in the `cities` table and is editable without a deploy. */
export const CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Kochi",
  "Thiruvananthapuram",
  "Kozhikode",
  "Surat",
  "Indore",
  "Nagpur",
  "Bhopal",
  "Patna",
  "Chandigarh",
  "Coimbatore",
  "Visakhapatnam",
  "Guwahati",
  "Bhubaneswar",
  "Ranchi",
  "Raipur",
  "Dehradun",
  "Amritsar",
  "Vadodara",
  "Nashik",
  "Mysuru",
  "Goa",
];

export const BUSINESS_TYPES = [
  {
    value: "product",
    label: "Product / catalog",
    hint: "You sell items customers can browse and enquire about.",
  },
  {
    value: "appointment",
    label: "Appointment-based",
    hint: "Customers book time with you or your staff.",
  },
  {
    value: "custom",
    label: "Custom order / portfolio",
    hint: "You make bespoke work and quote per project.",
  },
];

/** Categories where a sustainability question is meaningful. */
export const ECO_CATEGORIES = ["Home Décor", "Handmade", "Fashion & Boutiques"];

/** Curated accent colours, all pre-tested against the light warm-grey base. */
export const ACCENT_COLORS = [
  { name: "Charcoal", value: "#1C1917" },
  { name: "Graphite", value: "#44403C" },
  { name: "Stone", value: "#78716C" },
  { name: "Forest", value: "#20463A" },
  { name: "Ink blue", value: "#26384F" },
  { name: "Plum", value: "#5A3350" },
  { name: "Terracotta", value: "#9C5B44" },
  { name: "Bronze", value: "#8A7461" },
];

export const PLANS = {
  base: { label: "Base listing", price: 199, introPrice: 20, freeUntil: "30 November" },
  featured_city: { label: "Featured — Custom Location", price: 499 },
  featured_all_india: { label: "Featured — All India", price: 999 },
};

/** Featured slots available per category + location combination. */
export const FEATURED_CAP = 3;

/** Featured event placement pricing (stored, not charged — billing isn't wired up yet). */
export const EVENT_FEATURED_PRICING = { week: 100, month: 300 };

export const EVENT_CATEGORIES = [
  "Flea market",
  "Pop-up shop",
  "Craft fair",
  "Food festival",
  "Exhibition",
  "Workshop",
  "Music & culture",
  "Other",
];

/** Days of the week used by staff working-hours editing. */
export const WEEKDAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

/** Max images in a business's standalone photo gallery. */
export const GALLERY_MAX = 6;
