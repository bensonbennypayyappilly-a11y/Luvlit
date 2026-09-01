import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadSubdomainPage } from "@/lib/website-page-loader";
import { buildBusinessHead } from "@/lib/business-seo";
import { BusinessSitePage } from "@/components/website/site-page";

export const Route = createFileRoute("/products")({
  loader: async () => {
    const result = await loadSubdomainPage("products");
    if (!result) throw redirect({ href: "/" });
    return result;
  },
  head: ({ loaderData }) =>
    loaderData ? buildBusinessHead(loaderData.business, `https://${loaderData.business.slug}.luvlit.in/products`) : {},
  component: () => <BusinessSitePage business={Route.useLoaderData().profile} page="products" />,
});
