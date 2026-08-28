import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { EcoBadge } from "@/components/eco-badge";
import { BookingWidget } from "@/components/booking-widget";
import { GalleryGrid } from "@/components/gallery-grid";
import { Reveal } from "@/components/reveal";
import { isStoragePath, MEDIA_BUCKET, useMediaUrl } from "@/components/media-uploader";

export type ProfileBusiness = {
  id: string;
  name: string;
  description: string | null;
  categories: string[];
  business_types: string[];
  instagram_url: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  gallery_urls: string[];
  main_video_url: string | null;
  short_video_urls: string[];
  brand_accent_color: string | null;
  is_eco_friendly: boolean;
  locations: { id: string; address: string | null; city: string; state: string | null; is_primary: boolean }[];
  delivery_areas: { id: string; city: string | null; is_pan_india: boolean }[];
  items: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    image_url: string | null;
    is_active: boolean;
  }[];
};

function embedUrl(url: string) {
  if (url.includes("youtu")) {
    const id = url.split(/v=|youtu\.be\/|shorts\//)[1]?.split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (url.includes("instagram.com")) return `${url.split("?")[0].replace(/\/$/, "")}/embed`;
  return url;
}

/** Uploaded videos are stored as private object paths and resolved to signed https URLs
 * server-side (or client-side in the draft preview), so anything not http(s) is unresolved. */
function isPlayableVideo(url: string) {
  return /^https?:\/\//i.test(url) && !isStoragePath(url);
}

function VideoPlayer({ url, className }: { url: string; className?: string }) {
  const isEmbed = url.includes("youtu") || url.includes("instagram.com");
  if (isEmbed) {
    return <iframe src={embedUrl(url)} title="Video" className={className} allowFullScreen />;
  }
  return <video src={url} controls playsInline preload="metadata" className={`${className} bg-black`} />;
}

function SectionEyebrow({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <p className="eyebrow" style={{ color: accent }}>
      {children}
    </p>
  );
}

/** Resolves a possibly-unsaved storage path or an already-signed URL to a displayable list. */
function useResolvedList(values: string[]) {
  const key = values.join("|");
  const [urls, setUrls] = useState<string[]>(values.filter((v) => !isStoragePath(v)));
  useEffect(() => {
    let active = true;
    if (!values.length) return setUrls([]);
    Promise.all(
      values.map(async (v) => {
        if (!isStoragePath(v)) return v;
        const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(v, 60 * 60 * 24 * 7);
        if (error) console.error(error.message);
        return data?.signedUrl ?? v;
      }),
    ).then((resolved) => {
      if (active) setUrls(resolved);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

/** The real business profile UI. Shared between the public /business/$id page (signed data
 * from the loader) and the website builder's live preview pane (in-progress draft state). */
export function BusinessProfilePreview({ business }: { business: ProfileBusiness }) {
  // Literal hex (not a --color-primary var()) because this value has hex-alpha suffixes
  // appended below (e.g. `${accent}33`) for the overlay gradients — var() can't take one.
  const accent = business.brand_accent_color || "#4F46E5";
  const heroUrl = useMediaUrl(business.hero_image_url);
  const logoUrl = useMediaUrl(business.logo_url);
  const mainVideoUrl = useMediaUrl(business.main_video_url);
  const shortUrls = useResolvedList(business.short_video_urls ?? []);
  const galleryUrls = useResolvedList(business.gallery_urls ?? []);

  const shorts = shortUrls.filter(isPlayableVideo).slice(0, 3);
  const items = (business.items ?? []).filter((i) => i.is_active);
  const fallbackGallery = items
    .map((i) => ({ ...i, image_url: (i as { image_urls?: string[] }).image_urls?.[0] ?? i.image_url }))
    .filter((i): i is (typeof items)[number] & { image_url: string } => !!i.image_url);
  const galleryItems = galleryUrls.length
    ? galleryUrls.map((url, i) => ({ id: `gallery-${i}`, image_url: url, name: `${business.name} photo ${i + 1}` }))
    : fallbackGallery.map((i) => ({
        id: i.id,
        image_url: i.image_url,
        name: i.name,
        price: i.price,
        description: i.description,
      }));
  const hasMainVideo = !!mainVideoUrl && isPlayableVideo(mainVideoUrl);
  const wash = `${accent}0A`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — brand-owned, image-forward when available */}
      {heroUrl ? (
        <section className="relative flex min-h-[70vh] items-end overflow-hidden md:min-h-[80vh]">
          <img src={heroUrl} alt={business.name} className="absolute inset-0 h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${accent}33 0%, ${accent}66 55%, ${accent}E6 100%)`,
            }}
          />
          <div className="relative mx-auto w-full max-w-5xl px-6 pb-16 pt-40">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${business.name} logo`}
                className="mb-6 h-16 w-16 rounded-md border border-white/40 bg-white/90 object-contain p-1"
              />
            )}
            <h1 className="text-4xl text-white md:text-7xl">{business.name}</h1>
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
            {logoUrl && (
              <img src={logoUrl} alt={`${business.name} logo`} className="h-16 w-16 rounded-md border object-contain p-1" />
            )}
            <h1 className="mt-6 text-4xl md:text-7xl" style={{ color: accent }}>
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
              <VideoPlayer url={mainVideoUrl!} className="h-full w-full" />
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
              <h2 className="mt-3 text-3xl">Gallery</h2>
              <div className="mt-10">
                <GalleryGrid accent={accent} items={galleryItems} />
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
                  <div key={url} className="aspect-[9/16] overflow-hidden rounded-lg border" style={{ borderColor: `${accent}40` }}>
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
