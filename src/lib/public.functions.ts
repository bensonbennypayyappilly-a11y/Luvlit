import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { istDateString } from "@/lib/utils";
import { isOpenNow, matchCategoriesForQuery } from "@/lib/search-helpers";
import type {
  BusinessDetail,
  CategoryRow,
  CityRow,
  OperatingHours,
  PublicBusiness,
  PublicEvent,
  PublicInfluencer,
  PublicOrganizer,
  StaffAvailability,
} from "./public.types";

const BUSINESS_DETAIL_SELECT =
  "*,locations(*),delivery_areas(*),items(*),services(*),staff(id,name,specializations,slot_duration_minutes),reviews(id,rating,comment,created_at)";

/**
 * Resolves private-bucket storage paths on a fetched business row to signed URLs.
 *
 * Signing runs on the service-role admin client, not the RLS-respecting `publicClient` the row
 * itself was fetched with: the storage bucket's anon/authenticated "is_live" read policy doesn't
 * actually grant non-owner requests access in practice (a Storage-side quirk with the project's
 * publishable-key auth, confirmed by directly comparing signed anon vs. authenticated-owner
 * requests against the same object — anon always 404s, owner always succeeds). The row query
 * above already filters `is_live = true`, so by the time we're signing paths we've independently
 * confirmed this business is meant to be public; admin-signing here only removes a broken gate,
 * it doesn't widen who *should* see this data.
 */
async function resolveBusinessMedia(
  business: Record<string, unknown> | null,
): Promise<BusinessDetail> {
  if (!business) return null;

  const isPath = (v: unknown): v is string => typeof v === "string" && v.length > 0 && !/^https?:\/\//i.test(v);
  const b = business;
  const paths: string[] = [];
  if (isPath(b.hero_image_url)) paths.push(b.hero_image_url);
  if (isPath(b.about_image_url)) paths.push(b.about_image_url);
  if (isPath(b.logo_url)) paths.push(b.logo_url);
  if (isPath(b.main_video_url)) paths.push(b.main_video_url);
  const shorts = Array.isArray(b.short_video_urls) ? (b.short_video_urls as string[]) : [];
  for (const s of shorts) if (isPath(s)) paths.push(s);
  const gallery = Array.isArray(b.gallery_urls) ? (b.gallery_urls as string[]) : [];
  for (const g of gallery) if (isPath(g)) paths.push(g);
  const items = Array.isArray(b.items) ? (b.items as Record<string, unknown>[]) : [];
  for (const item of items) {
    if (isPath(item.image_url)) paths.push(item.image_url as string);
    const itemGallery = Array.isArray(item.image_urls) ? (item.image_urls as string[]) : [];
    for (const g of itemGallery) if (isPath(g)) paths.push(g);
  }
  const services = Array.isArray(b.services) ? (b.services as Record<string, unknown>[]) : [];
  for (const service of services) {
    if (isPath(service.image_url)) paths.push(service.image_url as string);
  }

  if (paths.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("business-media")
      .createSignedUrls(Array.from(new Set(paths)), 60 * 60 * 24 * 7);
    if (signedError) throw new Error(signedError.message);
    const map = new Map<string, string>();
    (signed ?? []).forEach((s) => {
      if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
    });
    if (isPath(b.hero_image_url)) b.hero_image_url = map.get(b.hero_image_url) ?? b.hero_image_url;
    if (isPath(b.about_image_url)) b.about_image_url = map.get(b.about_image_url) ?? b.about_image_url;
    if (isPath(b.logo_url)) b.logo_url = map.get(b.logo_url) ?? b.logo_url;
    if (isPath(b.main_video_url)) b.main_video_url = map.get(b.main_video_url) ?? b.main_video_url;
    if (shorts.length) b.short_video_urls = shorts.map((s) => (isPath(s) ? map.get(s) ?? s : s));
    if (gallery.length) b.gallery_urls = gallery.map((g) => (isPath(g) ? map.get(g) ?? g : g));
    for (const item of items) {
      if (isPath(item.image_url)) item.image_url = map.get(item.image_url as string) ?? item.image_url;
      const itemGallery = Array.isArray(item.image_urls) ? (item.image_urls as string[]) : [];
      if (itemGallery.length) item.image_urls = itemGallery.map((g) => (isPath(g) ? map.get(g) ?? g : g));
    }
    for (const service of services) {
      if (isPath(service.image_url)) service.image_url = map.get(service.image_url as string) ?? service.image_url;
    }
  }

  return b as unknown as BusinessDetail;
}

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
  .validator((input: BusinessFilters) => input ?? {})
  .handler(async ({ data: filters }): Promise<PublicBusiness[]> => {
    const { publicClient } = await import("./supabase-public.server");
    const { data, error } = await publicClient()
      .from("businesses")
      .select(
        "id,name,description,hero_image_url,logo_url,categories,business_types,is_eco_friendly,brand_accent_color,locations(city,state,is_primary),delivery_areas(city,is_pan_india),featured_placements(scope,city,end_date)",
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

    // Thumbnails live in a private bucket as object paths; resolve them to signed URLs.
    const isPath = (v: unknown): v is string =>
      typeof v === "string" && v.length > 0 && !/^https?:\/\//i.test(v);
    const thumbPaths = [
      ...rows.map((b) => b.hero_image_url),
      ...rows.map((b) => b.logo_url),
    ].filter(isPath);
    const signedMap = new Map<string, string>();
    if (thumbPaths.length) {
      // See resolveBusinessMedia's comment: signing needs the service-role client, not the
      // RLS-respecting one the rows were fetched with — the anon storage read policy doesn't
      // actually grant non-owner requests access in practice.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed, error: signedError } = await supabaseAdmin.storage
        .from("business-media")
        .createSignedUrls(Array.from(new Set(thumbPaths)), 60 * 60 * 24 * 7);
      if (signedError) throw new Error(signedError.message);
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
      });
    }
    const resolve = (v: string | null | undefined) =>
      isPath(v) ? signedMap.get(v) ?? null : v ?? null;

    return rows
      .map((b) => ({
        ...b,
        hero_image_url: resolve(b.hero_image_url),
        logo_url: resolve(b.logo_url),
        featured: (b.featured_placements ?? []).some(
          (f) => f.end_date >= today && (f.scope === "all_india" || (!!city && f.city === city)),
        ),
      }))
      .sort((a, b) => Number(b.featured) - Number(a.featured));
  });

export type BrowseFilters = {
  category?: string;
  city?: string;
  q?: string;
  openNow?: boolean;
  page?: number;
  pageSize?: number;
};

export type BrowseResultBusiness = Omit<PublicBusiness, "featured"> & {
  featured: boolean;
  operating_hours: OperatingHours;
  review_count: number;
  review_avg: number | null;
  owner_email_verified: boolean;
};

export type BrowseResultsResponse = { businesses: BrowseResultBusiness[]; total: number };

const BROWSE_SELECT =
  "id,name,description,hero_image_url,logo_url,categories,business_types,is_eco_friendly,brand_accent_color,operating_hours,review_count,review_avg,owner_email_verified,locations(city,state,is_primary),delivery_areas(city,is_pan_india),featured_placements(scope,city,end_date)";

/**
 * Real server-side filtering + pagination for /browse and /browse/$category — kept separate
 * from getBusinesses (used only by the frozen homepage) rather than extending it, since this
 * needs pagination and getBusinesses must never change what the homepage receives.
 */
export const getBrowseResults = createServerFn({ method: "GET" })
  .validator((input: BrowseFilters) => input ?? {})
  .handler(async ({ data: filters }): Promise<BrowseResultsResponse> => {
    const { publicClient } = await import("./supabase-public.server");
    const client = publicClient();
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 24;
    const city = filters.city?.trim();
    const q = filters.q?.trim();

    // City: PostgREST can't OR across two related (locations/delivery_areas) tables in one
    // embedded filter, so this is a deliberate two-query id lookup, unioned in JS.
    let cityIds: string[] | null = null;
    if (city) {
      const [{ data: locMatches }, { data: deliveryMatches }] = await Promise.all([
        client.from("locations").select("business_id").eq("city", city),
        client.from("delivery_areas").select("business_id").or(`city.eq.${city},is_pan_india.eq.true`),
      ]);
      const ids = new Set<string>();
      (locMatches ?? []).forEach((r) => r.business_id && ids.add(r.business_id));
      (deliveryMatches ?? []).forEach((r) => r.business_id && ids.add(r.business_id));
      cityIds = Array.from(ids);
      if (cityIds.length === 0) return { businesses: [], total: 0 };
    }

    // Text query: name/description ilike, plus a rules-based keyword -> category expansion
    // (matchCategoriesForQuery) so e.g. "haircut" also matches businesses categorised as
    // Salons & Spa even if that word never appears in their name/description. Category-overlap
    // is a separate query (unioned by id) rather than one hand-built .or() string, since
    // category names contain spaces/punctuation that's fragile to interpolate into a raw
    // PostgREST array-literal filter.
    let qIds: string[] | null = null;
    if (q) {
      const relatedCategories = matchCategoriesForQuery(q);
      const textQuery = client
        .from("businesses")
        .select("id")
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      const categoryQuery = relatedCategories.length
        ? client.from("businesses").select("id").overlaps("categories", relatedCategories)
        : null;
      const [{ data: textMatches }, categoryResult] = await Promise.all([
        textQuery,
        categoryQuery ?? Promise.resolve({ data: [] as { id: string }[] }),
      ]);
      const ids = new Set<string>();
      (textMatches ?? []).forEach((r) => ids.add(r.id));
      (categoryResult.data ?? []).forEach((r) => ids.add(r.id));
      qIds = Array.from(ids);
      if (qIds.length === 0) return { businesses: [], total: 0 };
    }

    // "Open now" can't be expressed as a simple SQL WHERE (day-of-week + overnight-shift
    // handling), so it's a narrowing id-lookup: fetch operating_hours for everything else that
    // already matches, filter with the same isOpenNow() used client-side, then constrain the
    // final paginated query to that id set.
    let openNowIds: string[] | null = null;
    if (filters.openNow) {
      let hoursQuery = client
        .from("businesses")
        .select("id,operating_hours")
        .eq("status", "live")
        .not("operating_hours", "is", null);
      if (cityIds) hoursQuery = hoursQuery.in("id", cityIds);
      if (qIds) hoursQuery = hoursQuery.in("id", qIds);
      if (filters.category) hoursQuery = hoursQuery.contains("categories", [filters.category]);
      const { data: hoursRows } = await hoursQuery;
      openNowIds = (hoursRows ?? [])
        .filter((r) => isOpenNow(r.operating_hours as OperatingHours))
        .map((r) => r.id);
      if (openNowIds.length === 0) return { businesses: [], total: 0 };
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = client
      .from("businesses")
      .select(BROWSE_SELECT, { count: "exact" })
      .eq("status", "live");
    if (cityIds) query = query.in("id", cityIds);
    if (qIds) query = query.in("id", qIds);
    if (openNowIds) query = query.in("id", openNowIds);
    if (filters.category) query = query.contains("categories", [filters.category]);
    query = query
      .order("review_avg", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    const today = istDateString();
    const rows = (data ?? []) as unknown as (Omit<PublicBusiness, "featured"> & {
      operating_hours: OperatingHours;
      review_count: number;
      review_avg: number | null;
      owner_email_verified: boolean;
    })[];

    const isPath = (v: unknown): v is string =>
      typeof v === "string" && v.length > 0 && !/^https?:\/\//i.test(v);
    const thumbPaths = [...rows.map((b) => b.hero_image_url), ...rows.map((b) => b.logo_url)].filter(isPath);
    const signedMap = new Map<string, string>();
    if (thumbPaths.length) {
      // See resolveBusinessMedia's comment: signing needs the service-role client, not the
      // RLS-respecting one the rows were fetched with — the anon storage read policy doesn't
      // actually grant non-owner requests access in practice.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed, error: signedError } = await supabaseAdmin.storage
        .from("business-media")
        .createSignedUrls(Array.from(new Set(thumbPaths)), 60 * 60 * 24 * 7);
      if (signedError) throw new Error(signedError.message);
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
      });
    }
    const resolve = (v: string | null | undefined) => (isPath(v) ? (signedMap.get(v) ?? null) : (v ?? null));

    const businesses: BrowseResultBusiness[] = rows.map((b) => ({
      ...b,
      hero_image_url: resolve(b.hero_image_url),
      logo_url: resolve(b.logo_url),
      featured: (b.featured_placements ?? []).some(
        (f) => f.end_date >= today && (f.scope === "all_india" || (!!city && f.city === city)),
      ),
    }));

    return { businesses, total: count ?? businesses.length };
  });

export const getBusinessById = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<BusinessDetail> => {
    const { publicClient } = await import("./supabase-public.server");
    const client = publicClient();
    const { data: business, error } = await client
      .from("businesses")
      .select(BUSINESS_DETAIL_SELECT)
      .eq("id", data.id)
      .eq("is_live", true)
      .order("position", { foreignTable: "items" })
      .order("position", { foreignTable: "services" })
      .maybeSingle();
    if (error) throw new Error(error.message);
    return resolveBusinessMedia(business as unknown as Record<string, unknown> | null);
  });

/** A non-reserved slug shaped like `{slug}.luvlit.in`, or null if this hostname isn't a
 * business subdomain at all (the main domain, localhost, *.vercel.app preview deployments,
 * etc). Pure hostname parsing, no DB lookup — shared by `getSubdomainBusiness` and
 * `isBusinessSubdomainRequest` so "is this a business subdomain" is defined in exactly one place. */
function businessSlugFromHostname(hostname: string): string | null {
  const parts = hostname.split(".");
  if (parts.length !== 3 || parts[1] !== "luvlit" || parts[2] !== "in") return null;
  const slug = parts[0];
  if (!slug || isReservedSlug(slug)) return null;
  return slug;
}

/**
 * True if the current request's host is shaped like a business subdomain, regardless of
 * whether that particular business currently resolves to a live row. Cheap (no DB call) — lets
 * a caller tell "this isn't a business site at all" apart from "this is a business's own
 * subdomain, but that business isn't live/found" before paying for a query, so the two cases
 * can be handled differently (see `loadSubdomainPage`).
 */
export const isBusinessSubdomainRequest = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const hostname = (request?.headers.get("host") ?? "").split(":")[0].toLowerCase();
    return businessSlugFromHostname(hostname) !== null;
  },
);

/**
 * Looks up a business by the request's Host header, for rendering a business's
 * public profile at the root path of its {slug}.luvlit.in subdomain. Returns null
 * for any host that isn't exactly `{slug}.luvlit.in` with a non-reserved slug —
 * including localhost and *.vercel.app preview deployments — so this only ever
 * activates in production on the real domain.
 */
export const getSubdomainBusiness = createServerFn({ method: "GET" }).handler(
  async (): Promise<BusinessDetail> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const hostname = (request?.headers.get("host") ?? "").split(":")[0].toLowerCase();
    const slug = businessSlugFromHostname(hostname);
    if (!slug) return null;

    const { publicClient } = await import("./supabase-public.server");
    const client = publicClient();
    const { data: business, error } = await client
      .from("businesses")
      .select(BUSINESS_DETAIL_SELECT)
      .eq("slug", slug)
      .eq("is_live", true)
      .order("position", { foreignTable: "items" })
      .order("position", { foreignTable: "services" })
      .maybeSingle();
    if (error) throw new Error(error.message);
    return resolveBusinessMedia(business as unknown as Record<string, unknown> | null);
  },
);

export const getInfluencers = createServerFn({ method: "GET" })
  .validator(
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
  .validator((input: { businessId: string }) => input)
  .handler(async ({ data }): Promise<StaffAvailability> => {
    const { publicClient } = await import("./supabase-public.server");
    const client = publicClient();
    const [{ data: staff }, { data: services }] = await Promise.all([
      client.from("staff").select("id,name,specializations").eq("business_id", data.businessId),
      client
        .from("services")
        .select("id,name,duration_minutes,price")
        .eq("business_id", data.businessId)
        .eq("is_active", true)
        .order("position"),
    ]);
    const ids = (staff ?? []).map((s) => s.id);
    if (!ids.length) return { staff: [], services: services ?? [], slots: [] };
    const { data: slots } = await client
      .from("slots")
      .select("id,staff_id,date,start_time,status,capacity,booked_count")
      .in("staff_id", ids)
      .eq("status", "open")
      .gte("date", istDateString())
      .order("date")
      .order("start_time")
      .limit(600);
    return {
      staff: (staff ?? []) as StaffAvailability["staff"],
      services: (services ?? []) as StaffAvailability["services"],
      slots: ((slots ?? []) as StaffAvailability["slots"]).filter(
        (s) => s.booked_count < s.capacity,
      ),
    };
  });

/** Published events, optionally scoped to a city. Used by the homepage + events pages. */
export const getEvents = createServerFn({ method: "GET" })
  .validator((input: { city?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data: filters }): Promise<PublicEvent[]> => {
    const { publicClient } = await import("./supabase-public.server");
    let query = publicClient()
      .from("events")
      .select("id,title,description,category,city,address,start_date,end_date,image_urls,is_featured,latitude,longitude")
      .eq("status", "published")
      .gte("start_date", new Date().toISOString())
      .order("is_featured", { ascending: false })
      .order("start_date", { ascending: true })
      .limit(filters.limit ?? 12);
    if (filters.city) query = query.eq("city", filters.city);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as PublicEvent[];
  });

/**
 * Public organizer profile — name, city, and their upcoming published events.
 * organizer_profiles' only RLS policy is strictly owner-only (no public/anon read
 * exists), which signals contact_email/contact_phone aren't meant to be public — so
 * this deliberately never selects them, same as RLS would prevent if it were exposed.
 */
export const getOrganizerById = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<PublicOrganizer> => {
    const { publicClient } = await import("./supabase-public.server");
    const client = publicClient();
    const { data: organizer, error } = await client
      .from("organizer_profiles")
      .select("id,user_id,name,city")
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!organizer) return null;

    const { data: events, error: eventsError } = await client
      .from("events")
      .select(
        "id,title,description,category,city,address,start_date,end_date,image_urls,is_featured,latitude,longitude",
      )
      .eq("organizer_id", organizer.user_id)
      .eq("status", "published")
      .gte("start_date", new Date().toISOString())
      .order("start_date", { ascending: true });
    if (eventsError) throw new Error(eventsError.message);

    return { id: organizer.id, name: organizer.name, city: organizer.city, events: (events ?? []) as PublicEvent[] };
  });

/** Public influencer application status lookup by the email/phone used to apply. */
export const getInfluencerApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<{ found: boolean; status?: string; submitted_at?: string }> => {
      const { data: rows } = await context.supabase
        .from("influencer_profiles")
        .select("approval_status,submitted_at")
        .eq("user_id", context.userId)
        .order("submitted_at", { ascending: false })
        .limit(1);
      const row = rows?.[0];
      if (!row) return { found: false };
      return { found: true, status: row.approval_status, submitted_at: row.submitted_at };
    },
  );
