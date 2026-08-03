import { createFileRoute, Link } from "@tanstack/react-router";
import { getBusinessById } from "@/lib/public.functions";
import { EcoBadge } from "@/components/eco-badge";
import { BookingWidget } from "@/components/booking-widget";
import { GalleryGrid } from "@/components/gallery-grid";
import { Reveal } from "@/components/reveal";
import { isStoragePath } from "@/components/media-uploader";
import type { BusinessDetail } from "@/lib/public.types";

export const Route = createFileRoute("/business/$id")({
  loader: async ({ params }) => getBusinessById({ data: { id: params.id } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Business unavailable — LuvLit" }, { name: "robots", content: "noindex" }] };
    }
    const desc = (loaderData.description ?? `${loaderData.name} on LuvLit.`).slice(0, 155);
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title: `${loaderData.name} — LuvLit` },
      { name: "description", content: desc },
      { property: "og:title", content: loaderData.name },
      { property: "og:description", content: desc },
    ];
    if (loaderData.hero_image_url) meta.push({ property: "og:image", content: loaderData.hero_image_url });
    return { meta };
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

/** Uploaded videos are stored as private object paths and resolved to signed https URLs
 * server-side, so anything not http(s) is treated as an unresolved legacy value. */
function isPlayableVideo(url: string) {
  return /^https?:\/\//i.test(url) && !isStoragePath(url);
}

function VideoPlayer({ url, className }: { url: string; className?: string }) {
  const isEmbed = url.includes("youtu") || url.includes("instagram.com");
  if (isEmbed) {
    return <iframe src={embedUrl(url)} title="Video" className={className} allowFullScreen />;
  }
  return (
    <video src={url} controls playsInline preload="metadata" className={`${className} bg-black`} />
  );
}

function SectionEyebrow({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <p className="eyebrow" style={{ color: accent }}>
      {children}
    </p>
  );
}

function BusinessProfile() {
  const business = Route.useLoaderData() as BusinessDetail;
  if (!business) return <Shell>This business page isn't available.</Shell>;

  const accent = business.brand_accent_color || "#173D2E";
  const shorts = (business.short_video_urls ?? []).filter(isPlayableVideo).slice(0, 3);
  const items = (business.items ?? []).filter((i) => i.is_active);
  const galleryItems = items.filter((i): i is typeof items[number] & { image_url: string } => !!i.image_url);
  const hasMainVideo = !!business.main_video_url && isPlayableVideo(business.main_video_url);
  const wash = `${accent}0A`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — brand-owned, image-forward when available */}
      {business.hero_image_url ? (
        <section className="relative flex min-h-[70vh] items-end overflow-hidden md:min-h-[80vh]">
          <img
            src={business.hero_image_url}
            alt={business.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${accent}33 0%, ${accent}66 55%, ${accent}E6 100%)`,
            }}
          />
          <div className="relative mx-auto w-full max-w-5xl px-6 pb-16 pt-40">
            <h1 className="text-5xl text-white md:text-7xl">{business.name}</h1>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {(business.categories ?? []).map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-white/40 px-3 py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-white/90"
                >
                  {c}
                </span>
              ))}
              {business.is_eco_friendly && <EcoBadge />}
            </div>
            {business.description && (
              <p className="mt-8 max-w-2xl text-lg text-white/90">{business.description}</p>
            )}
          </div>
        </section>
      ) : (
        <section
          className="px-6 pb-24 pt-16"
          style={{ background: `linear-gradient(180deg, ${accent}14, transparent)` }}
        >
          <div className="mx-auto max-w-5xl">
            <h1 className="mt-6 text-5xl md:text-7xl" style={{ color: accent }}>
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
          </div>
        </section>
      )}

      {hasMainVideo && (
        <Reveal>
          <div className="mx-auto -mt-10 max-w-5xl px-6">
            <div
              className="aspect-video w-full overflow-hidden rounded-lg border shadow-xl"
              style={{ borderColor: `${accent}55` }}
            >
              <VideoPlayer url={business.main_video_url!} className="h-full w-full" />
            </div>
          </div>
        </Reveal>
      )}

      <main className="mx-auto max-w-5xl space-y-24 px-6 pb-32 pt-20">
        {(business.locations ?? []).length > 0 && (
          <Reveal>
            <section>
              <SectionEyebrow accent={accent}>Where to find us</SectionEyebrow>
              <h2 className="mt-3 text-3xl">Locations</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {(business.locations ?? []).map((l) => (
                  <div key={l.id} className="surface-card p-6">
                    <p className="text-lg">{l.city}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {l.address}
                      {l.state ? `, ${l.state}` : ""}
                    </p>
                    {l.is_primary && (
                      <p className="eyebrow mt-3" style={{ color: accent }}>
                        Main branch
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {(business.delivery_areas ?? []).length > 0 && (
          <Reveal>
            <section className="rounded-lg p-8" style={{ backgroundColor: wash }}>
              <SectionEyebrow accent={accent}>Delivery</SectionEyebrow>
              <h2 className="mt-3 text-3xl">We serve</h2>
              <p className="mt-6 text-muted-foreground">
                {(business.delivery_areas ?? []).some((d) => d.is_pan_india)
                  ? "All of India"
                  : (business.delivery_areas ?? []).map((d) => d.city).join(" · ")}
              </p>
            </section>
          </Reveal>
        )}

        {galleryItems.length > 0 && (
          <Reveal>
            <section>
              <SectionEyebrow accent={accent}>Our work</SectionEyebrow>
              <h2 className="mt-3 text-3xl">Catalog</h2>
              <div className="mt-10">
                <GalleryGrid
                  accent={accent}
                  items={galleryItems.map((i) => ({
                    id: i.id,
                    image_url: i.image_url,
                    name: i.name,
                    price: i.price,
                    description: i.description,
                  }))}
                />
              </div>
            </section>
          </Reveal>
        )}

        {shorts.length > 0 && (
          <Reveal>
            <section className="rounded-lg p-8" style={{ backgroundColor: wash }}>
              <SectionEyebrow accent={accent}>In motion</SectionEyebrow>
              <h2 className="mt-3 text-3xl">Short videos</h2>
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {shorts.map((url) => (
                  <div
                    key={url}
                    className="aspect-[9/16] overflow-hidden rounded-lg border"
                    style={{ borderColor: `${accent}40` }}
                  >
                    <VideoPlayer url={url} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {(business.business_types ?? []).includes("appointment") && (
          <Reveal>
            <section>
              <SectionEyebrow accent={accent}>Appointments</SectionEyebrow>
              <h2 className="mt-3 text-3xl">Book a time</h2>
              <BookingWidget businessId={business.id} accent={accent} />
            </section>
          </Reveal>
        )}

        <Reveal>
          <section className="surface-card border p-12" style={{ borderColor: `${accent}40` }}>
            <SectionEyebrow accent={accent}>Get in touch</SectionEyebrow>
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
                  className="rounded-md border px-7 py-3.5 text-sm font-medium hover:bg-accent-soft"
                  style={{ borderColor: accent, color: accent }}
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
        </Reveal>
      </main>

      <footer className="border-t border-border px-6 py-10 text-center">
        <Link to="/" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Hosted on LuvLit
        </Link>
      </footer>
    </div>
  );
}
