import { redirect } from "@tanstack/react-router";
import { getSubdomainBusiness } from "./public.functions";
import { toProfileBusiness } from "./business-seo";
import { deriveSitePages, resolveSections, type PageId } from "./website-pages";

/**
 * Shared loader for every business-subdomain page route other than Home (`/`, handled directly
 * in index.tsx). Returns null when the current host isn't a business subdomain, so the route's
 * own marketing content (if any — About/Contact both have one) can render instead. Redirects to
 * the business's Home page when the page isn't one this business actually has, so a URL for a
 * disabled/empty page never renders a dead page instead of erroring — see website-pages.ts.
 */
export async function loadSubdomainPage(pageId: PageId) {
  const business = await getSubdomainBusiness();
  if (!business) return null;
  const profile = toProfileBusiness(business);
  const sections = resolveSections(profile);
  const pages = deriveSitePages({ sections, business_types: profile.business_types, items: profile.items, services: profile.services });
  if (!pages.some((p) => p.id === pageId)) {
    throw redirect({ href: "/" });
  }
  return { business, profile };
}
