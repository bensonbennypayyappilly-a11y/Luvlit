export type CategoryRow = { id: string; name: string };

export type CityRow = { id: string; name: string; state: string | null };

export type OperatingHours = { start: string; end: string; days: number[] } | null;

export type PublicBusiness = {
  id: string;
  name: string;
  description: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  categories: string[];
  business_types: string[];
  is_eco_friendly: boolean;
  brand_accent_color: string | null;
  locations: { city: string; state: string | null; is_primary: boolean }[];
  delivery_areas: { city: string | null; is_pan_india: boolean }[];
  featured_placements: { scope: string; city: string | null; end_date: string }[];
  featured: boolean;
};

export type BusinessLocation = {
  id: string;
  address: string | null;
  city: string;
  state: string | null;
  is_primary: boolean;
};

export type BusinessItem = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
};

export type BusinessService = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
};

export type BusinessDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categories: string[];
  business_types: string[];
  instagram_url: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  gallery_urls: string[];
  main_video_url: string | null;
  short_video_urls: string[];
  brand_accent_color: string | null;
  brand_secondary_color: string | null;
  button_style: string | null;
  is_eco_friendly: boolean;
  view_count: number;
  operating_hours: OperatingHours;
  sections: import("./website-sections").Section[];
  template: string | null;
  review_count: number;
  review_avg: number | null;
  reviews: { id: string; rating: number; comment: string | null; created_at: string }[];
  owner_email_verified: boolean;
  locations: BusinessLocation[];
  delivery_areas: { id: string; city: string | null; is_pan_india: boolean }[];
  items: BusinessItem[];
  services: BusinessService[];
  staff: { id: string; name: string; specializations: string[]; slot_duration_minutes: number }[];
} | null;

export type PublicInfluencer = {
  id: string;
  display_name: string;
  city: string | null;
  instagram_handle: string;
  follower_count: number | null;
  engagement_rate: number | null;
  categories: string[];
  rate_card: Record<string, string | number | null> | null;
  is_verified: boolean;
};

export type StaffAvailability = {
  staff: { id: string; name: string; specializations: string[] }[];
  services: { id: string; name: string; duration_minutes: number; price: number | null }[];
  slots: {
    id: string;
    staff_id: string;
    date: string;
    start_time: string;
    status: string;
    capacity: number;
    booked_count: number;
  }[];
};

export type PublicOrganizer = {
  id: string;
  name: string;
  city: string | null;
  events: PublicEvent[];
} | null;

export type PublicEvent = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  city: string | null;
  address: string | null;
  start_date: string;
  end_date: string | null;
  image_urls: string[];
  is_featured: boolean;
  latitude: number | null;
  longitude: number | null;
};
