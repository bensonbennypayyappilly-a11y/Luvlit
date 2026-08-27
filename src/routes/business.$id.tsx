import { createFileRoute, Link } from "@tanstack/react-router";
import { getBusinessById } from "@/lib/public.functions";
import { BusinessProfilePreview } from "@/components/business-profile-preview";
import type { BusinessDetail } from "@/lib/public.types";

export const Route = createFileRoute("/business/$id")({
  loader: async ({ params }) => getBusinessById({ data: { id: params.id } }),
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Business unavailable — LuvLit" }, { name: "robots", content: "noindex" }] };
    }
    const url = `https://luvlit.in/business/${params.id}`;
    const desc = (loaderData.description ?? `${loaderData.name} on LuvLit.`).slice(0, 155);
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title: `${loaderData.name} — LuvLit` },
      { name: "description", content: desc },
      { property: "og:title", content: loaderData.name },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
    ];
    if (loaderData.hero_image_url) {
      meta.push({ property: "og:image", content: loaderData.hero_image_url });
      meta.push({ name: "twitter:image", content: loaderData.hero_image_url });
    }
    const locations = (loaderData.locations ?? []) as Array<{
      address?: string | null;
      city?: string | null;
      state?: string | null;
    }>;
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: loaderData.name,
            description: desc,
            url,
            ...(loaderData.hero_image_url ? { image: loaderData.hero_image_url } : {}),
            ...(loaderData.logo_url ? { logo: loaderData.logo_url } : {}),
            ...(loaderData.contact_email ? { email: loaderData.contact_email } : {}),
            ...(loaderData.categories?.length ? { knowsAbout: loaderData.categories } : {}),
            ...(locations.length
              ? {
                  address: locations.map((l) => ({
                    "@type": "PostalAddress",
                    ...(l.address ? { streetAddress: l.address } : {}),
                    ...(l.city ? { addressLocality: l.city } : {}),
                    ...(l.state ? { addressRegion: l.state } : {}),
                    addressCountry: "IN",
                  })),
                }
              : {}),
          }),
        },
      ],
    };
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
  return (
    <BusinessProfilePreview
      business={{
        id: business.id,
        name: business.name,
        description: business.description,
        categories: business.categories ?? [],
        business_types: business.business_types ?? [],
        instagram_url: business.instagram_url,
        whatsapp: business.whatsapp,
        contact_email: business.contact_email,
        hero_image_url: business.hero_image_url,
        logo_url: business.logo_url,
        gallery_urls: business.gallery_urls ?? [],
        main_video_url: business.main_video_url,
        short_video_urls: business.short_video_urls ?? [],
        brand_accent_color: business.brand_accent_color,
        is_eco_friendly: business.is_eco_friendly,
        locations: business.locations ?? [],
        delivery_areas: business.delivery_areas ?? [],
        items: business.items ?? [],
      }}
    />
  );
}
