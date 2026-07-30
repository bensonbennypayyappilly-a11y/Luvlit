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

/** Curated accent colours, all pre-tested against the ivory base. */
export const ACCENT_COLORS = [
  { name: "Forest", value: "#173D2E" },
  { name: "Antique gold", value: "#B8935F" },
  { name: "Terracotta", value: "#9C5B44" },
  { name: "Ink blue", value: "#26384F" },
  { name: "Plum", value: "#5A3350" },
  { name: "Olive", value: "#5E6440" },
  { name: "Clay", value: "#8A7461" },
  { name: "Slate", value: "#3F4A48" },
];

export const PLANS = {
  base: { label: "Base listing", price: 199, introPrice: 20, freeUntil: "30 November" },
  featured_city: { label: "Featured — Custom Location", price: 499 },
  featured_all_india: { label: "Featured — All India", price: 999 },
};

/** Featured slots available per category + location combination. */
export const FEATURED_CAP = 3;
