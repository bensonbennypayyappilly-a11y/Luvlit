import { redirect } from "@tanstack/react-router";
import { getSubdomainBusiness, isBusinessSubdomainRequest } from "./public.functions";
import { toProfileBusiness } from "./business-seo";
import { deriveSitePages, resolveSections, type PageId } from "./website-pages";

/**
 * Shared loader for every business-subdomain page route other than Home (`/`, handled directly
 * in index.tsx, and deliberately not touched here).
 *
 * Returns null ONLY when the current host isn't a business subdomain at all (the main luvlit.in
 * domain, localhost, preview deployments) — that's the one case where a route's own marketing
 * content (About/Contact) is allowed to render.
 *
 * Whenever the host IS a business subdomain — even if that specific business can't be resolved
 * (unpublished, suspended, unknown slug) or doesn't have this particular page — this redirects
 * to that subdomain's own Home instead of ever returning null. That guarantees a business's own
 * subdomain can never fall through to LuvLit's marketing content: the marketing fallback only
 * ever applies to genuinely non-business hosts.
 */
export async function loadSubdomainPage(pageId: PageId) {
  if (!(await isBusinessSubdomainRequest())) return null;

  const business = await getSubdomainBusiness();
  if (!business) throw redirect({ href: "/" });

  const profile = toProfileBusiness(business);
  const sections = resolveSections(profile);
  const pages = deriveSitePages({ sections, business_types: profile.business_types, items: profile.items, services: profile.services });
  if (!pages.some((p) => p.id === pageId)) {
    throw redirect({ href: "/" });
  }
  return { business, profile };
}
