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
    label: "Products",
    hint: "You sell items customers can browse and enquire about.",
  },
  {
    value: "appointment",
    label: "Services / Appointments",
    hint: "Customers book time with you or your staff for a service.",
  },
  {
    value: "custom",
    label: "Customised service / product",
    hint: "You make bespoke work and quote per project.",
  },
];

/** What a business can fulfil, beyond product/appointment/custom — feeds the Smart Lead
 * Engine's order-type/delivery-capability matching (also reused as the requirement side's
 * "what do you need" intent options, so there's one taxonomy, not two). */
export const ORDER_TYPES = [
  "Retail",
  "Bulk Orders",
  "Events",
  "Corporate Orders",
  "Subscription",
  "Made To Order",
  "Emergency / Same Day",
  "Online Orders",
  "Walk-ins",
  "Appointments Only",
];

/** What a customer's requirement actually wants — drives hard exclusions in the matching
 * engine (e.g. Repair requires a real repair service; Book/Hire/Consultation require the
 * business to take appointments), not just a label. Values must match the matching SQL
 * function's exact intent strings. */
export const INTENTS = [
  { value: "buy", label: "Buy a product" },
  { value: "book", label: "Book an appointment" },
  { value: "hire", label: "Hire for an event" },
  { value: "request_quote", label: "Request a quote" },
  { value: "repair", label: "Get something repaired" },
  { value: "consultation", label: "Get a consultation" },
  { value: "custom_order", label: "Custom / bespoke order" },
  { value: "bulk_order", label: "Bulk order" },
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
  { value: "online_service", label: "Online service" },
] as const;

/** How the business should reach the customer (or vice versa) — drives the matching engine's
 * location/service-area branch (§10 of the plan). */
export const DELIVERY_PREFERENCES = [
  { value: "at_my_location", label: "At my location" },
  { value: "pickup", label: "I'll pick it up" },
  { value: "online", label: "Online" },
  { value: "business_location", label: "At the business" },
] as const;

/** Where a service-based business can actually deliver the work — exact strings the matching
 * engine's location gate reads from `businesses.service_locations` (§10 of the Smart Lead
 * Engine plan), not just display labels. */
export const SERVICE_LOCATIONS = [
  { value: "customer_location", label: "At the customer's location" },
  { value: "home_visit", label: "Home visits" },
  { value: "online", label: "Online / remote" },
] as const;

/** Declared label, not a computed distance — there's no lat/long in this project. */
export const SERVICE_RADIUS_OPTIONS = ["Within 5 km", "Within 10 km", "Within 25 km", "City-wide", "State-wide"];

export const PREFERRED_CONTACT_METHODS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "instagram", label: "Instagram" },
] as const;

/** Curated per-category speciality chips (plus a free-typed custom option in the UI) — the one
 * taxonomy shared by business onboarding (what they specialise in) and requirement posting
 * (what the customer is asking for), so speciality matching compares like with like. */
export const SPECIALITY_OPTIONS: Record<string, string[]> = {
  "Bakers & Patisserie": ["Wedding", "Birthday", "Corporate", "Custom Cakes", "Home Bakery", "Eggless"],
  Entertainment: ["Live Music", "DJ", "Anchor / MC", "Magic Show", "Wedding"],
  "Event Planning": ["Wedding", "Birthday", "Corporate", "Luxury"],
  "Fashion & Boutiques": ["Bridal", "Traditional Wear", "Minimalist Fashion", "Custom Tailoring"],
  "Fitness & Wellness": ["Personal Training", "Yoga", "Nutrition Consultation", "Physiotherapy"],
  "Food Stalls": ["Street Food", "Live Counter", "Catering", "Beverages"],
  Gifts: ["Corporate Hampers", "Return Gifts", "Wedding", "Personalised"],
  Handmade: ["Return Gifts", "Corporate Hampers", "Custom Orders", "Eco Friendly"],
  "Home Décor": ["Interior Styling", "Minimalist", "Traditional", "Luxury Gifts", "Eco Friendly"],
  Jewellery: ["Bridal", "Custom Jewellery", "Traditional", "Minimalist"],
  Photography: ["Wedding", "Portrait", "Product Photography", "Pet Portraits", "Corporate"],
  "Salons & Spa": ["Bridal Makeup", "Hair Styling", "Spa & Wellness", "Grooming"],
  "Services & Repair": ["Appliance Repair", "Electronics Repair", "Furniture Repair", "Home Repair"],
};

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
  base: { label: "Base listing", price: 99, introPrice: 49, freeUntil: "30 November" },
  featured_city: { label: "Featured — Custom Location", price: 499 },
  featured_all_india: { label: "Featured — All India", price: 999 },
};

/** Derived from PLANS.base.freeUntil ("30 November") — the free period ends Nov 30 of the current year. */
export const FREE_UNTIL_DATE = new Date(new Date().getFullYear(), 10, 30, 23, 59, 59);

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
