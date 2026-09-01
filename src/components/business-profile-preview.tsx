import { BusinessSitePage } from "@/components/website/site-page";
import type { SiteBusiness } from "@/lib/website-site-types";

export type ProfileBusiness = SiteBusiness;

/** A business's public "Home" page. Kept as its own named export because index.tsx (frozen) and
 * the legacy /business/$id fallback both import it by this exact name — the rendering itself is
 * BusinessSitePage, shared with every other page and with the builder's live preview. */
export function BusinessProfilePreview({ business }: { business: ProfileBusiness }) {
  return <BusinessSitePage business={business} page="home" />;
}
