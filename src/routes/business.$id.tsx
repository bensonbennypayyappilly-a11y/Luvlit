import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getBusinessById } from "@/lib/public.functions";
import { BusinessProfilePreview } from "@/components/business-profile-preview";
import { buildBusinessHead, toProfileBusiness } from "@/lib/business-seo";
import type { BusinessDetail } from "@/lib/public.types";

export const Route = createFileRoute("/business/$id")({
  loader: async ({ params }) => {
    const business = await getBusinessById({ data: { id: params.id } });
    // The subdomain is now canonical — once a business has a slug (all of them,
    // post-backfill), permanently redirect old /business/$id links there.
    if (business?.slug) {
      throw redirect({ href: `https://${business.slug}.luvlit.in/`, statusCode: 301 });
    }
    return business;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Business unavailable — LuvLit" }, { name: "robots", content: "noindex" }] };
    }
    return buildBusinessHead(loaderData, `https://luvlit.in/business/${params.id}`);
  },
  errorComponent: () => <Shell>Something went wrong loading this page.</Shell>,
  notFoundComponent: () => <Shell>This business page isn't available.</Shell>,
  component: BusinessProfile,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-muted-foreground">{children}</p>
        <Link to="/browse" className="mt-4 inline-block text-primary underline-offset-4 hover:underline">
          Browse LuvLit
        </Link>
      </div>
    </div>
  );
}

function BusinessProfile() {
  const business = Route.useLoaderData() as BusinessDetail;
  if (!business) return <Shell>This business page isn't available.</Shell>;
  return <BusinessProfilePreview business={toProfileBusiness(business)} />;
}
