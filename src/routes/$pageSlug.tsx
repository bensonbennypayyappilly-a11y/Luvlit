import { createFileRoute, notFound } from "@tanstack/react-router";
import { getSubdomainBusiness, isBusinessSubdomainRequest } from "@/lib/public.functions";
import { buildBusinessHead, toProfileBusiness } from "@/lib/business-seo";
import { BusinessCustomPage } from "@/components/website/site-page";

/**
 * A business owner's own custom pages (Pages panel → Add a page) — one catch-all route rather
 * than a file per page, since pages are created at runtime. Only ever activates on a real
 * business subdomain with a real, visible custom page at this slug; every other case falls
 * through to the app's normal not-found handling, exactly as an unmatched path did before this
 * route existed (this must never become a general-purpose catch-all for the main marketing
 * domain — see the isBusinessSubdomainRequest guard below).
 */
export const Route = createFileRoute("/$pageSlug")({
  loader: async ({ params }) => {
    if (!(await isBusinessSubdomainRequest())) throw notFound();
    const business = await getSubdomainBusiness();
    if (!business) throw notFound();
    const profile = toProfileBusiness(business);
    const page = profile.pages.find((p) => p.type === "custom" && p.slug === params.pageSlug && p.visible);
    if (!page) throw notFound();
    return { business, profile, page };
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildBusinessHead(
          { ...loaderData.business, description: loaderData.page.content?.body ?? loaderData.business.description },
          `https://${loaderData.business.slug}.luvlit.in/${loaderData.page.slug}`,
        )
      : {},
  component: () => {
    const { profile, page } = Route.useLoaderData();
    return <BusinessCustomPage business={profile} page={page} />;
  },
});
