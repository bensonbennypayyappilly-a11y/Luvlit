import { createServerFn } from "@tanstack/react-start";
import type {
  BusinessDetail,
  CategoryRow,
  CityRow,
  PublicBusiness,
  PublicInfluencer,
  StaffAvailability,
} from "./public.types";

export type BusinessFilters = {
  category?: string;
  city?: string;
  q?: string;
};

export const getCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategoryRow[]> => {
    const { publicClient } = await import("./supabase-public.server");
    const { data, error } = await publicClient()
      .from("categories")
      .select("id,name")
      .eq("is_approved", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as CategoryRow[];
  },
);

export const getCities = createServerFn({ method: "GET" }).handler(
  async (): Promise<CityRow[]> => {
    const { publicClient } = await import("./supabase-public.server");
    const { data, error } = await publicClient()
      .from("cities")
      .select("id,name,state")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as CityRow[];
  },
);

export const getBusinesses = createServerFn({ method: "GET" })
  .inputValidator((input: BusinessFilters) => input ?? {})
  .handler(async ({ data: filters }): Promise<PublicBusiness[]> => {
    const { publicClient } = await import("./supabase-public.server");
    const { data, error } = await publicClient()
      .from("businesses")
      .select(
        "id,name,description,categories,business_types,is_eco_friendly,brand_accent_color,locations(city,state,is_primary),delivery_areas(city,is_pan_india),featured_placements(scope,city,end_date)",
      )
      .eq("is_live", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const today = new Date().toISOString().slice(0, 10);
    const city = filters.city?.trim();
    const q = filters.q?.trim().toLowerCase();

    const rows = ((data ?? []) as unknown as Omit<PublicBusiness, "featured">[]).filter((b) => {
      if (filters.category && !(b.categories ?? []).includes(filters.category)) return false;
      if (q && !`${b.name} ${b.description ?? ""}`.toLowerCase().includes(q)) return false;
      if (city) {
        const inLocation = (b.locations ?? []).some((l) => l.city === city);
        const inDelivery = (b.delivery_areas ?? []).some((d) => d.is_pan_india || d.city === city);
        if (!inLocation && !inDelivery) return false;
      }
      return true;
    });

    return rows
      .map((b) => ({
        ...b,
        featured: (b.featured_placements ?? []).some(
          (f) => f.end_date >= today && (f.scope === "all_india" || (!!city && f.city === city)),
        ),
      }))
      .sort((a, b) => Number(b.featured) - Number(a.featured));
  });

export const getBusinessById = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<BusinessDetail> => {
    const { publicClient } = await import("./supabase-public.server");
    const client = publicClient();
    const { data: business, error } = await client
      .from("businesses")
      .select(
        "*,locations(*),delivery_areas(*),items(*),staff(id,name,specializations,slot_duration_minutes)",
      )
      .eq("id", data.id)
      .eq("is_live", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (business ?? null) as unknown as BusinessDetail;
  });

export const getInfluencers = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { category?: string; city?: string; minFollowers?: number; ratesOnly?: boolean }) =>
      input ?? {},
  )
  .handler(async ({ data: filters }): Promise<PublicInfluencer[]> => {
    const { publicClient } = await import("./supabase-public.server");
    const { data, error } = await publicClient()
      .from("influencer_profiles")
      .select(
        "id,display_name,city,instagram_handle,follower_count,engagement_rate,categories,rate_card,is_verified",
      )
      .eq("approval_status", "approved")
      .order("follower_count", { ascending: false });
    if (error) throw new Error(error.message);

    return ((data ?? []) as unknown as PublicInfluencer[]).filter((i) => {
      if (filters.category && !(i.categories ?? []).includes(filters.category)) return false;
      if (filters.city && i.city !== filters.city) return false;
      if (filters.minFollowers && (i.follower_count ?? 0) < filters.minFollowers) return false;
      if (filters.ratesOnly && !i.rate_card) return false;
      return true;
    });
  });

export const getStaffAvailability = createServerFn({ method: "GET" })
  .inputValidator((input: { businessId: string }) => input)
  .handler(async ({ data }): Promise<StaffAvailability> => {
    const { publicClient } = await import("./supabase-public.server");
    const client = publicClient();
    const { data: staff } = await client
      .from("staff")
      .select("id,name,specializations")
      .eq("business_id", data.businessId);
    const ids = (staff ?? []).map((s) => s.id);
    if (!ids.length) return { staff: [], slots: [] };
    const { data: slots } = await client
      .from("slots")
      .select("id,staff_id,date,start_time,status")
      .in("staff_id", ids)
      .eq("status", "open")
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date")
      .order("start_time")
      .limit(600);
    return {
      staff: (staff ?? []) as StaffAvailability["staff"],
      slots: (slots ?? []) as StaffAvailability["slots"],
    };
  });

/** Public influencer application status lookup by the email/phone used to apply. */
export const getInfluencerApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { contact: string }) => ({ contact: String(input.contact ?? "").trim() }))
  .handler(async ({ data }): Promise<{ found: boolean; status?: string; submitted_at?: string }> => {
    const contact = data.contact.replace(/[,()]/g, "");
    if (!contact || contact.length > 255) return { found: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or(`email.eq.${contact},phone.eq.${contact}`)
      .limit(1);
    const profileId = profiles?.[0]?.id;
    if (!profileId) return { found: false };
    const { data: rows } = await supabaseAdmin
      .from("influencer_profiles")
      .select("approval_status,submitted_at")
      .eq("user_id", profileId)
      .order("submitted_at", { ascending: false })
      .limit(1);
    const row = rows?.[0];
    if (!row) return { found: false };
    return { found: true, status: row.approval_status, submitted_at: row.submitted_at };
  });
