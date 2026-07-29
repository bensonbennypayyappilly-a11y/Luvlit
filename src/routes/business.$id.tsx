import { createFileRoute, Link } from "@tanstack/react-router";
import { getBusinessById } from "@/lib/public.functions";
import { EcoBadge } from "@/components/eco-badge";
import { BookingWidget } from "@/components/booking-widget";

export const Route = createFileRoute("/business/$id")({
  loader: async ({ params }) => getBusinessById({ data: { id: params.id } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Business unavailable — LuvLit" }, { name: "robots", content: "noindex" }] };
    }
    const desc = (loaderData.description ?? `${loaderData.name} on LuvLit.`).slice(0, 155);
    return {
      meta: [
        { title: `${loaderData.name} — LuvLit` },
        { name: "description", content: desc },
        { property: "og:title", content: loaderData.name },
        { property: "og:description", content: desc },
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

function embedUrl(url: string) {
  if (url.includes("youtu")) {
    const id = url.split(/v=|youtu\.be\/|shorts\//)[1]?.split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (url.includes("instagram.com")) return `${url.split("?")[0].replace(/\/$/, "")}/embed`;
  return url;
}

function BusinessProfile() {
  const business = Route.useLoaderData();
  if (!business) return <Shell>This business page isn't available.</Shell>;

  const accent = business.brand_accent_color || "#173D2E";
  const shorts = (business.short_video_urls ?? []).slice(0, 3);
  const items = (business.items ?? []).filter((i) => i.is_active);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — brand-owned, marketplace stays out of the way */}
      <section
        className="px-6 pb-24 pt-16"
        style={{ background: `linear-gradient(180deg, ${accent}14, transparent)` }}
      >
        <div className="mx-auto max-w-5xl">
          <Link to="/" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Part of LuvLit
          </Link>
          <h1 className="mt-12 text-5xl md:text-7xl" style={{ color: accent }}>
            {business.name}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {(business.categories ?? []).map((c) => (
              <span
                key={c}
                className="rounded-full border px-3 py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                {c}
              </span>
            ))}
            {business.is_eco_friendly && <EcoBadge />}
          </div>
          {business.description && (
            <p className="mt-8 max-w-2xl text-lg text-muted-foreground">{business.description}</p>
          )}
          {business.main_video_url && (
            <div className="mt-14 aspect-video w-full overflow-hidden rounded-lg border border-border">
              <iframe
                src={embedUrl(business.main_video_url)}
                title={`${business.name} feature video`}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-24 px-6 pb-32">
        {(business.locations ?? []).length > 0 && (
          <section>
            <p className="eyebrow">Where to find us</p>
            <h2 className="mt-3 text-3xl">Locations</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(business.locations ?? []).map((l) => (
                <div key={l.id} className="surface-card p-6">
                  <p className="text-lg">{l.city}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {l.address}
                    {l.state ? `, ${l.state}` : ""}
                  </p>
                  {l.is_primary && <p className="eyebrow mt-3">Main branch</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {(business.delivery_areas ?? []).length > 0 && (
          <section>
            <p className="eyebrow">Delivery</p>
            <h2 className="mt-3 text-3xl">We serve</h2>
            <p className="mt-6 text-muted-foreground">
              {(business.delivery_areas ?? []).some((d) => d.is_pan_india)
                ? "All of India"
                : (business.delivery_areas ?? []).map((d) => d.city).join(" · ")}
            </p>
          </section>
        )}

        {items.length > 0 && (
          <section>
            <p className="eyebrow">Our work</p>
            <h2 className="mt-3 text-3xl">Catalog</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {items.map((item) => (
                <article key={item.id}>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
                    />
                  )}
                  <h3 className="mt-4 text-xl">{item.name}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.price != null && <p className="mt-2 text-sm">₹{item.price}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {shorts.length > 0 && (
          <section>
            <p className="eyebrow">In motion</p>
            <h2 className="mt-3 text-3xl">Short videos</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {shorts.map((url) => (
                <div
                  key={url}
                  className="aspect-[9/16] overflow-hidden rounded-lg border border-border"
                >
                  <iframe src={embedUrl(url)} title="Short video" className="h-full w-full" />
                </div>
              ))}
            </div>
          </section>
        )}

        {(business.business_types ?? []).includes("appointment") && (
          <section>
            <p className="eyebrow">Appointments</p>
            <h2 className="mt-3 text-3xl">Book a time</h2>
            <BookingWidget businessId={business.id} accent={accent} />
          </section>
        )}

        <section className="surface-card p-12">
          <p className="eyebrow">Get in touch</p>
          <h2 className="mt-3 text-3xl">Talk to {business.name}</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                className="rounded-md px-7 py-3.5 text-sm font-medium text-primary-foreground"
                style={{ backgroundColor: accent }}
              >
                WhatsApp
              </a>
            )}
            {business.contact_email && (
              <a
                href={`mailto:${business.contact_email}`}
                className="rounded-md border border-accent px-7 py-3.5 text-sm font-medium text-accent-foreground hover:bg-accent-soft"
              >
                Email us
              </a>
            )}
            {business.instagram_url && (
              <a
                href={business.instagram_url}
                className="rounded-md border border-border px-7 py-3.5 text-sm font-medium hover:border-accent"
              >
                Instagram
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-10 text-center">
        <Link to="/" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Hosted on LuvLit
        </Link>
      </footer>
    </div>
  );
}
