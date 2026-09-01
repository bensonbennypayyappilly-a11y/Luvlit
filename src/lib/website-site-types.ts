import type { Section } from "./website-sections";

/**
 * The full shape a business's public site is rendered from — shared by the section renderer,
 * site chrome, every page route, and the website builder's live preview, so all of them agree
 * on exactly one contract. `business-profile-preview.tsx` re-exports this as `ProfileBusiness`
 * for its existing callers.
 */
export type SiteBusiness = {
  id: string;
  name: string;
  description: string | null;
  categories: string[];
  business_types: string[];
  instagram_url: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  hero_image_url: string | null;
  about_image_url: string | null;
  about_text: string | null;
  logo_url: string | null;
  gallery_urls: string[];
  main_video_url: string | null;
  short_video_urls: string[];
  brand_accent_color: string | null;
  brand_secondary_color: string | null;
  button_style: string | null;
  background_color: string | null;
  custom_domain: string | null;
  is_eco_friendly: boolean;
  operating_hours: { start: string; end: string; days: number[] } | null;
  sections: Section[];
  template: string | null;
  review_count: number;
  review_avg: number | null;
  reviews: { id: string; rating: number; comment: string | null; created_at: string }[];
  owner_email_verified: boolean;
  locations: { id: string; address: string | null; city: string; state: string | null; is_primary: boolean }[];
  delivery_areas: { id: string; city: string | null; is_pan_india: boolean }[];
  items: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    image_url: string | null;
    category: string | null;
    is_active: boolean;
  }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    duration_minutes: number;
    category: string | null;
    image_url: string | null;
    is_active: boolean;
  }[];
  staff: { id: string; name: string; specializations: string[]; slot_duration_minutes: number }[];
};
