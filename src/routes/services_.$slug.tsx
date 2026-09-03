import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadSubdomainPage } from "@/lib/website-page-loader";
import { buildBusinessHead } from "@/lib/business-seo";
import { BusinessServiceDetailPage } from "@/components/website/site-page";

export const Route = createFileRoute("/services_/$slug")({
  loader: async ({ params }) => {
    const result = await loadSubdomainPage("services");
    if (!result) throw redirect({ href: "/" });
    const service = result.profile.services.find((s) => s.slug === params.slug && s.is_active);
    if (!service) throw redirect({ href: "/services" });
    return { ...result, service };
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildBusinessHead(
          { ...loaderData.business, description: loaderData.service.description ?? loaderData.business.description },
          `https://${loaderData.business.slug}.luvlit.in/services/${loaderData.service.slug}`,
        )
      : {},
  component: () => {
    const { profile, service } = Route.useLoaderData();
    return <BusinessServiceDetailPage business={profile} service={service} />;
  },
});
