import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadSubdomainPage } from "@/lib/website-page-loader";
import { buildBusinessHead } from "@/lib/business-seo";
import { BusinessProductDetailPage } from "@/components/website/site-page";

export const Route = createFileRoute("/products_/$slug")({
  loader: async ({ params }) => {
    const result = await loadSubdomainPage("products");
    if (!result) throw redirect({ href: "/" });
    const item = result.profile.items.find((i) => i.slug === params.slug && i.is_active);
    if (!item) throw redirect({ href: "/products" });
    return { ...result, item };
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildBusinessHead(
          { ...loaderData.business, description: loaderData.item.description ?? loaderData.business.description },
          `https://${loaderData.business.slug}.luvlit.in/products/${loaderData.item.slug}`,
        )
      : {},
  component: () => {
    const { profile, item } = Route.useLoaderData();
    return <BusinessProductDetailPage business={profile} item={item} />;
  },
});
